"""GIS processing engine for local Sentinel GeoTIFF rasters."""

from __future__ import annotations

import io
import re
from pathlib import Path
from typing import Any

import numpy as np
import rasterio
import rasterio.features
import rasterio.mask
from PIL import Image
from pyproj import Transformer
from shapely import Geometry
from shapely.geometry import box, mapping, shape
from shapely.ops import transform

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

RED_BAND = 1
NIR_BAND = 2
GREEN_BAND = 3
VEG_NDVI_THRESHOLD = 0.3
WATER_NDWI_THRESHOLD = 0.0
DEFAULT_SRC_CRS = "EPSG:4326"

CLASS_WATER = 1
CLASS_VEGETATION = 2
CLASS_BUILT_UP = 3

CLASS_COLORS = {
    CLASS_WATER: (30, 90, 220),
    CLASS_VEGETATION: (34, 197, 94),
    CLASS_BUILT_UP: (220, 60, 60),
}

GeoJSONGeometry = dict[str, Any]


class GeometryError(ValueError):
    """Raised when the geometry is not valid GeoJSON."""


def _raster_path(year: int) -> Path:
    """Resolve the raster path for a year or raise FileNotFoundError."""
    path = DATA_DIR / f"sentinel_{year}.tif"
    if not path.is_file():
        raise FileNotFoundError(f"Raster image not found for year {year}: {path}")
    return path


def list_rasters() -> list[dict[str, Any]]:
    """Return available raster years and their extents, sorted by year."""
    years: list[int] = []
    for path in DATA_DIR.glob("sentinel_*.tif"):
        match = re.search(r"sentinel_(\d{4})\.tif$", path.name)
        if match:
            years.append(int(match.group(1)))
    years.sort()

    rasters: list[dict[str, Any]] = []
    for year in years:
        with rasterio.open(_raster_path(year)) as src:
            left, bottom, right, top = src.bounds
            rasters.append(
                {
                    "year": year,
                    "crs": src.crs.to_string(),
                    "bounds": {"west": left, "south": bottom, "east": right, "north": top},
                }
            )
    return rasters


def _stretch_band(band: np.ndarray) -> np.ndarray:
    """Min-max stretch a band to 0-255, returning a uint8 array."""
    finite = band[np.isfinite(band)]
    if finite.size == 0:
        return np.zeros_like(band, dtype=np.uint8)
    low, high = float(finite.min()), float(finite.max())
    if high == low:
        scaled = np.zeros_like(band, dtype=np.float32)
    else:
        scaled = (band - low) / (high - low)
    return np.clip(scaled * 255, 0, 255).astype(np.uint8)


def _read_bands(year: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return full-extent (red, nir, green) float32 arrays for a year."""
    with rasterio.open(_raster_path(year)) as src:
        arr = src.read()
    return (
        arr[RED_BAND - 1].astype(np.float32),
        arr[NIR_BAND - 1].astype(np.float32),
        arr[GREEN_BAND - 1].astype(np.float32),
    )


def render_true_color(year: int) -> bytes:
    """Render a raster year as a natural-color PNG, returning encoded bytes."""
    red, nir, green = _read_bands(year)
    blue = (red + green) / 2.0
    rgb = np.dstack(
        [_stretch_band(red), _stretch_band(green), _stretch_band(blue)]
    )
    image = Image.fromarray(rgb, mode="RGB")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _classify(
    red: np.ndarray, nir: np.ndarray, green: np.ndarray
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Return (valid, water, vegetation, built_up) masks from band arrays."""
    ndvi = _safe_divide(nir - red, nir + red)
    ndwi = _safe_divide(green - nir, green + nir)
    valid = np.isfinite(ndvi)
    water = valid & (ndwi > WATER_NDWI_THRESHOLD)
    vegetation = valid & (ndvi > VEG_NDVI_THRESHOLD) & ~water
    built_up = valid & ~water & ~vegetation
    return valid, water, vegetation, built_up


def class_mask(year: int) -> np.ndarray:
    """Return a uint8 class mask for the full raster extent."""
    red, nir, green = _read_bands(year)
    _, water, vegetation, built_up = _classify(red, nir, green)
    mask = np.zeros(red.shape, dtype=np.uint8)
    mask[water] = CLASS_WATER
    mask[vegetation] = CLASS_VEGETATION
    mask[built_up] = CLASS_BUILT_UP
    return mask


def render_classification(year: int, opacity: float = 0.6) -> bytes:
    """Render the class mask as a semi-transparent RGBA PNG, returning bytes."""
    mask = class_mask(year)
    rgba = np.zeros((*mask.shape, 4), dtype=np.uint8)
    for code, color in CLASS_COLORS.items():
        rgba[mask == code] = (*color, 255)
    rgba[..., 3] = (rgba[..., 3] * opacity).astype(np.uint8)
    image = Image.fromarray(rgba, mode="RGBA")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _raster_transform(year: int):
    """Return the affine transform for a raster year."""
    with rasterio.open(_raster_path(year)) as src:
        return src.transform


def _dilate(mask: np.ndarray, radius: int) -> np.ndarray:
    """Dilate a boolean mask by a square footprint of the given radius."""
    if radius <= 0:
        return mask
    out = mask.copy()
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            out |= np.roll(np.roll(mask, dy, axis=0), dx, axis=1)
    return out


def mask_to_geojson(mask: np.ndarray, year: int, class_name: str) -> dict[str, Any]:
    """Vectorize a boolean mask into a GeoJSON FeatureCollection."""
    transform = _raster_transform(year)
    features = []
    for geom, value in rasterio.features.shapes(mask.astype(np.uint8), transform=transform):
        if value:
            features.append(
                {"type": "Feature", "properties": {"class": class_name}, "geometry": geom}
            )
    return {"type": "FeatureCollection", "features": features}


def class_geometry_mask(
    year: int, geometry: GeoJSONGeometry, class_code: int
) -> np.ndarray:
    """Return a boolean mask of a class within the geometry for a year."""
    with rasterio.open(_raster_path(year)) as src:
        window_geom = _to_raster_crs(geometry, src.crs.to_string())
        inside = rasterio.features.geometry_mask(
            [window_geom], out_shape=(src.height, src.width), transform=src.transform, invert=True
        )
    return (class_mask(year) == class_code) & inside


def near_water_built_up_mask(
    start_year: int, end_year: int, buffer_pixels: int = 2
) -> np.ndarray:
    """Return a boolean mask of new built-up pixels near end-year water."""
    start_mask = class_mask(start_year)
    end_mask = class_mask(end_year)
    near_water = _dilate(end_mask == CLASS_WATER, buffer_pixels)
    new_built = (start_mask != CLASS_BUILT_UP) & (end_mask == CLASS_BUILT_UP)
    return near_water & new_built


def detect_anomalies(start_year: int, end_year: int, grid: int = 5, top_n: int = 3) -> list[dict[str, Any]]:
    """Scan a grid of cells and return the largest land-cover changes."""
    start_mask = class_mask(start_year)
    end_mask = class_mask(end_year)
    height, width = start_mask.shape
    cell_h, cell_w = height // grid, width // grid
    transform = _raster_transform(end_year)

    candidates = []
    for i in range(grid):
        for j in range(grid):
            rows = slice(i * cell_h, (i + 1) * cell_h)
            cols = slice(j * cell_w, (j + 1) * cell_w)
            s, e = start_mask[rows, cols], end_mask[rows, cols]
            total = s.size
            delta_built = int(np.count_nonzero(e == CLASS_BUILT_UP)) - int(
                np.count_nonzero(s == CLASS_BUILT_UP)
            )
            delta_veg = int(np.count_nonzero(e == CLASS_VEGETATION)) - int(
                np.count_nonzero(s == CLASS_VEGETATION)
            )
            magnitude = max(abs(delta_built), abs(delta_veg))
            if magnitude == 0:
                continue
            lon, lat = transform * (j * cell_w + cell_w / 2, i * cell_h + cell_h / 2)
            candidates.append(
                {
                    "lon": float(lon),
                    "lat": float(lat),
                    "delta_built_pct": round(delta_built / total * 100, 1),
                    "delta_veg_pct": round(delta_veg / total * 100, 1),
                    "magnitude": magnitude,
                }
            )
    candidates.sort(key=lambda c: c["magnitude"], reverse=True)
    return candidates[:top_n]


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
            window_geom = _to_raster_crs(geometry, src.crs.to_string())
            if not shape(window_geom).intersects(box(*src.bounds)):
                raise GeometryError(
                    f"The selected area does not overlap the satellite imagery "
                    f"for year {year}. Draw a polygon inside the coverage area."
                )
            cropped = rasterio.mask.mask(src, [window_geom], crop=True, all_touched=True)[0]
    except rasterio.errors.RasterioIOError as exc:
        raise FileNotFoundError(f"Unable to read raster for year {year}: {exc}") from exc

    red = np.ma.filled(cropped[RED_BAND - 1].astype(np.float32), np.nan)
    nir = np.ma.filled(cropped[NIR_BAND - 1].astype(np.float32), np.nan)
    green = np.ma.filled(cropped[GREEN_BAND - 1].astype(np.float32), np.nan)

    valid, water, vegetation, built_up = _classify(red, nir, green)
    valid_pixels = int(np.count_nonzero(valid))
    return {
        "veg_pct": _percent(int(np.count_nonzero(vegetation)), valid_pixels),
        "water_pct": _percent(int(np.count_nonzero(water)), valid_pixels),
        "built_up_pct": _percent(int(np.count_nonzero(built_up)), valid_pixels),
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
        "built_up": {
            "start_pct": start["built_up_pct"],
            "end_pct": end["built_up_pct"],
            "net_change_pct": round(end["built_up_pct"] - start["built_up_pct"], 1),
        },
    }