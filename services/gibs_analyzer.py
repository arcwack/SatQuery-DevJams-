"""Region land-cover analysis from NASA GIBS true-color imagery.

Fetches Web-Mercator true-color tiles covering a drawn polygon for two
dates, classifies pixels into water / vegetation / built-up using RGB
heuristics (no NIR band in true color, so this is approximate), and
compares the two dates to flag significant recent change.
"""

from __future__ import annotations

import io
import math
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from typing import Any

import httpx
import numpy as np
from affine import Affine
from PIL import Image
from rasterio.features import geometry_mask
from shapely.geometry import shape

from services import gis_engine

GIBS_BASE = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best"
LAYER = "VIIRS_SNPP_CorrectedReflectance_TrueColor"
TILE_MATRIX = "GoogleMapsCompatible_Level9"
TILE_SIZE = 256
MAX_ZOOM = 9
MAX_TILES = 40

SIGNIFICANT_CHANGE_PCT = 5.0

_client = httpx.Client(timeout=20, follow_redirects=True)


def _tile_url(x: int, y: int, z: int, date_str: str) -> str:
    return f"{GIBS_BASE}/{LAYER}/default/{date_str}/{TILE_MATRIX}/{z}/{y}/{x}.jpg"


def _lon_to_tile_x(lon: float, z: int) -> float:
    return (lon + 180.0) / 360.0 * (2 ** z)


def _lat_to_tile_y(lat: float, z: int) -> float:
    lat_rad = math.radians(lat)
    return (1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi) / 2.0 * (2 ** z)


def _tile_x_to_lon(x: int, z: int) -> float:
    return x / (2 ** z) * 360.0 - 180.0


def _tile_y_to_lat(y: int, z: int) -> float:
    return math.degrees(math.atan(math.sinh(math.pi * (1.0 - 2.0 * y / (2 ** z)))))


def _choose_zoom(minx: float, miny: float, maxx: float, maxy: float) -> tuple[int, int, int, int, int]:
    for z in range(MAX_ZOOM, 3, -1):
        x0 = int(math.floor(_lon_to_tile_x(minx, z)))
        x1 = int(math.floor(_lon_to_tile_x(maxx, z)))
        y0 = int(math.floor(_lat_to_tile_y(maxy, z)))
        y1 = int(math.floor(_lat_to_tile_y(miny, z)))
        if (x1 - x0 + 1) * (y1 - y0 + 1) <= MAX_TILES:
            return z, x0, x1, y0, y1
    z = 4
    return (
        z,
        int(math.floor(_lon_to_tile_x(minx, z))),
        int(math.floor(_lon_to_tile_x(maxx, z))),
        int(math.floor(_lat_to_tile_y(maxy, z))),
        int(math.floor(_lat_to_tile_y(miny, z))),
    )


def _fetch_rgb(polygon: Any, date_str: str) -> tuple[np.ndarray, np.ndarray]:
    """Return (rgb_canvas, inside_mask) for the polygon at a date."""
    minx, miny, maxx, maxy = polygon.bounds
    z, x0, x1, y0, y1 = _choose_zoom(minx, miny, maxx, maxy)
    cols = x1 - x0 + 1
    rows = y1 - y0 + 1
    canvas = np.empty((rows * TILE_SIZE, cols * TILE_SIZE, 3), dtype=np.uint8)

    coords = [(tx, ty) for ty in range(y0, y1 + 1) for tx in range(x0, x1 + 1)]

    def fetch(coord: tuple[int, int]) -> tuple[int, int, np.ndarray]:
        tx, ty = coord
        resp = _client.get(_tile_url(tx, ty, z, date_str))
        resp.raise_for_status()
        return tx, ty, np.asarray(Image.open(io.BytesIO(resp.content)).convert("RGB"))

    with ThreadPoolExecutor(max_workers=8) as pool:
        for tx, ty, tile in pool.map(fetch, coords):
            ry = (ty - y0) * TILE_SIZE
            rx = (tx - x0) * TILE_SIZE
            canvas[ry : ry + TILE_SIZE, rx : rx + TILE_SIZE] = tile

    height, width = canvas.shape[:2]
    west = _tile_x_to_lon(x0, z)
    east = _tile_x_to_lon(x1 + 1, z)
    north = _tile_y_to_lat(y0, z)
    south = _tile_y_to_lat(y1 + 1, z)
    transform = Affine((east - west) / width, 0, west, 0, -(north - south) / height, north)
    mask = geometry_mask(
        [polygon.__geo_interface__], out_shape=(height, width), transform=transform, invert=True
    )
    return canvas, mask


def _classify(rgb: np.ndarray, mask: np.ndarray) -> dict[str, float | int]:
    r = rgb[:, :, 0].astype(np.float32) / 255.0
    g = rgb[:, :, 1].astype(np.float32) / 255.0
    b = rgb[:, :, 2].astype(np.float32) / 255.0

    brightness = (r + g + b) / 3.0

    # True color has no NIR, so urban/bare separation is unreliable: treat
    # everything that is neither water nor vegetation as "built-up / bare".
    vegetation = (g > r) & (g > b)
    water = (b > r) & (b > g) & (brightness < 0.6)
    cloud = brightness > 0.88
    built_up = (~vegetation) & (~water) & (~cloud)

    valid = mask & (~cloud)
    total = int(valid.sum())
    if total == 0:
        return {"water_pct": 0.0, "vegetation_pct": 0.0, "built_up_pct": 0.0, "valid_pixels": 0}

    def pct(cond: np.ndarray) -> float:
        return round(float((valid & cond).sum()) / total * 100.0, 1)

    return {
        "water_pct": pct(water),
        "vegetation_pct": pct(vegetation),
        "built_up_pct": pct(built_up),
        "valid_pixels": total,
    }


def _default_end_date() -> str:
    return (date.today() - timedelta(days=3)).isoformat()


def _default_start_date(end_date: str) -> str:
    year, month, day = (int(part) for part in end_date.split("-"))
    start_year = max(2014, year - 5)
    return f"{start_year:04d}-{month:02d}-{day:02d}"


def analyze_region(
    geometry: dict[str, Any], start_date: str | None = None, end_date: str | None = None
) -> dict[str, Any]:
    """Classify a polygon at two dates and report cover + change."""
    polygon = shape(gis_engine._parse_geometry(geometry))

    end_date = end_date or _default_end_date()
    start_date = start_date or _default_start_date(end_date)

    end_rgb, end_mask = _fetch_rgb(polygon, end_date)
    end_stats = _classify(end_rgb, end_mask)
    start_rgb, start_mask = _fetch_rgb(polygon, start_date)
    start_stats = _classify(start_rgb, start_mask)

    change = {
        "water": round(float(end_stats["water_pct"]) - float(start_stats["water_pct"]), 1),
        "vegetation": round(float(end_stats["vegetation_pct"]) - float(start_stats["vegetation_pct"]), 1),
        "built_up": round(float(end_stats["built_up_pct"]) - float(start_stats["built_up_pct"]), 1),
    }
    changed = any(abs(value) >= SIGNIFICANT_CHANGE_PCT for value in change.values())

    return {
        "water_pct": end_stats["water_pct"],
        "vegetation_pct": end_stats["vegetation_pct"],
        "built_up_pct": end_stats["built_up_pct"],
        "valid_pixels": end_stats["valid_pixels"],
        "start_date": start_date,
        "end_date": end_date,
        "changed": changed,
        "change": change,
    }
