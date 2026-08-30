"""LLM service — SatQuery spatial query interpreter + guardrails."""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import errors

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logger = logging.getLogger(__name__)

MODEL = "gemini-3.6-flash"
TEMPERATURE = 0.2

REJECTION = (
    "I am SatQuery AI's specialized assistant. I can only answer questions "
    "related to SatQuery AI, satellite imagery analysis, and our platform "
    "features. Please ask a question related to our website or workspace!"
)

CLASSES = [
    "water",
    "trees",
    "grass",
    "flooded_vegetation",
    "crops",
    "shrub_scrub",
    "built_up",
    "bare_ground",
    "snow_ice",
]

SYSTEM_PROMPT = f"""You are SatQuery AI — a Spatial Query Interpreter & Guardrail, backed by Google Dynamic World's 10m Sentinel-2 Land Cover dataset.

SUPPORTED LAND COVER CLASSES (10m): {', '.join(CLASSES)}.

SUPPORTED OPERATIONS:
- detect      -> Feature detection / visual highlighting ("What's visible here?", "Find all water bodies")
- quantify    -> Area & percentage quantification ("How many sq km of forest?", "What % is built-up?")
- change      -> Temporal change detection (comparing two dates on/after June 2015)
- summary     -> Region polygon summary ("Summarize this drawn shape")
- overlay     -> Multi-step spatial overlay ("Find tree loss within 1km of water")
- list        -> Name & rank detected features by size ("Name all water bodies and rank them biggest to smallest")

YOUR JOB: read the user's query and decide ONE operation + relevant classes. Return ONLY strict JSON, with this exact shape:
{{
  "operation": "detect" | "quantify" | "change" | "summary" | "overlay" | "list" | "unsupported" | "reject",
  "classes": ["water"],
  "start_date": "YYYY-MM-DD" or null,
  "end_date": "YYYY-MM-DD" or null,
  "reason": "string" (only when operation is "unsupported"),
  "message": "string" (only when operation is "reject")
}}

RULES:
1. Map the query to the appropriate operation and filter classes from the 9 supported classes.
2. You MAY name, list, and rank detected land-cover features (e.g. water bodies) by size; names are best-effort from a gazetteer. Route such queries to "list" with the relevant class (e.g. "name all water bodies and rank them" -> operation "list", classes ["water"]).
3. UNSUPPORTED (return operation "unsupported" + a short reason):
   - Features finer than 10m or unclassified: roads, buildings by name, vehicles, footpaths, bridges.
   - External datasets not in Dynamic World: weather, population, air quality, terrain/elevation, property ownership.
   - Dates before June 2015.
   - Subjective / opinion queries: "Is this a good place to buy land?", "Is this area safe?".
4. DOMAIN GUARDRAIL: Only answer questions directly about SatQuery AI, satellite analysis, or this platform (e.g. "What is SatQuery AI?", "How does the Time Machine slider work?", "What satellite data do you use?", "How to use the region summary tool?"). For those, return operation "reject" with the standard message below.
5. REJECT ALL OUT-OF-SCOPE queries (general coding, weather, math homework, trivia, recipes, history, unrelated tech) with operation "reject".
6. Standard rejection message: "{REJECTION}"

Never add commentary outside the JSON. If no clear operation fits, prefer "detect". Do not mention NDVI/technical formulas unless asked."""

DEFAULT_PROMPT = (
    "Provide a general summary of the land cover in the selected area, mentioning "
    "the dominant vegetation and water presence."
)

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    """Return a cached Gemini client initialized from GEMINI_API_KEY."""
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set.")
        _client = genai.Client(api_key=api_key)
    return _client


def _parse_json(text: str) -> dict[str, Any]:
    """Extract the first JSON object from a model response."""
    cleaned = re.sub(r"```(?:json)?|```", "", text).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            return json.loads(cleaned[start : end + 1])
    raise ValueError("Model did not return valid JSON")


def interpret_query(user_query: str) -> dict[str, Any]:
    """Interpret a plain-language query into a structured operation decision.

    Returns a dict with keys: operation, classes, start_date, end_date, and
    optionally reason/message. Raises RuntimeError on model failure.
    """
    content = f"User query:\n{user_query.strip() or DEFAULT_PROMPT}"
    try:
        response = _get_client().models.generate_content(
            model=MODEL,
            contents=content,
            config=genai.types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=TEMPERATURE,
                response_mime_type="application/json",
            ),
        )
    except errors.ClientError as exc:
        logger.error("Gemini API request failed", exc_info=True)
        raise RuntimeError(f"LLM request failed: {exc}") from exc
    return _parse_json(response.text or "{}")


def _build_user_prompt(user_query: str, gis_data: dict[str, Any]) -> str:
    """Compose the user prompt from the query and serialized GIS data."""
    query = user_query.strip() or DEFAULT_PROMPT
    data = json.dumps(gis_data, indent=2, default=str)
    return f"User question:\n{query}\n\nComputed GIS data (JSON):\n{data}"


def generate_spatial_response(
    user_query: str = "", gis_data: dict[str, Any] | None = None
) -> str:
    """Return a plain-language answer to user_query grounded in gis_data (legacy)."""
    content = _build_user_prompt(user_query, gis_data or {})
    try:
        response = _get_client().models.generate_content(
            model=MODEL,
            contents=content,
            config=genai.types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=TEMPERATURE,
            ),
        )
    except errors.ClientError as exc:
        logger.error("Gemini API request failed", exc_info=True)
        raise RuntimeError(f"LLM request failed: {exc}") from exc
    return response.text or ""