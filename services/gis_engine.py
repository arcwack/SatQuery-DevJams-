"""GIS processing engine for local Sentinel GeoTIFF rasters.

Loads Sentinel-2 style rasters stored under ``./data`` as
``sentinel_{year}.tif`` and derives vegetation/water cover statistics for a
GeoJSON polygon using the normalized NDVI and NDWI indices.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import rasterio
import rasterio.mask
from pyproj import Transformer
from shapely.geometry import mapping, shape
from shapely.ops import transform as shapely_transform

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

RED_BAND = 1
NIR_BAND = 2
GREEN_BAND = 3

VEG_NDVI_THRESHOLD = 0.3
WATER_NDWI_THRESHOLD = 0.0

DEFAULT_SRC_CRS = "EPSG:4326"


def _raster_path(year: int) -> Path:
    path = DATA_DIR / f"sentinel_{year}.tif"
    if not path.is_file():
        raise FileNotFoundError(f"Raster image not found for year {year}: {path}")
    return path


def _geometry_crs(geometry: dict[str, Any]) -> str:
    crs = geometry.get("crs")
    if isinstance(crs, str):
        return crs if crs.upper().startswith("EPSG:") else f"EPSG:{crs}"
    if isinstance(crs, dict):
        name = (crs.get("properties") or {}).get("name")
        if name:
            normalized = name.replace("urn:ogc:def:crs:EPSG::", "EPSG:")
            if normalized == "urn:ogc:def:crs:OGC:1.3:CRS84":
                return DEFAULT_SRC_CRS
            return normalized
    return DEFAULT_SRC_CRS


def _to_raster_crs(geometry: dict[str, Any], dst_crs: str) -> dict[str, Any]:
    """Reproject a GeoJSON geometry into the raster's CRS if needed."""
    src_crs = _geometry_crs(geometry)
    geom = shape(geometry.get("geometry", geometry))
    if src_crs.upper() != dst_crs.upper():
        transformer = Transformer.from_crs(src_crs, dst_crs, always_xy=True)
        geom = shapely_transform(transformer.transform, geom)
    return mapping(geom)


def _safe_divide(numerator: np.ndarray, denominator: np.ndarray) -> np.ndarray:
    """Element-wise division with NaN-filled zero denominators."""
    with np.errstate(divide="ignore", invalid="ignore"):
        result = np.divide(
            numerator,
            denominator,
            out=np.full_like(numerator, np.nan, dtype=np.float32),
            where=denominator != 0,
        )
    result[~np.isfinite(result)] = np.nan
    return result


def _to_percent(count: int, total: int) -> float:
    if total == 0:
        return 0.0
    return round(count / total * 100, 1)


def process_raster(geometry: dict[str, Any], year: int) -> dict[str, Any]:
    """Compute vegetation/water cover percentages for a polygon in a raster year."""
    path = _raster_path(year)
    try:
        with rasterio.open(path) as src:
            window_geom = _to_raster_crs(geometry, src.crs.to_string())
            cropped = rasterio.mask.mask(
                src, [window_geom], crop=True, all_touched=True
            )[0]
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
        "veg_pct": _to_percent(veg_count, valid_pixels),
        "water_pct": _to_percent(water_count, valid_pixels),
        "valid_pixels": valid_pixels,
    }


def _process_for_year(
    geometry: dict[str, Any], year: int, label: str
) -> dict[str, Any]:
    try:
        return process_raster(geometry, year)
    except FileNotFoundError as exc:
        raise FileNotFoundError(
            f"Raster data unavailable for {label} year {year}: {exc}"
        ) from exc


def compute_temporal_change(
    geometry: dict[str, Any], start_year: int, end_year: int
) -> dict[str, Any]:
    """Compare vegetation/water cover between two raster years."""
    start = _process_for_year(geometry, start_year, "start")
    end = _process_for_year(geometry, end_year, "end")

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