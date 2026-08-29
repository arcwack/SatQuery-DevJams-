export type LatLngTuple = [number, number];

export type DemoLocation = {
  id: string;
  label: string;
  center: LatLngTuple;
  zoom: number;
};

/**
 * Named locations the workspace can jump to. Only one entry today — the
 * fixed Phase 3 demo location — but a later phase (chat query results,
 * a location search) will push new entries here and fly the map to them.
 * Keeping this as a keyed registry now avoids a reshape later.
 */
export const LOCATIONS: Record<string, DemoLocation> = {
  "aral-sea": {
    id: "aral-sea",
    label: "Aral Sea",
    center: [44.9, 60.0],
    zoom: 7,
  },
};

export const ARAL_SEA = LOCATIONS["aral-sea"];

export const MAP_DEFAULTS = {
  center: ARAL_SEA.center,
  zoom: ARAL_SEA.zoom,
  minZoom: 3,
  maxZoom: 14,
} as const;
