"""SatQuery AI FastAPI application exposing geospatial analysis endpoints."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services import gis_engine
from services.llm_service import generate_spatial_response

logger = logging.getLogger(__name__)

app = FastAPI(
    title="SatQuery AI",
    description="Geospatial satellite image analysis with natural-language queries.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalysisRequest(BaseModel):
    """Request body for the spatial analysis endpoints."""

    geometry: dict[str, Any] = Field(
        ..., description="GeoJSON polygon in EPSG:4326 or EPSG:3857."
    )
    query: str = Field(default="", description="Free-text question about the selected area.")
    start_year: int = Field(default=2018, ge=2000, description="Start year for temporal analysis.")
    end_year: int = Field(default=2026, ge=2000, description="End year for analysis.")


class ChatResponse(BaseModel):
    """Response payload for POST /api/chat."""

    reply: str
    stats: dict[str, Any]
    geometry: dict[str, Any]


class TimelineResponse(BaseModel):
    """Response payload for POST /api/timeline."""

    narrative: str
    diff: dict[str, Any]
    geometry: dict[str, Any]


class RegionSummaryResponse(BaseModel):
    """Response payload for POST /api/summarize-region."""

    summary: dict[str, Any]
    geometry: dict[str, Any]


class AnomalyResponse(BaseModel):
    """Pre-calculated anomaly alert payload."""

    alert: str
    detail: str
    coordinates: list[float]
    zoom_level: int


def _region_narrative(stats: dict[str, Any]) -> str:
    """Describe vegetation/water cover from raw cover statistics."""
    return (
        f"In the selected area, approximately {stats['veg_pct']}% of the land is "
        f"covered by green vegetation and {stats['water_pct']}% is covered by water."
    )


def _to_http_error(exc: Exception) -> HTTPException:
    """Map domain exceptions to HTTP error responses."""
    if isinstance(exc, gis_engine.GeometryError):
        return HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    if isinstance(exc, FileNotFoundError):
        return HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    if isinstance(exc, RuntimeError):
        return HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))
    if isinstance(exc, ValueError):
        return HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc))
    logger.exception("Unexpected server error")
    return HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Internal server error.")


@app.post("/api/chat", response_model=ChatResponse, summary="Image Analysis & Natural Language GIS Query")
def chat(request: AnalysisRequest) -> ChatResponse:
    """Answer a free-text query about the end-year analysis of the geometry."""
    try:
        stats = gis_engine.process_raster(request.geometry, request.end_year)
        reply = generate_spatial_response(request.query, stats)
    except (FileNotFoundError, RuntimeError, ValueError) as exc:
        raise _to_http_error(exc) from exc
    return ChatResponse(reply=reply, stats=stats, geometry=request.geometry)


@app.post(
    "/api/timeline",
    response_model=TimelineResponse,
    summary="Historical Timeline & Change Detection",
)
def timeline(request: AnalysisRequest) -> TimelineResponse:
    """Summarize vegetation/water change between start_year and end_year."""
    if request.start_year > request.end_year:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "start_year must be less than or equal to end_year."
        )
    try:
        diff = gis_engine.compute_temporal_change(
            request.geometry, request.start_year, request.end_year
        )
        narrative = generate_spatial_response(
            f"Summarize how vegetation and water cover changed between "
            f"{request.start_year} and {request.end_year}. State clearly whether "
            f"each increased or decreased.",
            diff,
        )
    except (FileNotFoundError, RuntimeError, ValueError) as exc:
        raise _to_http_error(exc) from exc
    return TimelineResponse(narrative=narrative, diff=diff, geometry=request.geometry)


@app.post(
    "/api/summarize-region",
    response_model=RegionSummaryResponse,
    summary="Draw a Region Summary",
)
def summarize_region(request: AnalysisRequest) -> RegionSummaryResponse:
    """Return raw cover statistics and a narrative for the geometry."""
    try:
        stats = gis_engine.process_raster(request.geometry, request.end_year)
    except (FileNotFoundError, ValueError) as exc:
        raise _to_http_error(exc) from exc
    return RegionSummaryResponse(
        summary={**stats, "narrative": _region_narrative(stats)},
        geometry=request.geometry,
    )


@app.get("/api/anomalies", response_model=list[AnomalyResponse], summary="Proactive Anomaly Alerts")
def anomalies() -> list[AnomalyResponse]:
    """Return pre-calculated anomaly alerts for the demo."""
    return [
        AnomalyResponse(
            alert="Unusual Deforestation Flagged",
            detail="Vegetation dropped 27.4% in Sector 4 between 2020 and 2026.",
            coordinates=[77.5946, 12.9716],
            zoom_level=14,
        )
    ]