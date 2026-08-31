"""Google Earth Engine analysis service.

Provides Sentinel-2-based land-cover statistics, true-color/NDVI tile URLs,
and temporal change detection computed server-side on Earth Engine, rather
than from local rasters (gis_engine) or NASA GIBS tiles (gibs_analyzer).

Auth: Earth Engine requires a Google Cloud project registered for EE access.
Two auth paths are supported (checked in this order):

1. Service account (recommended for servers / hackathon demos):
     EE_SERVICE_ACCOUNT   = the service account email
     EE_PRIVATE_KEY_FILE  = path to its downloaded JSON key
   or simply:
     GOOGLE_APPLICATION_CREDENTIALS = path to a service-account JSON key
     EE_PROJECT = your GCP project id

2. User credentials already stored locally via `earthengine authenticate`
   (only useful for local dev, not deployable):
     EE_PROJECT = your GCP project id

See README / .env.example for setup instructions.
"""

from __future__ import annotations

import logging
import os
import threading
from pathlib import Path
from typing import Any

import ee
from dotenv import load_dotenv

from services.gis_engine import GeoJSONGeometry, GeometryError

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logger = logging.getLogger(__name__)

_init_lock = threading.Lock()
_initialized = False

COLLECTION = "COPERNICUS/S2_SR_HARMONIZED"
DEFAULT_SCALE = 10  # meters/pixel, native Sentinel-2 resolution for B2/B3/B4/B8
MAX_CLOUD_PCT = 20
NDVI_VEG_THRESHOLD = 0.3
NDWI_WATER_THRESHOLD = 0.0
NDBI_BUILT_THRESHOLD = 0.05

TRUE_COLOR_VIS = {"bands": ["B4", "B3", "B2"], "min": 0, "max": 3000, "gamma": 1.2}
NDVI_VIS = {
    "min": -0.2,
    "max": 0.8,
    "palette": ["#a50026", "#f4a900", "#ffffbf", "#66bd63", "#1a9850"],
}


class EarthEngineNotConfigured(RuntimeError):
    """Raised when EE credentials are missing or invalid."""


def _ensure_initialized() -> None:
    """Initialize the Earth Engine session once, lazily, thread-safely."""
    global _initialized
    if _initialized:
        return
    with _init_lock:
        if _initialized:
            return
        project = os.environ.get("EE_PROJECT")
        service_account = os.environ.get("EE_SERVICE_ACCOUNT")
        key_file = os.environ.get("EE_PRIVATE_KEY_FILE") or os.environ.get(
            "GOOGLE_APPLICATION_CREDENTIALS"
        )
        try:
            if service_account and key_file:
                credentials = ee.ServiceAccountCredentials(service_account, key_file)
                ee.Initialize(credentials, project=project)
            elif key_file:
                credentials = ee.ServiceAccountCredentials(None, key_file)
                ee.Initialize(credentials, project=project)
            else:
                # Falls back to locally cached `earthengine authenticate` creds.
                ee.Initialize(project=project)
        except Exception as exc:  # noqa: BLE001 - surface as a clear config error
            raise EarthEngineNotConfigured(
                "Earth Engine is not configured. Set EE_SERVICE_ACCOUNT + "
                "EE_PRIVATE_KEY_FILE (or GOOGLE_APPLICATION_CREDENTIALS) and "
                "EE_PROJECT in your .env, or run `earthengine authenticate` "
                f"locally. Original error: {exc}"
            ) from exc
        _initialized = True


def _to_ee_geometry(geometry: GeoJSONGeometry) -> ee.Geometry:
    """Convert a GeoJSON geometry dict into an ee.Geometry, validating shape."""
    geom_type = geometry.get("type")
    coords = geometry.get("coordinates")
    if geom_type != "Polygon" or not coords:
        raise GeometryError("GEE analysis requires a GeoJSON Polygon geometry.")
    try:
        return ee.Geometry.Polygon(coords)
    except Exception as exc:  # noqa: BLE001
        raise GeometryError(f"Invalid polygon geometry: {exc}") from exc


def _cloud_masked_collection(
    region: ee.Geometry, start_date: str, end_date: str, max_cloud_pct: int = MAX_CLOUD_PCT
) -> ee.ImageCollection:
    """Sentinel-2 SR collection filtered to region/date/cloudiness, cloud-masked via QA60."""

    def _mask_clouds(image: ee.Image) -> ee.Image:
        qa = image.select("QA60")
        cloud_bit = 1 << 10
        cirrus_bit = 1 << 11
        mask = qa.bitwiseAnd(cloud_bit).eq(0).And(qa.bitwiseAnd(cirrus_bit).eq(0))
        return image.updateMask(mask).divide(1).copyProperties(image, ["system:time_start"])

    return (
        ee.ImageCollection(COLLECTION)
        .filterBounds(region)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", max_cloud_pct))
        .map(_mask_clouds)
    )


def _composite(region: ee.Geometry, start_date: str, end_date: str) -> ee.Image:
    """Median cloud-free composite for a region/date range, or raise if empty."""
    collection = _cloud_masked_collection(region, start_date, end_date)
    size = collection.size().getInfo()
    if size == 0:
        raise ValueError(
            f"No Sentinel-2 scenes found for {start_date}..{end_date} over this "
            "region under the current cloud-cover threshold. Try widening the "
            "date range."
        )
    return collection.median().clip(region)


def _with_indices(image: ee.Image) -> ee.Image:
    """Attach NDVI, NDWI (McFeeters), and NDBI bands to a Sentinel-2 image."""
    ndvi = image.normalizedDifference(["B8", "B4"]).rename("NDVI")
    ndwi = image.normalizedDifference(["B3", "B8"]).rename("NDWI")
    ndbi = image.normalizedDifference(["B11", "B8"]).rename("NDBI")
    return image.addBands([ndvi, ndwi, ndbi])


def compute_stats(
    geometry: GeoJSONGeometry, start_date: str, end_date: str, scale: int = DEFAULT_SCALE
) -> dict[str, Any]:
    """Water/vegetation/built-up percentage cover for a region, from live Sentinel-2 data."""
    _ensure_initialized()
    region = _to_ee_geometry(geometry)
    composite = _with_indices(_composite(region, start_date, end_date))

    water = composite.select("NDWI").gt(NDWI_WATER_THRESHOLD)
    vegetation = composite.select("NDVI").gt(NDVI_VEG_THRESHOLD)
    built_up = composite.select("NDBI").gt(NDBI_BUILT_THRESHOLD).And(vegetation.Not())

    valid = composite.select("NDVI").mask()
    counts = ee.Image.cat(
        [
            valid.rename("valid"),
            water.rename("water"),
            vegetation.rename("vegetation"),
            built_up.rename("built_up"),
        ]
    ).reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=region,
        scale=scale,
        maxPixels=1e10,
        bestEffort=True,
    )
    result = counts.getInfo()
    valid_pixels = result.get("valid") or 0.0
    if not valid_pixels:
        raise ValueError("No valid (cloud-free) pixels found in this region for the given dates.")

    def pct(key: str) -> float:
        return round((result.get(key) or 0.0) / valid_pixels * 100, 1)

    return {
        "veg_pct": pct("vegetation"),
        "water_pct": pct("water"),
        "built_up_pct": pct("built_up"),
        "valid_pixels": int(valid_pixels),
        "start_date": start_date,
        "end_date": end_date,
        "source": "gee-sentinel2",
    }


def compute_temporal_change(
    geometry: GeoJSONGeometry,
    start_range: tuple[str, str],
    end_range: tuple[str, str],
    scale: int = DEFAULT_SCALE,
) -> dict[str, Any]:
    """Compare vegetation/water/built-up cover between two live Sentinel-2 composites."""
    start_stats = compute_stats(geometry, *start_range, scale=scale)
    end_stats = compute_stats(geometry, *end_range, scale=scale)

    def diff(key: str) -> dict[str, float]:
        return {
            "start_pct": start_stats[key],
            "end_pct": end_stats[key],
            "net_change_pct": round(end_stats[key] - start_stats[key], 1),
        }

    return {
        "start_range": start_range,
        "end_range": end_range,
        "vegetation": diff("veg_pct"),
        "water": diff("water_pct"),
        "built_up": diff("built_up_pct"),
        "source": "gee-sentinel2",
    }


def true_color_tile_url(geometry: GeoJSONGeometry, start_date: str, end_date: str) -> str:
    """XYZ tile URL template ({z}/{x}/{y}) for a true-color composite, for Leaflet TileLayer."""
    _ensure_initialized()
    region = _to_ee_geometry(geometry)
    composite = _composite(region, start_date, end_date)
    map_id = ee.data.getMapId({"image": composite, **TRUE_COLOR_VIS})
    return map_id["tile_fetcher"].url_format


def ndvi_tile_url(geometry: GeoJSONGeometry, start_date: str, end_date: str) -> str:
    """XYZ tile URL template for an NDVI-colorized composite, for Leaflet TileLayer."""
    _ensure_initialized()
    region = _to_ee_geometry(geometry)
    composite = _with_indices(_composite(region, start_date, end_date))
    ndvi = composite.select("NDVI")
    map_id = ee.data.getMapId({"image": ndvi, **NDVI_VIS})
    return map_id["tile_fetcher"].url_format
