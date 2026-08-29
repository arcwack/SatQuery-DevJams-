"use client";

import { useState } from "react";
import { Polygon, Polyline, CircleMarker, useMapEvents } from "react-leaflet";
import type { LatLngTuple } from "@/lib/mapConfig";

export type Region = {
  id: string;
  positions: LatLngTuple[];
  label?: string;
};

type RegionLayerProps = {
  /** Committed regions to highlight — e.g. a past analysis result AOI. */
  regions?: Region[];
  /** When true, clicks on the map place polygon vertices. */
  drawMode?: boolean;
  onDrawComplete?: (positions: LatLngTuple[]) => void;
  onDrawCancel?: () => void;
};

const SIGNAL = "#d98f4e";

/**
 * Two responsibilities, both scoped for reuse once Phase 4+ needs them:
 *
 * 1. Render committed regions as read-only highlight polygons.
 * 2. When `drawMode` is on: click to place a vertex, double-click to
 *    close the ring, Escape to cancel. This is a working baseline, not
 *    a polished drawing tool — it's the seam a dedicated editor
 *    (handles, snapping, undo) replaces later without changing how
 *    MapStage or MapView talk to it (same onDrawComplete contract).
 */
export function RegionLayer({
  regions = [],
  drawMode = false,
  onDrawComplete,
  onDrawCancel,
}: RegionLayerProps) {
  const [draft, setDraft] = useState<LatLngTuple[]>([]);

  useMapEvents({
    click(e) {
      if (!drawMode) return;
      setDraft((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
    },
    dblclick(e) {
      if (!drawMode) return;
      e.originalEvent.preventDefault();
      // A dblclick is preceded by two click events at ~the same spot;
      // drop those before treating the ring as finished.
      const cleaned = draft.length > 2 ? draft.slice(0, -2) : draft;
      if (cleaned.length >= 3) {
        onDrawComplete?.(cleaned);
        setDraft([]);
      } else {
        setDraft(cleaned);
      }
    },
    keydown(e) {
      if (!drawMode) return;
      if (e.originalEvent.key === "Escape") {
        setDraft([]);
        onDrawCancel?.();
      }
    },
  });

  return (
    <>
      {regions.map((region) => (
        <Polygon
          key={region.id}
          positions={region.positions}
          pathOptions={{
            color: SIGNAL,
            weight: 1.5,
            fillColor: SIGNAL,
            fillOpacity: 0.08,
          }}
        />
      ))}

      {drawMode && draft.length > 0 && (
        <>
          <Polyline
            positions={draft}
            pathOptions={{ color: SIGNAL, weight: 1.5, dashArray: "4 4" }}
          />
          {draft.map((point, i) => (
            <CircleMarker
              key={`${point[0]}-${point[1]}-${i}`}
              center={point}
              radius={3}
              pathOptions={{ color: SIGNAL, fillColor: SIGNAL, fillOpacity: 1 }}
            />
          ))}
        </>
      )}
    </>
  );
}
