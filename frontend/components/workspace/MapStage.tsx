"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { Map as LeafletMap } from "leaflet";
import { Crosshair, RotateCcw } from "lucide-react";
import { MAP_DEFAULTS, type LatLngTuple } from "@/lib/mapConfig";
import { useMapStore } from "@/lib/store";
import { postAnalyze } from "@/lib/api";
/**
 * Leaflet touches `window` on import, so MapView must never render on the
 * server. `ssr: false` is only legal from a Client Component — this file
 * carries "use client" for exactly that reason (it didn't need it before
 * Phase 3, since it had no hooks or browser-only imports).
 */
const MapView = dynamic(() => import("./MapView").then((mod) => mod.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-void">
      <span className="font-mono text-micro uppercase tracking-[0.14em] text-ink-faint">
        Loading imagery layer…
      </span>
    </div>
  ),
});

type MapStageProps = {
  children?: ReactNode;
};

/**
 * The hero. Fills all remaining space once the chat dock and timeline
 * are accounted for. Owns the map instance ref, draw-mode state, and
 * the coordinate readout — MapView stays a dumb rendering surface so a
 * future timeline/location-search phase can drive it from up here
 * without touching MapView itself.
 */
export function MapStage({ children }: MapStageProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [center, setCenter] = useState<LatLngTuple>(MAP_DEFAULTS.center);
  const regions = useMapStore((s) => s.regions);
  const addRegion = useMapStore((s) => s.addRegion);

  const handleReady = useCallback((map: LeafletMap) => {
    mapRef.current = map;
  }, []);

  const handleViewChange = useCallback((next: LatLngTuple) => {
    setCenter(next);
  }, []);

  const handleResetView = useCallback(() => {
    mapRef.current?.flyTo(MAP_DEFAULTS.center, MAP_DEFAULTS.zoom, { duration: 0.6 });
  }, []);

  const handleDrawComplete = useCallback((positions: LatLngTuple[]) => {
    addRegion({ id: `region-${Date.now()}`, positions });
    setDrawMode(false);

    const ring = positions.map(([lat, lng]) => [lng, lat]);
    ring.push(ring[0]);
    const geometry = { type: "Polygon", coordinates: [ring] };

    useMapStore.getState().setGeometry(geometry);
    useMapStore.getState().setAnalyzing(true);
    postAnalyze({ geometry })
      .then((result) => useMapStore.getState().setRegionResult(result))
      .catch(() => useMapStore.getState().setRegionResult(null))
      .finally(() => useMapStore.getState().setAnalyzing(false));
  }, [addRegion]);

  const handleDrawCancel = useCallback(() => {
    setDrawMode(false);
  }, []);

  return (
    <div
      data-cursor={drawMode ? "draw" : "map"}
      className="relative flex-1 overflow-hidden bg-void"
    >
      {/* Coordinate grid — spatial reference, floats above the imagery */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--color-grid) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* Restrained vignette — void deepens toward the edges, no glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 65% at 50% 45%, transparent 55%, var(--color-void) 100%)",
        }}
      />

      {/* Corner brackets — viewfinder framing */}
      {(["top-4 left-4", "top-4 right-4", "bottom-4 left-4", "bottom-4 right-4"] as const).map(
        (pos) => {
          const isTop = pos.startsWith("top");
          const isLeft = pos.includes("left");
          return (
            <div
              key={pos}
              aria-hidden="true"
              className={`pointer-events-none absolute z-10 ${pos} h-5 w-5 opacity-30`}
              style={{
                borderTop: isTop ? "1px solid var(--color-signal-dim)" : undefined,
                borderBottom: !isTop ? "1px solid var(--color-signal-dim)" : undefined,
                borderLeft: isLeft ? "1px solid var(--color-signal-dim)" : undefined,
                borderRight: !isLeft ? "1px solid var(--color-signal-dim)" : undefined,
              }}
            />
          );
        },
      )}

      {/* Map surface — its own stacking context (z-0) so Leaflet's internal
          pane z-indices (up to ~700) never fight the chrome above it. */}
      <div className="absolute inset-0 z-0">
        <MapView
          drawMode={drawMode}
          regions={regions}
          onReady={handleReady}
          onViewChange={handleViewChange}
          onDrawComplete={handleDrawComplete}
          onDrawCancel={handleDrawCancel}
        />
      </div>

      {/* Toolbar overlay */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-1 rounded-hard border border-line bg-void-2/80 p-1 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setDrawMode((v) => !v)}
          data-cursor="action"
          aria-label={drawMode ? "Cancel region draw" : "Draw region"}
          aria-pressed={drawMode}
          className={`flex h-7 w-7 items-center justify-center rounded-hard transition-colors ${
            drawMode ? "bg-signal-dim/40 text-signal" : "text-ink-faint hover:text-ink"
          }`}
        >
          <Crosshair size={14} />
        </button>
        <div className="h-4 w-px bg-line" aria-hidden="true" />
        <button
          type="button"
          onClick={handleResetView}
          data-cursor="action"
          aria-label="Reset view"
          className="flex h-7 w-7 items-center justify-center rounded-hard text-ink-faint transition-colors hover:text-ink"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Coordinate readout — live, tracks map center on moveend */}
      <div className="absolute bottom-4 left-4 z-20 rounded-hard border border-line bg-void-2/80 px-2.5 py-1.5 backdrop-blur-sm">
        <span data-numeric="true" className="font-mono text-micro tracking-[0.06em] text-ink-faint">
          LAT {center[0].toFixed(4)}° &nbsp; LON {center[1].toFixed(4)}°
        </span>
      </div>

      {/* Draw-mode hint — only shown while actively placing vertices */}
      {drawMode && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-hard border border-signal-dim bg-void-2/90 px-3 py-1.5">
          <span className="font-mono text-micro uppercase tracking-[0.12em] text-signal">
            Click to place vertices · double-click to close · Esc to cancel
          </span>
        </div>
      )}

      {children}
    </div>
  );
}
