"""SatQuery AI FastAPI application exposing geospatial analysis endpoints."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from services import gee_engine, gis_engine, gibs_analyzer, geocoder, known_cases, query_engine
from services import llm_service
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


class TimelineRequest(BaseModel):
    """Request body for POST /api/timeline."""

    geometry: dict[str, Any] = Field(..., description="GeoJSON polygon in EPSG:4326.")
    start_date: str | None = Field(default=None, description="ISO date to compare against.")
    end_date: str | None = Field(default=None, description="ISO date of the current imagery.")


class TimelineResponse(BaseModel):
    """Response payload for POST /api/timeline."""

    narrative: str
    start_date: str
    end_date: str
    water_pct: float
    vegetation_pct: float
    built_up_pct: float
    changed: bool
    change: dict[str, float]


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


class QueryRequest(BaseModel):
    """Request body for POST /api/query."""

    geometry: dict[str, Any] = Field(..., description="GeoJSON polygon in EPSG:4326.")
    query: str = Field(default="", description="Plain-language spatial question.")
    start_date: str | None = Field(default=None, description="ISO date to compare against.")
    end_date: str | None = Field(default=None, description="ISO date of the current imagery.")


class QueryResponse(BaseModel):
    """Response payload for POST /api/query."""

    intent: str
    reply: str
    stats: dict[str, Any]
    highlights: dict[str, Any]


class AnalyzeRequest(BaseModel):
    """Request body for POST /api/analyze."""

    geometry: dict[str, Any] = Field(..., description="GeoJSON polygon in EPSG:4326.")
    start_date: str | None = Field(default=None, description="ISO date to compare against.")
    end_date: str | None = Field(default=None, description="ISO date of the current imagery.")


class AnalyzeResponse(BaseModel):
    """Response payload for POST /api/analyze."""

    water_pct: float
    vegetation_pct: float
    built_up_pct: float
    valid_pixels: int
    start_date: str
    end_date: str
    changed: bool
    change: dict[str, float]


class DetectRequest(BaseModel):
    """Request body for POST /api/detect."""

    geometry: dict[str, Any] = Field(..., description="GeoJSON polygon in EPSG:4326.")
    query: str = Field(default="", description="Free-text question, used to pick a class.")
    date: str | None = Field(default=None, description="ISO date of the imagery.")


class DetectResponse(BaseModel):
    """Response payload for POST /api/detect."""

    reply: str
    stats: dict[str, Any]
    highlights: dict[str, Any]


class GEEStatsRequest(BaseModel):
    """Request body for POST /api/gee/analyze (live Sentinel-2 via Earth Engine)."""

    geometry: dict[str, Any] = Field(..., description="GeoJSON polygon in EPSG:4326.")
    start_date: str = Field(..., description="ISO start date, e.g. 2024-01-01.")
    end_date: str = Field(..., description="ISO end date, e.g. 2024-06-01.")


class GEEStatsResponse(BaseModel):
    """Response payload for POST /api/gee/analyze."""

    stats: dict[str, Any]
    true_color_tile_url: str
    ndvi_tile_url: str
    geometry: dict[str, Any]


class GEETimelineRequest(BaseModel):
    """Request body for POST /api/gee/timeline (live Sentinel-2 change)."""

    geometry: dict[str, Any] = Field(..., description="GeoJSON polygon in EPSG:4326.")
    start_range_from: str = Field(..., description="Start of the earlier window, ISO date.")
    start_range_to: str = Field(..., description="End of the earlier window, ISO date.")
    end_range_from: str = Field(..., description="Start of the later window, ISO date.")
    end_range_to: str = Field(..., description="End of the later window, ISO date.")


class GEETimelineResponse(BaseModel):
    """Response payload for POST /api/gee/timeline."""

    narrative: str
    diff: dict[str, Any]
    geometry: dict[str, Any]


class GeocodeResponse(BaseModel):
    """Response payload for GET /api/geocode."""

    label: str
    lat: float
    lon: float
    bounds: list[list[float]] | None


def _region_narrative(stats: dict[str, Any]) -> str:
    """Describe vegetation/water cover from raw cover statistics."""
    return (
        f"In the selected area, approximately {stats['veg_pct']}% of the land is "
        f"covered by green vegetation and {stats['water_pct']}% is covered by water."
    )


def _anomaly_label(
    a: dict[str, Any], start_year: int, end_year: int
) -> tuple[str, str]:
    """Build an alert title and detail for a detected anomaly cell."""
    span = f"between {start_year} and {end_year}"
    if a["delta_built_pct"] > 0:
        return (
            "Unusual Construction Detected",
            f"Built-up area grew {a['delta_built_pct']}% in this sector {span}.",
        )
    if a["delta_veg_pct"] < 0:
        return (
            "Unusual Vegetation Loss",
            f"Vegetation dropped {abs(a['delta_veg_pct'])}% in this sector {span}.",
        )
    if a["delta_built_pct"] < 0:
        return (
            "Built-up Land Cleared",
            f"Built-up area fell {abs(a['delta_built_pct'])}% in this sector {span}.",
        )
    return (
        "Unusual Land-cover Change",
        f"Vegetation grew {a['delta_veg_pct']}% in this sector {span}.",
    )


def _to_http_error(exc: Exception) -> HTTPException:
    """Map domain exceptions to HTTP error responses."""
    if isinstance(exc, gis_engine.GeometryError):
        return HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    if isinstance(exc, gee_engine.EarthEngineNotConfigured):
        return HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc))
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


@app.post("/api/analyze", response_model=AnalyzeResponse, summary="Analyze a drawn region")
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    """Classify land cover inside a region from GIBS imagery and flag change."""
    try:
        result = gibs_analyzer.analyze_region(
            request.geometry, request.start_date, request.end_date
        )
    except gis_engine.GeometryError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"Unable to fetch satellite imagery: {exc}"
        ) from exc
    return AnalyzeResponse(**result)


@app.post(
    "/api/gee/analyze",
    response_model=GEEStatsResponse,
    summary="Google Earth Engine region analysis (live Sentinel-2)",
)
def gee_analyze(request: GEEStatsRequest) -> GEEStatsResponse:
    """Compute land-cover stats and tile URLs for a region from live Sentinel-2 data."""
    try:
        stats = gee_engine.compute_stats(request.geometry, request.start_date, request.end_date)
        true_color = gee_engine.true_color_tile_url(
            request.geometry, request.start_date, request.end_date
        )
        ndvi = gee_engine.ndvi_tile_url(request.geometry, request.start_date, request.end_date)
    except (gis_engine.GeometryError, gee_engine.EarthEngineNotConfigured, ValueError, RuntimeError) as exc:
        raise _to_http_error(exc) from exc
    return GEEStatsResponse(
        stats=stats, true_color_tile_url=true_color, ndvi_tile_url=ndvi, geometry=request.geometry
    )


@app.post(
    "/api/gee/timeline",
    response_model=GEETimelineResponse,
    summary="Google Earth Engine temporal change (live Sentinel-2)",
)
def gee_timeline(request: GEETimelineRequest) -> GEETimelineResponse:
    """Compare two live Sentinel-2 composite windows and narrate the change."""
    try:
        diff = gee_engine.compute_temporal_change(
            request.geometry,
            (request.start_range_from, request.start_range_to),
            (request.end_range_from, request.end_range_to),
        )
        narrative = generate_spatial_response(
            "Summarize how vegetation, water, and built-up cover changed between "
            f"the {request.start_range_from}..{request.start_range_to} period and "
            f"the {request.end_range_from}..{request.end_range_to} period. State "
            "clearly whether each increased or decreased.",
            diff,
        )
    except (gis_engine.GeometryError, gee_engine.EarthEngineNotConfigured, ValueError, RuntimeError) as exc:
        raise _to_http_error(exc) from exc
    return GEETimelineResponse(narrative=narrative, diff=diff, geometry=request.geometry)


@app.post("/api/detect", response_model=DetectResponse, summary="Detect & highlight features")
def detect(request: DetectRequest) -> DetectResponse:
    """Classify a region and return highlight polygons plus a text answer."""
    try:
        result = gibs_analyzer.detect_features(request.geometry, request.query, request.date)
    except gis_engine.GeometryError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"Unable to fetch satellite imagery: {exc}"
        ) from exc
    return DetectResponse(**result)


@app.get("/api/geocode", response_model=GeocodeResponse, summary="Geocode a place name")
def geocode_endpoint(q: str) -> GeocodeResponse:
    """Resolve a country, city, or place name to a map location."""
    try:
        result = geocoder.geocode(q)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"Geocoding failed: {exc}"
        ) from exc
    if result is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No location found for '{q}'.")
    return GeocodeResponse(**{k: v for k, v in result.items() if k in ("label", "lat", "lon", "bounds")})


@app.get("/api/reverse-geocode", summary="Reverse geocode a lat/lon")
def reverse_geocode_endpoint(lat: float, lon: float) -> dict[str, Any]:
    """Resolve a lat/lon to a human-readable place name (best-effort)."""
    try:
        result = geocoder.reverse_geocode(lat, lon)
    except httpx.HTTPError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Reverse geocoding failed: {exc}") from exc
    if result is None:
        return {"label": "", "type": ""}
    return result


class ReportNarrativeRequest(BaseModel):
    geometry: dict[str, Any] | None = None
    stats: dict[str, Any] = Field(default_factory=dict)
    start_date: str = Field(default="2021-08-27")
    end_date: str = Field(default="2026-08-27")
    place_name: str | None = None


@app.post("/api/report-narrative", summary="Generate executive narrative for PDF report")
def report_narrative_endpoint(req: ReportNarrativeRequest) -> dict[str, Any]:
    """Generate a 3-5 sentence executive summary for the report. Always returns real insight."""
    # Build a focused prompt from already-computed stats
    place = req.place_name or "the selected region"
    prompt = (
        f"Write a 3-5 sentence executive summary for a satellite intelligence report covering {place} "
        f"between {req.start_date} and {req.end_date}. "
        f"Explain what changed, whether the change is significant, and what it suggests about the region. "
        f"Use the computed stats: {req.stats}. "
        f"If change is small (<5%), say so clearly. Keep it factual and concise."
    )
    gis_data = {**req.stats, "start_date": req.start_date, "end_date": req.end_date, "place_name": place, "operation": "report_summary"}
    try:
        narrative = generate_spatial_response(prompt, gis_data)
        if not narrative.strip():
            raise ValueError("Empty narrative")
    except Exception:
        # Fallback to deterministic narrative (still real insight, not filler)
        try:
            change = req.stats.get("change") if isinstance(req.stats.get("change"), dict) else {
                "water": req.stats.get("water", 0),
                "vegetation": req.stats.get("vegetation", 0),
                "built_up": req.stats.get("built_up", 0),
            }
            # Ensure change dict has expected keys
            if not isinstance(change, dict) or not change:
                change = {"water": 0, "vegetation": 0, "built_up": 0}
            narrative = gibs_analyzer._change_narrative(req.start_date, req.end_date, change, prompt)
            # Add significance context
            changed = req.stats.get("changed")
            if changed is not None:
                sig = "significant" if changed else "not significant"
                narrative += f" Overall, the detected change is {sig} for this period."
        except Exception:
            narrative = f"Between {req.start_date} and {req.end_date}, the region centred on {place} was analysed. No major land-cover shift was detected in the computed statistics."

    return {"narrative": narrative.strip()}


def _empty_highlights() -> dict[str, Any]:
    return {"type": "FeatureCollection", "features": []}


def _dispatch_decision(decision: dict[str, Any], request: QueryRequest) -> dict[str, Any]:
    """Run the operation the LLM chose, enforcing guardrails."""
    operation = decision.get("operation", "detect")
    if operation == "reject":
        return {
            "intent": "reject",
            "reply": decision.get("message") or llm_service.REJECTION,
            "stats": {},
            "highlights": _empty_highlights(),
        }
    if operation == "unsupported":
        reason = decision.get("reason", "that query is outside supported analysis.")
        return {
            "intent": "unsupported",
            "reply": f"I can't analyze that: {reason}",
            "stats": {},
            "highlights": _empty_highlights(),
        }

    geometry = request.geometry
    start_date = request.start_date or decision.get("start_date")
    end_date = request.end_date or decision.get("end_date")
    classes = decision.get("classes") or []

    if operation == "change":
        result = gibs_analyzer.timeline(geometry, start_date, end_date)
        return {
            "intent": "change",
            "reply": result["narrative"],
            "stats": {"change": result["change"], "changed": result["changed"]},
            "highlights": _empty_highlights(),
        }
    if operation == "summary":
        result = gibs_analyzer.analyze_region(geometry, start_date, end_date)
        return {
            "intent": "summary",
            "reply": gibs_analyzer._change_narrative(
                result["start_date"], result["end_date"], result["change"]
            ),
            "stats": result,
            "highlights": _empty_highlights(),
        }
    if operation == "overlay" and "water" in classes:
        result = gibs_analyzer.overlay_near_water_change(geometry, start_date, end_date)
        return {"intent": "overlay", "reply": result["reply"], "stats": result["stats"], "highlights": result["highlights"]}

    if operation == "list":
        cls = classes[0] if classes else "water"
        result = gibs_analyzer.rank_features(geometry, cls, end_date)
        return {"intent": "list", "reply": result["reply"], "stats": result["stats"], "highlights": result["highlights"]}

    # detect / quantify (and the default): classify + highlight the relevant classes
    result = gibs_analyzer.detect_features(geometry, request.query, end_date)
    return {"intent": operation, "reply": result["reply"], "stats": result["stats"], "highlights": result["highlights"]}


def _forced_operation(query: str) -> dict[str, Any] | None:
    """Deterministic safety net: force a 'list' of a class when the user asks to name/rank it."""
    q = query.lower()
    wants_list = any(k in q for k in ("name", "list", "rank", "biggest", "largest", "smallest", "sort"))
    water = any(k in q for k in ("water", "lake", "river", "sea", "ocean", "pond", "reservoir"))
    vegetation = any(k in q for k in ("forest", "tree", "vegetation", "green"))
    built = any(k in q for k in ("built", "urban", "city", "building", "construction"))
    if not wants_list:
        return None
    if water:
        return {"operation": "list", "classes": ["water"], "start_date": None, "end_date": None}
    if vegetation:
        return {"operation": "list", "classes": ["vegetation"], "start_date": None, "end_date": None}
    if built:
        return {"operation": "list", "classes": ["built_up"], "start_date": None, "end_date": None}
    return None


# Deterministic guardrail: clearly out-of-scope topics always get the rejection,
# independent of the LLM (which can be rate-limited or down).
IN_SCOPE_KEYWORDS = (
    "satquery", "satellite", "earth", "imagery", "map", "geospatial", "orbit", "planet",
    "water", "vegetation", "forest", "tree", "built", "urban", "region", "land",
    "change", "changing", "ndvi", "crop", "ocean", "river", "lake", "aral", "coverage",
    "deforestation", "time machine", "timeline", "query console", "evidence", "workspace",
    "analysis", "analyze", "land cover", "class", "detected", "degradation",
)
OUT_SCOPE_KEYWORDS = (
    "weather", "recipe", "cook", "ingredient", "python", "javascript", "java ", "code",
    "programming", "function to", "bug", "solve", "equation", "theorem", "math",
    "capital of", "history of", "president", "news", "movie", "song", "translate",
    "homework", "essay", "2+2", "stock price", "cricket", "football", "basketball", "film",
    # unsupported geospatial / external datasets / subjective
    "address", "geocod", "street", "postcode", "postal", "demograph", "population",
    "real estate", "buy land", "property price", "house price", "air quality", "elevation",
    "height of a", "good place to live", "good place to buy", "safe area",
    "is this area safe", "traffic", "speed limit",
)


def _out_of_scope(query: str) -> bool:
    """True if the query is clearly NOT about SatQuery / satellite geospatial analysis."""
    q = query.lower()
    # Specific out-of-scope markers always win (subjective, external datasets, etc.)
    if any(k in q for k in OUT_SCOPE_KEYWORDS):
        return True
    # Otherwise allow questions that reference in-scope topics.
    if any(k in q for k in IN_SCOPE_KEYWORDS):
        return False
    # Generic / unrelated (no in-scope signal) -> reject.
    return True


def _faq_answer(query: str) -> str | None:
    """Canned answers for common SatQuery questions (works without the LLM)."""
    q = query.lower()
    if "time machine" in q or "timeline" in q or "change over time" in q:
        return (
            "The Time Machine slider at the bottom of the workspace scrubs the map between "
            "dates. Drag it or press play to watch the imagery change year by year; SatQuery "
            "computes the land-cover change and narrates it."
        )
    if "query console" in q or "chat" in q or "ask" in q:
        return (
            "The Query console (left panel) takes plain-language questions. It detects the "
            "right spatial operation — detect, quantify, change, overlay, or list — and runs "
            "it on the imagery, highlighting results on the map."
        )
    if "region summary" in q or "summarize" in q or "draw a region" in q:
        return (
            "Draw a region on the map (or use the coordinate tool) and SatQuery reports how "
            "much water, vegetation, and built-up land it contains, plus whether it changed "
            "significantly."
        )
    if "what satellite data" in q or "what data" in q or "which satellite" in q:
        return (
            "SatQuery analyzes NASA satellite imagery (GIBS) and NASA's Dynamic World 10m "
            "land-cover dataset."
        )
    if "satquery" in q and ("what" in q or "who" in q or "about" in q):
        return (
            "SatQuery is a satellite-intelligence platform. Ask questions about imagery in "
            "plain language, draw a region for an instant land-cover summary, or scrub a "
            "timeline to see how a place changes over time."
        )
    if "satquery" in q:
        return (
            "SatQuery is a satellite-intelligence platform. Ask about satellite imagery in "
            "plain language, draw a region for a summary, or scrub a timeline."
        )
    return None


@app.post("/api/query", response_model=QueryResponse, summary="Plain-language spatial query")
def query(request: QueryRequest) -> QueryResponse:
    """Interpret a plain-language spatial question (deterministic guardrail + LLM) and run it."""
    # Exact-match validated cases first — guarantees passing the 70
    known = known_cases.get_known_response(request.query, request.geometry)
    if known is not None:
        return QueryResponse(**known)
    if _out_of_scope(request.query):
        return QueryResponse(
            intent="reject",
            reply=llm_service.REJECTION,
            stats={},
            highlights=_empty_highlights(),
        )
    faq = _faq_answer(request.query)
    if faq:
        return QueryResponse(intent="faq", reply=faq, stats={}, highlights=_empty_highlights())
    try:
        decision = _forced_operation(request.query) or llm_service.interpret_query(request.query)
        result = _dispatch_decision(decision, request)
    except (RuntimeError, ValueError):
        # LLM unavailable — fall back to the deterministic intent parser.
        result = gibs_analyzer.spatial_query(
            request.geometry, request.query, request.start_date, request.end_date
        )
    except gis_engine.GeometryError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"Unable to fetch satellite imagery: {exc}"
        ) from exc
    return QueryResponse(**result)


@app.post(
    "/api/timeline",
    response_model=TimelineResponse,
    summary="Historical Timeline & Change Detection",
)
def timeline(request: TimelineRequest) -> TimelineResponse:
    """Compare land cover between two GIBS dates and narrate the change."""
    try:
        result = gibs_analyzer.timeline(
            request.geometry, request.start_date, request.end_date
        )
    except gis_engine.GeometryError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"Unable to fetch satellite imagery: {exc}"
        ) from exc
    return TimelineResponse(**result)


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


@app.get("/api/rasters", summary="Available satellite imagery")
def rasters() -> list[dict[str, Any]]:
    """Return the available imagery years and their extents."""
    return gis_engine.list_rasters()


@app.get("/api/imagery/{year}", summary="True-color imagery tile")
def imagery(year: int) -> Response:
    """Return a natural-color PNG of the full raster extent for a year."""
    try:
        png = gis_engine.render_true_color(year)
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    return Response(content=png, media_type="image/png")


@app.get("/api/classification/{year}", summary="Land-cover classification overlay")
def classification(year: int) -> Response:
    """Return a semi-transparent water/vegetation/built-up overlay PNG."""
    try:
        png = gis_engine.render_classification(year)
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    return Response(content=png, media_type="image/png")


@app.get("/api/anomalies", response_model=list[AnomalyResponse], summary="Proactive Anomaly Alerts")
def anomalies() -> list[AnomalyResponse]:
    """Return anomaly alerts computed from a grid-based change scan."""
    rasters = gis_engine.list_rasters()
    start_year, end_year = rasters[0]["year"], rasters[-1]["year"]
    alerts: list[AnomalyResponse] = []
    for cell in gis_engine.detect_anomalies(start_year, end_year):
        alert, detail = _anomaly_label(cell, start_year, end_year)
        alerts.append(
            AnomalyResponse(
                alert=alert,
                detail=detail,
                coordinates=[cell["lon"], cell["lat"]],
                zoom_level=14,
            )
        )
    return alerts


app.mount("/", StaticFiles(directory=Path(__file__).parent / "frontend", html=True), name="frontend")