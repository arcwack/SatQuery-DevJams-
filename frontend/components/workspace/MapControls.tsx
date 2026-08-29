"use client";

import { Plus, Minus } from "lucide-react";
import { useMap } from "react-leaflet";

/**
 * Replaces Leaflet's default L.Control.Zoom (light theme, boxy) with two
 * buttons matching the rest of the instrument chrome. Rendered as a plain
 * child of <MapContainer> — react-leaflet mounts children directly inside
 * the map's own DOM node, so useMap() here just reads the same map
 * instance MapView created, no prop drilling needed.
 *
 * z-[1000] matches Leaflet's own .leaflet-control-container so this sits
 * above tiles, vector overlays, and markers regardless of pane order.
 */
export function MapControls() {
  const map = useMap();

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-[1000] flex flex-col rounded-hard border border-line bg-void-2/80 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        data-cursor="action"
        aria-label="Zoom in"
        className="pointer-events-auto flex h-7 w-7 items-center justify-center text-ink-dim transition-colors hover:bg-void-3 hover:text-ink"
      >
        <Plus size={14} />
      </button>
      <div className="h-px w-full bg-line" aria-hidden="true" />
      <button
        type="button"
        onClick={() => map.zoomOut()}
        data-cursor="action"
        aria-label="Zoom out"
        className="pointer-events-auto flex h-7 w-7 items-center justify-center text-ink-dim transition-colors hover:bg-void-3 hover:text-ink"
      >
        <Minus size={14} />
      </button>
    </div>
  );
}
