"""Natural-language intent parsing and spatial operation dispatch."""

from __future__ import annotations

from typing import Any

import numpy as np

from services import gis_engine
from services.llm_service import generate_spatial_response

CLASS_KEYWORDS = {
    "water": ("water", "river", "lake", "ocean", "sea", "coast"),
    "vegetation": ("vegetation", "green", "forest", "tree", "trees", "grass", "crop"),
    "built_up": ("built", "building", "urban", "construction", "city", "road"),
}

CHANGE_KEYWORDS = (
    "change", "changed", "over time", "timeline", "before", "after", "difference",
)

CLASS_CODES = {
    "water": gis_engine.CLASS_WATER,
    "vegetation": gis_engine.CLASS_VEGETATION,
    "built_up": gis_engine.CLASS_BUILT_UP,
}


def _target_class(query: str) -> str | None:
    q = query.lower()
    for cls, keywords in CLASS_KEYWORDS.items():
        if any(k in q for k in keywords):
            return cls
    return None


def _parse_intent(query: str) -> str:
    q = query.lower()
    has_water = any(k in q for k in ("river", "water", "lake", "coast"))
    has_built = any(k in q for k in CLASS_KEYWORDS["built_up"])
    if "near" in q and has_water and has_built:
        return "near_water_built_up"
    if any(k in q for k in CHANGE_KEYWORDS):
        return "change"
    return "land_cover"


def run_query(
    query: str, geometry: gis_engine.GeoJSONGeometry, start_year: int, end_year: int
) -> dict[str, Any]:
    """Dispatch a free-text query to an operation and return its result."""
    intent = _parse_intent(query)
    if intent == "near_water_built_up":
        return _run_near_water(query, start_year, end_year)
    if intent == "change":
        return _run_change(query, geometry, start_year, end_year)
    return _run_land_cover(query, geometry, end_year)


def _run_land_cover(
    query: str, geometry: gis_engine.GeoJSONGeometry, year: int
) -> dict[str, Any]:
    stats = gis_engine.process_raster(geometry, year)
    target = _target_class(query)
    if target:
        mask = gis_engine.class_geometry_mask(year, geometry, CLASS_CODES[target])
        highlights = gis_engine.mask_to_geojson(mask, year, target)
    else:
        highlights: dict[str, Any] = {"type": "FeatureCollection", "features": []}
        for cls, code in CLASS_CODES.items():
            mask = gis_engine.class_geometry_mask(year, geometry, code)
            highlights["features"].extend(
                gis_engine.mask_to_geojson(mask, year, cls)["features"]
            )
    reply = generate_spatial_response(query, {**stats, "operation": "land_cover_summary"})
    return {"intent": "land_cover", "reply": reply, "stats": stats, "highlights": highlights}


def _run_change(
    query: str,
    geometry: gis_engine.GeoJSONGeometry,
    start_year: int,
    end_year: int,
) -> dict[str, Any]:
    diff = gis_engine.compute_temporal_change(geometry, start_year, end_year)
    reply = generate_spatial_response(query, diff)
    return {
        "intent": "change",
        "reply": reply,
        "stats": diff,
        "highlights": {"type": "FeatureCollection", "features": []},
    }


def _run_near_water(query: str, start_year: int, end_year: int) -> dict[str, Any]:
    mask = gis_engine.near_water_built_up_mask(start_year, end_year)
    highlights = gis_engine.mask_to_geojson(mask, end_year, "new_construction")
    data = {
        "start_year": start_year,
        "end_year": end_year,
        "operation": "near_water_construction",
        "new_construction_pixels": int(np.count_nonzero(mask)),
    }
    reply = generate_spatial_response(query, data)
    return {
        "intent": "near_water_built_up",
        "reply": reply,
        "stats": data,
        "highlights": highlights,
    }
