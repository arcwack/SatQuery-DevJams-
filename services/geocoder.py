"""Geocoding proxy — resolves a place name to coordinates via OpenStreetMap
Nominatim, which needs no API key. Returns a point + a bounding box so the
frontend can fly to (and frame) the result for either a country or a city."""

from __future__ import annotations

from typing import Any

import httpx

NOMINATIM = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "SatQuery-DevJams/1.0 (educational demo)"
_client = httpx.Client(timeout=20, follow_redirects=True)


def geocode(query: str) -> dict[str, Any] | None:
    """Resolve a free-text place query to a center + bounding box."""
    resp = _client.get(
        NOMINATIM,
        params={"q": query, "format": "jsonv2", "limit": 1},
        headers={"User-Agent": USER_AGENT},
    )
    resp.raise_for_status()
    items = resp.json()
    if not items:
        return None

    item = items[0]
    lat = float(item["lat"])
    lon = float(item["lon"])
    bb = item.get("boundingbox")
    bounds = None
    if bb:
        south, north, west, east = (float(value) for value in bb)
        bounds = [[south, west], [north, east]]

    return {
        "label": item.get("display_name", query),
        "lat": lat,
        "lon": lon,
        "bounds": bounds,
    }


def reverse_geocode(lat: float, lon: float, zoom: int = 10) -> dict[str, Any] | None:
    """Resolve a coordinate to the nearest named feature (best-effort)."""
    resp = _client.get(
        "https://nominatim.openstreetmap.org/reverse",
        params={"lat": lat, "lon": lon, "format": "jsonv2", "zoom": zoom},
        headers={"User-Agent": USER_AGENT},
    )
    resp.raise_for_status()
    data = resp.json()
    if not data:
        return None
    return {
        "label": data.get("display_name", ""),
        "type": data.get("type", ""),
    }
