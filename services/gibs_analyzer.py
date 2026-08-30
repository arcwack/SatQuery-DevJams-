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
from rasterio.features import geometry_mask, shapes as raster_shapes
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

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


def _fetch_rgb(polygon: Any, date_str: str) -> tuple[np.ndarray, np.ndarray, Affine]:
    """Return (rgb_canvas, inside_mask, transform) for the polygon at a date."""
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
    return canvas, mask, transform


def _classify_masks(
    rgb: np.ndarray, mask: np.ndarray
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Return (vegetation, water, built_up, valid) boolean masks."""
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
    return vegetation, water, built_up, valid


def _classify(rgb: np.ndarray, mask: np.ndarray) -> dict[str, float | int]:
    vegetation, water, built_up, valid = _classify_masks(rgb, mask)
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

    end_rgb, end_mask, _ = _fetch_rgb(polygon, end_date)
    end_stats = _classify(end_rgb, end_mask)
    start_rgb, start_mask, _ = _fetch_rgb(polygon, start_date)
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


TARGET_KEYWORDS = {
    "water": ("water", "river", "lake", "sea", "ocean", "coast", "reservoir"),
    "vegetation": ("vegetation", "green", "forest", "tree", "grass", "crop", "farm", "field"),
    "built_up": ("built", "building", "urban", "construction", "city", "road", "town"),
}


def _target_from_query(query: str) -> str | None:
    q = query.lower()
    for cls, keywords in TARGET_KEYWORDS.items():
        if any(k in q for k in keywords):
            return cls
    return None


CLASS_LABELS = {
    "water": "water",
    "vegetation": "green vegetation",
    "built_up": "built-up / bare land",
}


def _coverage_phrase(pct: float) -> str:
    if pct < 5:
        return "only a trace, so it is largely absent here"
    if pct < 15:
        return "a small share"
    if pct < 40:
        return "a moderate share"
    if pct < 65:
        return "a substantial share"
    return "extensive — it clearly dominates the surface"


def _build_reply(target: str | None, stats: dict[str, float], date_str: str) -> str:
    if target:
        pct = stats[f"{target}_pct"]
        label = CLASS_LABELS[target]
        others = sorted(
            [("water", stats["water_pct"]), ("vegetation", stats["vegetation_pct"]), ("built_up", stats["built_up_pct"])],
            key=lambda t: t[1],
            reverse=True,
        )
        rest = ", ".join(f"{CLASS_LABELS[k]} {p}%" for k, p in others if k != target)
        return (
            f"{label.capitalize()} covers {pct}% of the selected area — "
            f"{_coverage_phrase(pct)}. The remaining surface is split between "
            f"{rest}. (Imagery {date_str})"
        )

    ranked = sorted(
        [("water", stats["water_pct"], CLASS_LABELS["water"]),
         ("vegetation", stats["vegetation_pct"], CLASS_LABELS["vegetation"]),
         ("built_up", stats["built_up_pct"], CLASS_LABELS["built_up"])],
        key=lambda t: t[1],
        reverse=True,
    )
    top_label, top_pct = ranked[0][2], ranked[0][1]
    mid = ", ".join(f"{lab} {p}%" for _, p, lab in ranked[1:])
    return (
        f"The selected area is dominated by {top_label} ({top_pct}%), followed by "
        f"{mid}. Overall it reads as a {top_label.lower()}-dominated surface. "
        f"(Imagery {date_str})"
    )


def _vectorize(mask: np.ndarray, transform: Affine, class_name: str) -> list[dict[str, Any]]:
    """Convert a boolean mask into one simplified GeoJSON feature."""
    geoms = [
        shape(geom)
        for geom, value in raster_shapes(mask.astype(np.uint8), transform=transform)
        if value
    ]
    if not geoms:
        return []
    merged = unary_union(geoms)
    if merged.is_empty:
        return []
    merged = merged.simplify(0.0006, preserve_topology=True)
    return [{"type": "Feature", "properties": {"class": class_name}, "geometry": mapping(merged)}]


def detect_features(
    geometry: dict[str, Any], query: str = "", date_str: str | None = None
) -> dict[str, Any]:
    """Classify a region and return text + highlight polygons for the map."""
    polygon = shape(gis_engine._parse_geometry(geometry))
    date_str = date_str or _default_end_date()

    rgb, mask, transform = _fetch_rgb(polygon, date_str)
    vegetation, water, built_up, valid = _classify_masks(rgb, mask)
    stats = _classify(rgb, mask)

    target = _target_from_query(query)
    if target:
        classes = {"water": water, "vegetation": vegetation, "built_up": built_up}
        masks = [(target, classes[target] & mask)]
    else:
        masks = [
            ("water", water & mask),
            ("vegetation", vegetation & mask),
            ("built_up", built_up & mask),
        ]

    features: list[dict[str, Any]] = []
    for name, class_mask in masks:
        features.extend(_vectorize(class_mask, transform, name))

    return {
        "reply": _build_reply(target, stats, date_str),
        "stats": {
            "water_pct": stats["water_pct"],
            "vegetation_pct": stats["vegetation_pct"],
            "built_up_pct": stats["built_up_pct"],
        },
        "highlights": {"type": "FeatureCollection", "features": features},
    }


CHANGE_ORDER = (("vegetation", "Vegetation"), ("water", "Water"), ("built_up", "built-up land"))


def _change_narrative(start_date: str, end_date: str, change: dict[str, float]) -> str:
    parts = []
    for cls, label in CHANGE_ORDER:
        value = change.get(cls, 0)
        if abs(value) >= 1:
            parts.append(f"{label} {'grew' if value > 0 else 'dropped'} {abs(value):.1f}%")
    if not parts:
        return f"Land cover remained largely stable between {start_date} and {end_date}."
    return f"Between {start_date} and {end_date}, " + ", ".join(parts) + "."


def timeline(
    geometry: dict[str, Any], start_date: str | None = None, end_date: str | None = None
) -> dict[str, Any]:
    """Compare a polygon at two dates and return the change, plus a narration."""
    result = analyze_region(geometry, start_date, end_date)
    narrative = _change_narrative(result["start_date"], result["end_date"], result["change"])
    return {"narrative": narrative, **result}


# --- Feature 4: plain-language spatial queries ---

WATER_KEYWORDS = ("river", "water", "lake", "sea", "ocean", "coast", "reservoir")
BUILT_KEYWORDS = ("built", "building", "urban", "construction", "city", "road", "town")
CHANGE_KEYWORDS = (
    "change", "changed", "over time", "grew", "grow", "dropped",
    "increase", "decrease", "different",
)


def _query_intent(query: str) -> str:
    q = query.lower()
    has_water = any(k in q for k in WATER_KEYWORDS)
    has_built = any(k in q for k in BUILT_KEYWORDS)
    if "near" in q and (has_water or has_built):
        return "proximity"
    if any(k in q for k in CHANGE_KEYWORDS):
        return "change"
    return "detect"


def _dilate(mask: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return mask
    out = mask.copy()
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            out |= np.roll(np.roll(mask, dy, axis=0), dx, axis=1)
    return out


def _near_water_construction(
    geometry: dict[str, Any], start_date: str, end_date: str, buffer: int = 3
) -> dict[str, Any]:
    """New built-up pixels within a few pixels of water, vs. the start date."""
    polygon = shape(gis_engine._parse_geometry(geometry))
    end_rgb, end_mask, transform = _fetch_rgb(polygon, end_date)
    start_rgb, start_mask, _ = _fetch_rgb(polygon, start_date)
    _, water_e, built_e, _ = _classify_masks(end_rgb, end_mask)
    _, _, built_s, _ = _classify_masks(start_rgb, start_mask)

    near_water = _dilate(water_e & end_mask, buffer) & end_mask
    new_built = built_e & ~built_s & end_mask
    result = new_built & near_water

    features = _vectorize(result, transform, "new_construction")
    total = int(end_mask.sum())
    count = int(result.sum())
    pct = round(count / total * 100, 1) if total else 0.0
    reply = (
        f"Between {start_date} and {end_date}, ~{pct}% of the area shows new "
        f"construction near water (highlighted)."
    )
    return {
        "intent": "proximity",
        "reply": reply,
        "stats": {"new_construction_pixels": count, "new_construction_pct": pct},
        "highlights": {"type": "FeatureCollection", "features": features},
    }


def _area_change(
    geometry: dict[str, Any], start_date: str, end_date: str
) -> dict[str, Any]:
    """Highlight pixels where built-up gained or vegetation was lost."""
    polygon = shape(gis_engine._parse_geometry(geometry))
    end_rgb, end_mask, transform = _fetch_rgb(polygon, end_date)
    start_rgb, start_mask, _ = _fetch_rgb(polygon, start_date)
    veg_e, _, built_e, _ = _classify_masks(end_rgb, end_mask)
    veg_s, _, built_s, _ = _classify_masks(start_rgb, start_mask)

    change_mask = ((built_e & ~built_s) | (veg_s & ~veg_e)) & end_mask
    features = _vectorize(change_mask, transform, "change")

    end_stats = _classify(end_rgb, end_mask)
    start_stats = _classify(start_rgb, start_mask)
    change = {
        "water": round(float(end_stats["water_pct"]) - float(start_stats["water_pct"]), 1),
        "vegetation": round(float(end_stats["vegetation_pct"]) - float(start_stats["vegetation_pct"]), 1),
        "built_up": round(float(end_stats["built_up_pct"]) - float(start_stats["built_up_pct"]), 1),
    }
    reply = _change_narrative(start_date, end_date, change)
    return {
        "intent": "change",
        "reply": reply,
        "stats": change,
        "highlights": {"type": "FeatureCollection", "features": features},
    }


def spatial_query(
    geometry: dict[str, Any],
    query: str = "",
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict[str, Any]:
    """Resolve a plain-language query to a spatial operation and run it."""
    end_date = end_date or _default_end_date()
    start_date = start_date or _default_start_date(end_date)
    intent = _query_intent(query)
    if intent == "proximity":
        return _near_water_construction(geometry, start_date, end_date)
    if intent == "change":
        return _area_change(geometry, start_date, end_date)
    result = detect_features(geometry, query, end_date)
    return {"intent": "detect", **result}
