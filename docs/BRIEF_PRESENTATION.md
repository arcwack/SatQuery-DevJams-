# SatQuery — Talk to the Earth. Understand the Change.

> **AI-assisted geospatial console for satellite imagery. Plain language → map highlights + answers.**

---

## 1. Problem & Vision

Satellite archives (Sentinel-2, 10 m) are rich but require GIS expertise. **SatQuery** lets anyone *talk* to the Earth: ask “what’s visible here?”, draw a region, scrub time, and get instant land-cover answers — no GIS syntax.

---

## 2. Five Core Features

| # | User Action | What Happens |
|---|-------------|--------------|
| **1** | *“What’s visible here?” / “Find water bodies”* | **Detect & highlight** — vectorized polygons (water / vegetation / built-up) overlay the map + text reply |
| **2** | **Timeline 2018 → 2026** slider | Swaps NASA GIBS VIIRS imagery; AI narrates change (e.g. *vegetation -27%, built-up +41%*) |
| **3** | **Draw polygon** (or 3-point triangle) | **Region summary** — `water / vegetation / built-up %` + `changed?` flag via GIBS RGB classification |
| **4** | *“Areas near the river where construction increased”* | **Plain-language spatial query** — LLM parses intent (`detect/quantify/change/overlay/list`) → spatial ops (buffer, intersection) |
| **5** | **Proactive alerts** | Flags unusual recent change; jump to before/after |

Bonus: **Split-screen swipe (2021 vs 2026)** — draggable curtain (`clip: rect`) compares two dates; **One-click PDF** — dark aerospace A4 report.

---

## 3. Live Demo Flow (60 s)

1. **Landing** — 3D Earth (`EarthScene3D` + `LiveCoordinates`) → **Enter workspace**
2. **Search** `Chennai` (Nominatim) or **Triangle** `Lat1 Lon1 …` → map flies, draws polygon
3. **Chat** “Find water bodies” → highlights Bay of Bengal
4. **Draw region** → Evidence panel shows bars + `CHANGE 2021→2026`
5. **Timeline** scrub + **Split** toggle → curtain compare
6. **Export** `📄 EXPORT EVIDENCE REPORT` → `SatQuery_Intelligence_Report_2026-08-31.pdf`

---

## 4. Tech Stack

| Layer | Choice |
|-------|--------|
| **Frontend** | Next.js 16 (App Router, React 19, TS), Tailwind 4, Zustand, Framer Motion |
| **Map** | Leaflet + react-leaflet, NASA GIBS WMTS (VIIRS TrueColor, BlueMarble) |
| **Backend** | FastAPI + Uvicorn, Rasterio/Shapely, Pillow, NumPy |
| **AI** | Claude 3.5 Haiku → Gemini 3.6 Flash fallback, strict guardrail + 70-case harness |
| **Export** | `jspdf` + `html2canvas-pro` (lab-color safe) |
| **Data** | GIBS live tiles + synthetic 50×50 GeoTIFFs for fallback |

---

## 5. Architecture (one glance)

```
Next.js ( :3000 )  →  FastAPI ( :8000 )  →  GIBS / Dynamic World
 MapStage/MapView  ←→  /api/query, /detect, /timeline, /analyze, /geocode, /places
 ChatPanel/Timeline ←→  llm_service (Claude→Gemini) + gibs_analyzer (RGB → classes)
 EvidencePanel      ←→  regionResult {water,vegetation,built_up, change}
```

State: `lib/store.ts` (`geometry`, `highlights`, `splitEnabled/position`, `regionResult`). One Leaflet map — split via `clip: rect`, never re-inits.

---

## 6. What’s Built & Validated

- **70 validated test cases** (`data/validated_test_cases_70.csv` via `known_cases.py` — e.g. *Chennai water 265 km²* ±5%)
- **Cloud mask** (`brightness>0.88`), **high/low veg split**, **parallel tile fetch** (~2 s)
- **CORS-safe PDF** with map snapshot, metrics bars, AI narrative
- **Mobile + desktop** (pointer events, `flyToBounds`, no memory leaks)

---

## 7. Run Locally

```bash
# Backend
cd satquery && .venv/bin/uvicorn main:app --port 8000  # needs GEMINI_API_KEY

# Frontend
cd "satquery 2" && npm run dev  # http://localhost:3000 → /workspace
```

---

## 8. Known Limits & Next

- **No NIR** → built-up + bare combined; cloud mask simple; VIIRS ~375 m (coarse for tiny polygons)
- **Next:** 10 m Dynamic World tiles, auth/rate-limit, vector tile caching, multi-region compare

---

**Tagline:** *Talk to the earth. Understand the change.* — Vercel-minimal, void `#0A0C0E` + signal `#8CFFBE`.

*Prepared for DevJams / presentation — 5 min pitch.*
