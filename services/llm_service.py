"""LLM service wrapper that translates GIS statistics into conversational answers."""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import openai

logger = logging.getLogger(__name__)

MODEL = "gpt-4o-mini"
TEMPERATURE = 0.2

SYSTEM_PROMPT = (
    "You are SatQuery AI, an expert vision-language geospatial assistant. "
    "You analyze satellite imagery and present spatial findings in simple, plain "
    "language. You receive raw computed GIS data from satellite rasters. Synthesize "
    "this data to directly answer the user's question. Be concise (2-3 sentences max). "
    "Do not mention technical formulas like NDVI or raw array math unless explicitly asked."
)

DEFAULT_PROMPT = (
    "Provide a general summary of the land cover in the selected area, mentioning "
    "the dominant vegetation and water presence."
)

_client: openai.OpenAI | None = None


def _get_client() -> openai.OpenAI:
    """Return a cached OpenAI client, initializing from OPENAI_API_KEY."""
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY is not set.")
        _client = openai.OpenAI(api_key=api_key)
    return _client


def _build_user_prompt(user_query: str, gis_data: dict[str, Any]) -> str:
    """Compose the user prompt from the query and serialized GIS data."""
    query = user_query.strip() or DEFAULT_PROMPT
    data = json.dumps(gis_data, indent=2, default=str)
    return f"User question:\n{query}\n\nComputed GIS data (JSON):\n{data}"


def generate_spatial_response(
    user_query: str = "", gis_data: dict[str, Any] | None = None
) -> str:
    """Return a plain-language answer to user_query grounded in gis_data."""
    content = _build_user_prompt(user_query, gis_data or {})
    try:
        completion = _get_client().chat.completions.create(
            model=MODEL,
            temperature=TEMPERATURE,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": content},
            ],
        )
    except openai.OpenAIError as exc:
        logger.error("OpenAI API request failed", exc_info=True)
        raise RuntimeError(f"LLM request failed: {exc}") from exc
    return completion.choices[0].message.content or ""