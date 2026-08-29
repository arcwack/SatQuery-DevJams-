"""GIS processing engine for local Sentinel GeoTIFF rasters."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import rasterio
import rasterio.mask
from pyproj import Transformer
from shapely import Geometry
from shapely.geometry import mapping, shape
from shapely.ops import transform

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

RED_BAND = 1
NIR_BAND = 2
GREEN_BAND = 3
VEG_NDVI_THRESHOLD = 0.3
WATER_NDWI_THRESHOLD = 0.0
DEFAULT_SRC_CRS = "EPSG:4326"

GeoJSONGeometry = dict[str, Any]


class GeometryError(ValueError):
    """Raised when the geometry is not valid GeoJSON."""


def _raster_path(year: int) -> Path:
    """Resolve the raster path for a year or raise FileNotFoundError."""
    path = DATA_DIR / f"sentinel_{year}.tif"
    if not path.is_file():
        raise FileNotFoundError(f"Raster image not found for year {year}: {path}")
    return path


def _geometry_crs(geometry: GeoJSONGeometry) -> str:
    """Extract the geometry CRS, defaulting to EPSG:4326 (GeoJSON)."""
    crs = geometry.get("crs")
    if isinstance(crs, str):
        return crs if crs.upper().startswith("EPSG:") else f"EPSG:{crs}"
    if isinstance(crs, dict):
        name = (crs.get("properties") or {}).get("name")
        if name:
            name = name.replace("urn:ogc:def:crs:EPSG::", "EPSG:")
            return DEFAULT_SRC_CRS if name == "urn:ogc:def:crs:OGC:1.3:CRS84" else name
    return DEFAULT_SRC_CRS


def _parse_geometry(geometry: GeoJSONGeometry) -> Geometry:
    """Validate and convert a GeoJSON polygon (or feature) to a shapely geometry."""
    geo = geometry.get("geometry") if geometry.get("type") == "Feature" else geometry
    if not isinstance(geo, dict) or geo.get("type") not in {"Polygon", "MultiPolygon"}:
        raise GeometryError("geometry must be a GeoJSON Polygon or MultiPolygon.")
    try:
        return shape(geo)
    except Exception as exc:  # noqa: BLE001
        raise GeometryError(f"Invalid GeoJSON geometry: {exc}") from exc


def _to_raster_crs(geometry: GeoJSONGeometry, dst_crs: str) -> dict[str, Any]:
    """Reproject a parsed GeoJSON geometry into the raster CRS."""
    geom = _parse_geometry(geometry)
    src_crs = _geometry_crs(geometry)
    if src_crs.upper() != dst_crs.upper():
        transformer = Transformer.from_crs(src_crs, dst_crs, always_xy=True)
        geom = transform(transformer.transform, geom)
    return mapping(geom)


def _safe_divide(numerator: np.ndarray, denominator: np.ndarray) -> np.ndarray:
    """Divide arrays, NaN-filling zero denominators and non-finite results."""
    with np.errstate(divide="ignore", invalid="ignore"):
        result = np.divide(
            numerator,
            denominator,
            out=np.full_like(numerator, np.nan, dtype=np.float32),
            where=denominator != 0,
        )
    result[~np.isfinite(result)] = np.nan
    return result


def _percent(count: int, total: int) -> float:
    """Return count as a 1-decimal percentage of total (0 if total is empty)."""
    return 0.0 if total == 0 else round(count / total * 100, 1)


def process_raster(geometry: GeoJSONGeometry, year: int) -> dict[str, Any]:
    """Return vegetation/water cover percentages within a polygon for a year."""
    path = _raster_path(year)
    try:
        with rasterio.open(path) as src:
            shapes = [_to_raster_crs(geometry, src.crs.to_string())]
            cropped = rasterio.mask.mask(src, shapes, crop=True, all_touched=True)[0]
    except rasterio.errors.RasterioIOError as exc:
        raise FileNotFoundError(f"Unable to read raster for year {year}: {exc}") from exc

    red = np.ma.filled(cropped[RED_BAND - 1].astype(np.float32), np.nan)
    nir = np.ma.filled(cropped[NIR_BAND - 1].astype(np.float32), np.nan)
    green = np.ma.filled(cropped[GREEN_BAND - 1].astype(np.float32), np.nan)

    ndvi = _safe_divide(nir - red, nir + red)
    ndwi = _safe_divide(green - nir, green + nir)
    valid = np.isfinite(ndvi)
    valid_pixels = int(np.count_nonzero(valid))

    veg_count = int(np.count_nonzero(valid & (ndvi > VEG_NDVI_THRESHOLD)))
    water_count = int(np.count_nonzero(valid & (ndwi > WATER_NDWI_THRESHOLD)))
    return {
        "veg_pct": _percent(veg_count, valid_pixels),
        "water_pct": _percent(water_count, valid_pixels),
        "valid_pixels": valid_pixels,
    }


def _process_year(
    geometry: GeoJSONGeometry, year: int, label: str
) -> dict[str, Any]:
    """Run process_raster, annotating the year on FileNotFoundError."""
    try:
        return process_raster(geometry, year)
    except FileNotFoundError as exc:
        raise FileNotFoundError(
            f"Raster data unavailable for {label} year {year}: {exc}"
        ) from exc


def compute_temporal_change(
    geometry: GeoJSONGeometry, start_year: int, end_year: int
) -> dict[str, Any]:
    """Compare vegetation/water cover between two raster years."""
    start = _process_year(geometry, start_year, "start")
    end = _process_year(geometry, end_year, "end")
    return {
        "start_year": start_year,
        "end_year": end_year,
        "vegetation": {
            "start_pct": start["veg_pct"],
            "end_pct": end["veg_pct"],
            "net_change_pct": round(end["veg_pct"] - start["veg_pct"], 1),
        },
        "water": {
            "start_pct": start["water_pct"],
            "end_pct": end["water_pct"],
            "net_change_pct": round(end["water_pct"] - start["water_pct"], 1),
        },
    }