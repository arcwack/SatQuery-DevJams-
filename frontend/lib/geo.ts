import { useMapStore } from "./store";
import type { GeoJSONGeometry } from "./api";

/** Build a Polygon covering the current map viewport (used when nothing is drawn). */
export function viewGeometry(): GeoJSONGeometry | null {
  const map = useMapStore.getState().map;
  if (!map) return null;
  const b = map.getBounds();
  const w = b.getWest();
  const s = b.getSouth();
  const e = b.getEast();
  const n = b.getNorth();
  return {
    type: "Polygon",
    coordinates: [
      [
        [w, s],
        [e, s],
        [e, n],
        [w, n],
        [w, s],
      ],
    ],
  };
}
