/**
 * Typed client for the SatQuery FastAPI backend.
 *
 * The backend runs separately (default http://localhost:8000) and exposes:
 *   GET  /api/rasters                 -> available years + extents
 *   GET  /api/imagery/{year}          -> true-color PNG (full extent)
 *   GET  /api/classification/{year}   -> land-cover overlay PNG (RGBA)
 *   POST /api/query                   -> intent dispatch + highlights + reply
 *   POST /api/timeline                -> change detection narrative + diff
 *   POST /api/summarize-region        -> region stats + narrative
 *   GET  /api/anomalies               -> computed anomaly alerts
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface RasterInfo {
  year: number;
  crs: string;
  bounds: Bounds;
}

export interface LandCoverStats {
  veg_pct: number;
  water_pct: number;
  built_up_pct: number;
  valid_pixels: number;
}

export interface ClassChange {
  start_pct: number;
  end_pct: number;
  net_change_pct: number;
}

export interface ChangeDiff {
  start_year: number;
  end_year: number;
  vegetation: ClassChange;
  water: ClassChange;
  built_up: ClassChange;
}

export interface GeoJSONGeometry {
  type: string;
  coordinates: unknown;
  crs?: unknown;
}

export interface HighlightFeature {
  type: "Feature";
  properties: { class: string };
  geometry: GeoJSONGeometry;
}

export interface HighlightFeatureCollection {
  type: "FeatureCollection";
  features: HighlightFeature[];
}

export interface QueryResult {
  reply: string;
  intent: string;
  stats: Record<string, unknown>;
  highlights: HighlightFeatureCollection;
}

export interface TimelineResult {
  narrative: string;
  diff: ChangeDiff;
  geometry: GeoJSONGeometry;
}

export interface RegionSummary {
  summary: LandCoverStats & { narrative: string };
  geometry: GeoJSONGeometry;
}

export interface Anomaly {
  alert: string;
  detail: string;
  coordinates: [number, number];
  zoom_level: number;
}

export interface QueryBody {
  geometry: GeoJSONGeometry;
  query?: string;
  start_year?: number;
  end_year?: number;
}

export function imageryUrl(year: number): string {
  return `${API_BASE}/api/imagery/${year}`;
}

export function classificationUrl(year: number): string {
  return `${API_BASE}/api/classification/${year}`;
}

/** Build a Polygon geometry covering the full extent of the latest raster. */
export function fullExtentGeometry(rasters: RasterInfo[]): GeoJSONGeometry | null {
  const latest = rasters[rasters.length - 1];
  if (!latest) return null;
  const { west, south, east, north } = latest.bounds;
  return {
    type: "Polygon",
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  };
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      data && typeof data.detail === "string" ? data.detail : `Request failed (${res.status})`;
    throw new Error(detail);
  }
  return data as T;
}

export function fetchRasters(): Promise<RasterInfo[]> {
  return getJSON<RasterInfo[]>("/api/rasters");
}

export function fetchAnomalies(): Promise<Anomaly[]> {
  return getJSON<Anomaly[]>("/api/anomalies");
}

export function postQuery(body: QueryBody): Promise<QueryResult> {
  return postJSON<QueryResult>("/api/query", body);
}

export function postTimeline(body: QueryBody): Promise<TimelineResult> {
  return postJSON<TimelineResult>("/api/timeline", body);
}

export function postSummarize(body: QueryBody): Promise<RegionSummary> {
  return postJSON<RegionSummary>("/api/summarize-region", body);
}
