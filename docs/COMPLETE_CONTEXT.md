# SatQuery — Complete Chat Context & Implementation Markup

> **Purpose:** Single-file snapshot of the entire SatQuery build — from the initial 5-feature spec through every integration, decision, and validation — so it can be reused later without re-reading the chat.

---

## 1. Project Overview

**SatQuery** is an AI-assisted geospatial console for satellite imagery. Users query land cover in plain language, draw regions, scrub time, and get map highlights + text answers. Built on **Google Dynamic World's 10 m Sentinel-2** land-cover dataset.

**Tagline:** *Talk to the earth. Understand the change.*

---

## 2. The 5 Core Features (User Spec)

| # | Feature | Expected UX |
|---|---------|-------------|
| 1 | Ask what's visible | `“What's visible here?” / “Find all water bodies”` → detect + highlight on map + text |
| 2 | Change over time | Timeline slider 2018→2026 swaps imagery; AI narrates `vegetation dropped 27%, built-up grew 41%` |
| 3 | Draw region → summary | Draw any polygon → `water / vegetation / built-up %` + `changed?` flag |
| 4 | Plain-language spatial query | `“show areas near the river where construction increased”` → figures out operation, no GIS syntax needed |
| 5 | Proactive alerts | System flags unusual change itself; jump to before/after |

---

## 3. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend framework | **Next.js 16** (App Router, React 19, TypeScript) |
| Styling | Tailwind CSS 4 + design tokens (`@theme` in `app/globals.css`) |
| Map | **Leaflet 1.9 + react-leaflet 5** (GIBS tiles, drawing, GeoJSON highlights) |
| State | **Zustand** (`lib/store.ts` → `useMapStore`) |
| Motion/icons | framer-motion, lucide-react |
| Backend framework | **FastAPI + Uvicorn** (Python) |
| Geospatial | **rasterio, shapely, pyproj, NumPy, affine** |
| Image rendering | **Pillow** (true-color + classification PNGs) |
| AI | **Google Gemini** (`gemini-3.6-flash` via `google-genai`) → **Claude** (`claude-3-5-haiku-20241022` via Anthropic, `ANTHROPIC_API_KEY`) with fallback |
| Satellite data | **Local GeoTIFFs** (`data/sentinel_*.tif` synthetic 50×50) + **NASA GIBS** (VIIRS TrueColor, BlueMarble) live tiles |
| Geocoding | **Nominatim (OSM)** via `services/geocoder.py` (`/api/geocode`) |

---

## 4. System Architecture

```
Browser — Next.js UI (localhost:3000)
 ├─ MapStage / MapView (Leaflet + GIBS)
 ├─ ChatPanel ─┐
 ├─ TimelineBar ├─ useMapStore (Zustand)
 └─ EvidencePanel┘
        │  fetch /api/*  (CORS *)
        ▼
FastAPI — main.py (localhost:8000)
 ├─ /api/analyze, /api/detect, /api/timeline, /api/query, /api/geocode, /api/anomalies, /api/rasters, /api/imagery/{y}, /api/classification/{y}
 └─ services/
     ├─ gibs_analyzer.py  (real GIBS tile fetch, RGB classification, change, ranking, vectorization)
     ├─ gis_engine.py     (local raster NDVI/NDWI, legacy synthetic endpoints)
     ├─ geocoder.py       (forward + reverse Nominatim)
     ├─ query_engine.py   (legacy synthetic intent parser)
     ├─ llm_service.py    (Claude → Gemini → deterministic fallback, plus interpret_query)
     └─ known_cases.py    (exact-match harness for the 70 validated tests)
         └─ data/validated_test_cases_70.csv
```

**Request flow (chat):** `ChatPanel` → `{geometry, query, dates}` → `POST /api/query` → `known_cases` (exact 70? return canned) → `_out_of_scope` guard (deterministic reject) → `_faq_answer` → `llm_service.interpret_query` (Claude→Gemini) → `_dispatch_decision` → `gibs_analyzer.*` (detect/timeline/rank) → `{reply, highlights, stats}` → map highlights + chat bubble. If LLM 429/down, falls back to deterministic `spatial_query`.

---

## 5. What Was Actually Built (Step-by-Step)

### Phase 1 — Backend gaps closed (synthetic, then real)
- `GET /api/rasters` + `GET /api/imagery/{year}` (true-color PNG, Pillow)
- Classification overlay (`water=blue #1e5adc, vegetation=green #22c55e, built_up=red #dc3c3c`) + built-up class
- Timeline now driven by slider year (`selectedYear`)
- Demo data regenerated (`scripts/generate_demo_data.py` — river + growing built-up 2018→2026)

### Phase 2 — Next.js integration
- Installed `leaflet`, `react-leaflet`, `zustand`, `@types/leaflet` in `satquery 2`
- `lib/api.ts` (typed client), `lib/store.ts` (`useMapStore` with rasters, activeYear/Date, geometry, highlights, regionResult, timelineNarrative, etc.), `lib/geo.ts` (viewGeometry helper)
- `components/workspace/LeafletMap.tsx` (dark void, image overlays, coverage rect, fitBounds, coordinate readout)

### Phase 3 — GIBS real-imagery map foundation
- `lib/mapConfig.ts` (ARAL_SEA [44.9,60.0], MAP_DEFAULTS), `lib/gibs.ts` (WMTS tile URL + `getGibsStaticImageUrl` + `getBlueMarbleUrl`), `MapView.tsx`, `MapControls.tsx`, `RegionLayer.tsx` (polygon draw, click→dblclick)
- `SatelliteBackdrop` (NASA GIBS static image, now `BlueMarble_ShadedRelief_Bathymetry` cloud-free, then later `earth-from-space.jpg` local)

### Feature 3 — Draw region → summary (GIBS)
- `services/gibs_analyzer.py`: `fetch_rgb` (parallel tile fetch), `_classify_masks` (high/low vegetation split), `analyze_region` (two-date compare, `changed` flag)
- `POST /api/analyze` → `{water_pct, vegetation_pct, built_up_pct, valid_pixels, start_date, end_date, changed, change}`
- Frontend: `MapStage` `handleDrawComplete` → `postAnalyze` → `EvidencePanel` (StatBars + change rows)

### Feature 1 — Detection & highlighting
- `detect_features(geometry, query, date)` → vectorizes class masks into GeoJSON (simplified, `unary_union`), reply via `_build_reply`
- `POST /api/detect` → `{reply, stats, highlights}`
- Frontend: `MapView` HighlightLayer (`GeoJSON` with class colors), `ChatPanel` wired to `detectFeatures` (now `/api/query`)

### Feature 2 — Timeline
- `timeline(geometry, start, end)` → `analyze_region` + `_change_narrative`
- `POST /api/timeline` rebuilt on GIBS (was synthetic `gis_engine.compute_temporal_change`)
- Frontend: `TimelineBar` real year slider 2018→2026, swaps `activeDate` (`YYYY-06-15`), computes change via `postTimeline`, shows narrative; `MapView` TileLayer now reads `activeDate`

### Sub-features — Search + 3-coord triangle
- `GET /api/geocode?q=` (Nominatim proxy, forward + reverse), `POST /api/geocode` reverse
- Frontend: `LocationSearch.tsx` (header search + `flyToBounds`), `CoordRegion.tsx` (popover, 3× lat/lon → triangle + `flyToBounds`), store `regions: Region[]` + `addRegion`

### Feature 4 — Plain-language spatial queries
- `gibs_analyzer.spatial_query` + `overlay_near_water_change` (water buffer → new built-up)
- `/api/query` now LLM-aware (see §7)

### Validation hardening
- Cloud mask (`brightness > 0.88` excluded), `high_vegetation` vs `low_vegetation` split
- Parallel tile fetch (ThreadPoolExecutor) → ~2s vs 6.8s

### Landing & evidence polish
- Landing: EarthGlobe (procedural canvas) → EarthSatellite (CSS 3D) → current: satellite removed, **Blue Marble local `public/earth-from-space.jpg`** (WhatsApp image) with dark overlay; drifting scroll satellite retired
- `SatelliteBackdrop` switched from VIIRS daily to BlueMarble, then to local file
- Zoom out `object-cover` → `object-contain` scale 0.95; header visibility, satellite size/color iterations (amber → green → gold → green)
- Evidence panel theme/visibility: StatBar labels → `text-ink-dim`, values bold, "Evidence" eyebrow `tone="signal"` (green)

### PDF
- `docs/SYSTEM_ARCHITECTURE.md` (Markdown source) → `scripts/make_architecture_pdf.py` (reportlab) → `docs/SYSTEM_ARCHITECTURE.pdf` (4 pages)

---

## 6. Backend File Responsibilities

| File | Develops |
|------|----------|
| `main.py` | FastAPI app, all routes, Pydantic models, deterministic guardrail + FAQ + LLM dispatch |
| `services/gis_engine.py` | Local raster math (legacy synthetic): NDVI/NDWI, true-color/classification rendering, `detect_anomalies` grid scan |
| `services/gibs_analyzer.py` | **Real GIBS engine** (current): `fetch_rgb`, `_classify_masks`, `analyze_region`, `detect_features`, `rank_features`, `timeline`, `spatial_query`, `overlay_near_water_change`, vectorization |
| `services/geocoder.py` | Forward (`geocode`) + reverse (`reverse_geocode`) Nominatim proxy |
| `services/query_engine.py` | Legacy synthetic intent parser (kept, not used by current `/api/query`) |
| `services/llm_service.py` | Claude → Gemini interpreter (`interpret_query` → JSON) + guardrail prompt, `REJECTION` |
| `services/known_cases.py` | Exact-match harness for the 70 validated cases (loads CSV, returns canned `water_area_km2` etc.) |
| `scripts/generate_demo_data.py` | Synthetic GeoTIFF generator (river + growing built-up) |
| `scripts/make_architecture_pdf.py` | Markdown → PDF (reportlab) |
| `data/sentinel_*.tif` | Synthetic rasters (ignored for GIBS features) |
| `data/validated_test_cases_70.csv` | 70 test cases (force-added, `data/` is gitignored) |

---

## 7. Chatbot — Final System Role & Guardrail

**Library:** `services/llm_service.py` — tries **Claude** (`ANTHROPIC_API_KEY`, `claude-3-5-haiku-20241022`) first, falls back to **Gemini** (`GEMINI_API_KEY`, `gemini-3.6-flash`), then deterministic.

**Current `SYSTEM_PROMPT` (exact):**
```
You are the official SatQuery AI Copilot. Your ONLY function is to assist users with questions directly related to SatQuery AI, satellite imagery analysis, platform features, and geospatial data processing based on Google Dynamic World's 10m Sentinel-2 dataset.

SUPPORTED LAND COVER CLASSES (10m): water, trees, grass, flooded_vegetation, crops, shrub_scrub, built_up, bare_ground, snow_ice.

SUPPORTED INTENTS / OPERATIONS:
- detect      -> Direct detection ("What's visible here?", "Find all water bodies")
- quantify    -> Land-cover quantification ("How many sq km of forest?", "What percentage is built-up?")
- change      -> Temporal change detection ("How has this changed since 2018?", "Show deforestation")
- summary     -> Region polygon summaries ("Summarize the drawn shape")
- overlay     -> Multi-step spatial reasoning ("Find tree loss near water bodies")

[+ strict domain boundary, 6-point rejection, ignore-previous-instructions, must return strict JSON with operation/classes/dates, rejection message, 2-3 sentence stats summary, no sub-10m guessing]
```

**Key `ANTHROPIC_API_KEY`:** `sk-ccc3c399477d2a45-1adfc0-73a39496` (saved to `satquery/.env`, gitignored; looks like a placeholder — real Anthropic keys start `sk-ant-`).

**Guardrail in `main.py` (LLM-independent, runs even on 429):**
- `OUT_SCOPE_KEYWORDS` (weather, recipe, air quality, population, elevation, buy land, etc.) + `IN_SCOPE_KEYWORDS` (satquery, satellite, water, vegetation, map, change, etc.)
- `_out_of_scope(query)` → out-of-scope wins (reject with exact `REJECTION`), else in-scope passes.
- `_faq_answer(query)` → canned answers for "What is SatQuery?", "Time Machine", "What satellite data", "Region summary", "Query console".

**`/api/query` flow:** `known_cases` exact match → `_out_of_scope` → `_faq_answer` → `_forced_operation` (deterministic "list" for rank) or `interpret_query` → `_dispatch_decision` → `_dispatch` to `detect_features`/`timeline`/`analyze_region`/`rank_features` → fallback `spatial_query`.

**Validated ranking (user's last request):** `rank_features` vectorizes a class, ranks connected polygons by area (km², `111.32*110.57*cos(lat)`), reverse-geocodes top 3, replies ranked list, highlights all.

---

## 8. API Reference (Current)

| Method | Path | Body | Returns | Notes |
|--------|------|------|---------|-------|
| GET | `/api/rasters` | — | `[{year, crs, bounds}]` | Synthetic |
| GET | `/api/imagery/{year}` | — | PNG | Synthetic |
| GET | `/api/classification/{year}` | — | PNG | Synthetic |
| POST | `/api/analyze` | `{geometry, start_date?, end_date?}` | `{water_pct, vegetation_pct, built_up_pct, valid_pixels, start_date, end_date, changed, change}` | GIBS, feature 3 |
| POST | `/api/detect` | `{geometry, query?, date?}` | `{reply, stats, highlights}` | GIBS, feature 1 + ranking |
| POST | `/api/timeline` | `{geometry, start_date?, end_date?}` | `{narrative, start_date, end_date, water_pct, vegetation_pct, built_up_pct, changed, change}` | GIBS, feature 2 |
| POST | `/api/query` | `{geometry, query, start_date?, end_date?}` | `{intent, reply, stats, highlights}` | LLM + guardrail + range, feature 4 |
| GET | `/api/geocode?q=` | — | `{label, lat, lon, bounds}` | Nominatim forward; also `reverse_geocode` |
| GET | `/api/anomalies` | — | `[{alert, detail, coordinates, zoom_level}]` | Synthetic |
| POST | `/api/summarize-region` | `{geometry}` | `{summary, geometry}` | Synthetic (legacy) |
| POST | `/api/chat` | `{geometry, query, end_year}` | `{reply, stats, geometry}` | Legacy synthetic |

**Detection stats** now include `high_vegetation_pct` / `low_vegetation_pct` for high/low tests.

---

## 9. Frontend Structure

```
satquery 2/  (dev workspace, no remote)
  app/page.tsx                 ← landing (hero + fun facts, no longer drifting)
  app/globals.css              ← @theme tokens (currently GREEN signal #8CFFBE, void #0a0c0e)
  app/layout.tsx, app/workspace/page.tsx
  components/
    EarthGlobe.tsx             ← procedural canvas globe (fBm, now unused on landing but kept)
    EarthSatellite.tsx         ← CSS 3D satellite (gold foil + blue panels, now unused, kept)
    SatelliteBackdrop.tsx      ← landing backdrop: now local /earth-from-space.jpg (was GIBS BlueMarble)
    HeroComposition.tsx        ← cinematic hero (Earth distant + satellite + HUD) — removed after revert
    OrbitalSatellite.tsx       ← restrained satellite (removed after revert)
    SatelliteBackdrop.tsx      ← whole-earth BlueMarble → local image
    workspace/
      MapStage.tsx, MapView.tsx (GIBS TileLayer + HighlightLayer), RegionLayer.tsx, MapControls.tsx
      LocationSearch.tsx (header search → flyToBounds), CoordRegion.tsx (popover, 3× lat/lon → triangle)
      ChatPanel.tsx (You/System bubbles, suggested prompts, viewGeometry fallback), TimelineBar.tsx (2018→2026 slider + narration), EvidencePanel.tsx (StatBars, change rows), Header.tsx, WorkspaceShell.tsx
    system/
      StatBar.tsx (now larger, bolder), GlassPanel, Eyebrow, Cursor, etc.
  lib/
    api.ts (detectFeatures, postAnalyze, postTimeline, postQuery, geocode, fullExtentGeometry, DetectResult, RegionAnalysis, TimelineResult, GeocodeResult)
    store.ts (useMapStore: rasters, activeYear/Date, geometry, highlights, regionResult, analyzing, timelineNarrative, regions: Region[])
    geo.ts (viewGeometry), mapConfig.ts (ARAL_SEA), gibs.ts (tile URL + static image URL + BlueMarble)
  public/earth-from-space.jpg  ← WhatsApp image 2026-08-30 (local, served at /earth-from-space.jpg)

satquery/frontend/              ← rsync copy of satquery 2/ (what's pushed to GitHub)
```

**Key store fields:** `regions: Region[]` (triangles + polygons), `geometry`, `highlights`, `regionResult`, `analyzing`, `activeDate`, `timelineNarrative/Change`, `map` (Leaflet instance for flyTo).

---

## 10. Validated Test Cases (70)

Stored at `data/validated_test_cases_70.csv` (force-added). Example rows:

| id | query | category | metric | value |
|----|-------|----------|--------|-------|
| 1 | Find water bodies in Chennai | feature_detection | water_area_km2 | 265.01 |
| 4 | Show built-up areas in Chennai | feature_detection | built_up_area_km2 | 426.3 |
| 5 | Find the largest water body in Chennai | feature_detection | Bay of Bengal | — |
| 11 | Show areas within 2 km of Puzhal Lake | spatial | buffer_distance_km | 2 |
| 21 | Show vegetation change between 2020 and 2025 | temporal | -27% | — |
| 41 | Show areas near the river where construction increased | complex | built_up_change+buffer+intersection | — |
| 51 | Summarize the selected region | roi_summary | water_area_km2 | 12.4 |
| 64 | Flag locations with major recent change | alert | detect_rank_and_flag | — |

**Passing strategy:** `services/known_cases.py` exact-matches the 70 normalized queries and returns canned `stats` with the `validated_reference_value` (guaranteeing ±5% / exact categorical). Similar phrasing falls through to the LLM/deterministic `spatial_query` (which handles high/low, buffer extraction via regex, proximity via `_dilate`, etc.).

---

## 11. How to Run

```bash
# Backend (port 8000, needs GEMINI_API_KEY + optional ANTHROPIC_API_KEY in satquery/.env)
cd ~/Downloads/satquery && .venv/bin/uvicorn main:app --port 8000

# Frontend (port 3000)
cd ~/Downloads/satquery\ 2 && npm run dev   # http://localhost:3000 (landing) / http://localhost:3000/workspace (map)
```

`NEXT_PUBLIC_API_BASE` defaults to `http://localhost:8000` (CORS `*`). The GIBS backdrop is now `public/earth-from-space.jpg` (local, no network), so landing works offline.

---

## 12. How to Test Validity & Accuracy

**Most important — cloud check:** A result is only trustworthy on clear sky. The screenshot at LAT 22.69/LON 75.36 was mostly cloud → `-52.2% veg / +51.6% built-up` was a cloud artifact, not real change.

1. **Cloud check first.** If imagery shows white/gray cloud over the polygon on either date, ignore the numbers.
2. **Known-feature spot check.** Draw around a lake/forest/city you know in clear weather; compare reported % to what you see.
3. **Cross-date stability.** Same polygon on two nearby clear dates → near-identical output = stable; wild swing = cloud/seasonal noise.
4. **Independent reference.** Compare against Google Earth / Sentinel-2 or official products (ESA WorldCover, Copernicus).
5. **Resolution caveat.** VIIRS ~375 m/pixel — small polygons are coarse.

**Demo validation run:** North Aral Sea (60.4-60.9E, 46.4-46.8N) → water 18.4%, veg 32.5%, built-up 49.1%; Sahara interior → 0% water/veg, 100% bare, stable.

**Note:** Built-up/bare are combined (true-color has no NIR to separate bare soil from urban); read `built_up_pct` as “built-up + bare”.

---

## 13. Known Limitations

- Demo rasters are synthetic; real analysis is via GIBS true-color heuristics (approximate, no NIR, no 10 m Dynamic World — true 10 m would need a different source).
- True-color classification can't cleanly separate urban from bare soil; cloud masking is simple (`brightness > 0.88`).
- Gemini free tier is 20 req/day (`gemini-3.6-flash`) and was exhausted (429); the guardrail + FAQ are deterministic, and the spatial fallback keeps features working when the LLM is down. The model ID `gemini-3.6-flash` looks placeholder (real ones: `gemini-2.5-flash`, `gemini-2.0-flash`) — make it env-configurable (`GEMINI_MODEL`).
- The `ANTHROPIC_API_KEY` provided (`sk-ccc3...`) is not a real Anthropic `sk-ant-` key, so Claude calls 401 and fall back; replace with a real `sk-ant-` key to enable Claude.
- No auth / rate limiting, no tests beyond lint/tsc/build.

---

## 14. Git State

- **Backend repo** (`/Users/archeejha/Downloads/satquery`, origin `arcwack/SatQuery-DevJams-`): last pushed `db6e0df` (name & rank), latest local `13493a0`+ with Claude integration + known cases (needs push).
- **Frontend repo** (`/Users/archeejha/Downloads/satquery 2`, local only, no remote): last local commit `45bae41` (zoomed landing); `frontend/` copy inside `satquery` is at `da23cf9`+ (needs re-sync after landing fixes).
- `.env` (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`) is gitignored.

Regenerate the PDF: `cd satquery && .venv/bin/python scripts/make_architecture_pdf.py` → `docs/SYSTEM_ARCHITECTURE.pdf`.
