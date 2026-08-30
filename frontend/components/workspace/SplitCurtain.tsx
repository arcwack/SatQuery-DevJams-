"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import { useMapStore } from "@/lib/store";
import { getGibsTileUrl, DEFAULT_GIBS_LAYER_ID, type GibsLayerId } from "@/lib/gibs";
import type * as Leaflet from "leaflet";

const AVAILABLE_YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;

/**
 * SplitLayers — uses imperative L.tileLayer + rect clipping (mirrors
 * leaflet-side-by-side's proven technique) instead of pane clip-path
 * which was blank due to pane transform + percent mismatch.
 * Keeps single map so pan/zoom/polygons stay synced.
 */
export function SplitLayers({ gibsLayerId = DEFAULT_GIBS_LAYER_ID }: { gibsLayerId?: GibsLayerId }) {
  const map = useMap();
  const leftDate = useMapStore((s) => s.splitLeftDate);
  const rightDate = useMapStore((s) => s.splitRightDate);
  const position = useMapStore((s) => s.splitPosition);
  const enabled = useMapStore((s) => s.splitEnabled);

  const leftLayerRef = useRef<Leaflet.TileLayer | null>(null);
  const rightLayerRef = useRef<Leaflet.TileLayer | null>(null);

  // Helper to compute and apply rect clips (same math as leaflet-side-by-side)
  const updateClip = useCallback(() => {
    if (!enabled) return;
    const leftLayer = leftLayerRef.current;
    const rightLayer = rightLayerRef.current;
    if (!leftLayer || !rightLayer) return;
    const mapSize = map.getSize();
    if (!mapSize.x) return;
    const nw = map.containerPointToLayerPoint([0, 0]);
    const se = map.containerPointToLayerPoint(mapSize);
    // position is 0-100 percent across the map container
    const clipX = nw.x + (mapSize.x * position) / 100;
    const clipLeft = `rect(${nw.y}px, ${clipX}px, ${se.y}px, ${nw.x}px)`;
    const clipRight = `rect(${nw.y}px, ${se.x}px, ${se.y}px, ${clipX}px)`;
    const leftContainer = (leftLayer as any).getContainer?.();
    const rightContainer = (rightLayer as any).getContainer?.();
    if (leftContainer) leftContainer.style.clip = clipLeft;
    if (rightContainer) rightContainer.style.clip = clipRight;
  }, [map, enabled, position]);

  // Create / update layers
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled) return;
      if (!enabled) {
        // Remove split layers and reset clips
        if (leftLayerRef.current) {
          try {
            const c = (leftLayerRef.current as any).getContainer?.();
            if (c) c.style.clip = "";
          } catch {}
          try { map.removeLayer(leftLayerRef.current); } catch {}
          leftLayerRef.current = null;
        }
        if (rightLayerRef.current) {
          try {
            const c = (rightLayerRef.current as any).getContainer?.();
            if (c) c.style.clip = "";
          } catch {}
          try { map.removeLayer(rightLayerRef.current); } catch {}
          rightLayerRef.current = null;
        }
        return;
      }

      const commonOpts: Leaflet.TileLayerOptions = {
        tileSize: 256,
        maxNativeZoom: 9,
        noWrap: true,
        bounds: L.latLngBounds([
          [-85.0511, -179],
          [85.0511, 179],
        ]),
        attribution: "Imagery © NASA EOSDIS GIBS",
      };

      const leftUrl = getGibsTileUrl(gibsLayerId, leftDate);
      const rightUrl = getGibsTileUrl(gibsLayerId, rightDate);

      if (!leftLayerRef.current) {
        const layer = L.tileLayer(leftUrl, commonOpts).addTo(map);
        // Ensure split layers sit just above base tilePane (base is at 200)
        // TileLayer pane is tilePane by default (zIndex 200), we bump via container zIndex
        leftLayerRef.current = layer;
        // Force initial clip after layer container exists (next frame)
        setTimeout(updateClip, 0);
      } else {
        leftLayerRef.current.setUrl(leftUrl);
        setTimeout(updateClip, 0);
      }

      if (!rightLayerRef.current) {
        const layer = L.tileLayer(rightUrl, commonOpts).addTo(map);
        rightLayerRef.current = layer;
        setTimeout(updateClip, 0);
      } else {
        rightLayerRef.current.setUrl(rightUrl);
        setTimeout(updateClip, 0);
      }

      // Ensure base stays behind (tilePane 200, split layers also 200 but added after -> on top)
      // Clip will be applied via updateClip
    })();
    return () => { cancelled = true; };
  }, [map, enabled, gibsLayerId, leftDate, rightDate, updateClip]);

  // Re-clip on position change and map moves (pan/zoom)
  useEffect(() => {
    if (!enabled) return;
    updateClip();
    map.on("move", updateClip);
    return () => { map.off("move", updateClip); };
  }, [map, enabled, position, updateClip]);

  // Also re-clip when dates change (layer URL update)
  useEffect(() => {
    if (!enabled) return;
    const id = setTimeout(updateClip, 50);
    return () => clearTimeout(id);
  }, [leftDate, rightDate, enabled, updateClip]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (leftLayerRef.current) {
        try { map.removeLayer(leftLayerRef.current); } catch {}
        leftLayerRef.current = null;
      }
      if (rightLayerRef.current) {
        try { map.removeLayer(rightLayerRef.current); } catch {}
        rightLayerRef.current = null;
      }
    };
  }, [map]);

  return null;
}

/**
 * Visual divider + badges overlay. Rendered above the map canvas (z-20),
 * handles pointer drag to update splitPosition in the store. Mouse + touch
 * via Pointer Events + setPointerCapture for smooth desktop/mobile.
 */
export function SplitSliderOverlay() {
  const enabled = useMapStore((s) => s.splitEnabled);
  const position = useMapStore((s) => s.splitPosition);
  const leftDate = useMapStore((s) => s.splitLeftDate);
  const rightDate = useMapStore((s) => s.splitRightDate);
  const leftYear = useMapStore((s) => s.splitLeftYear);
  const rightYear = useMapStore((s) => s.splitRightYear);
  const setPosition = useMapStore((s) => s.setSplitPosition);
  const setLeftYear = useMapStore((s) => s.setSplitLeftYear);
  const setRightYear = useMapStore((s) => s.setSplitRightYear);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(pct);
  }, [setPosition]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch {}
    updateFromClientX(e.clientX);
  }, [updateFromClientX]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  }, [updateFromClientX]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    draggingRef.current = false;
    try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch {}
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); setPosition(position - 2); }
    if (e.key === "ArrowRight") { e.preventDefault(); setPosition(position + 2); }
  }, [position, setPosition]);

  if (!enabled) return null;

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {/* Year pickers — dark glass, interactive */}
      <div className="pointer-events-auto absolute left-3 top-3 flex items-center gap-2 rounded-hard border border-line bg-[#05070A]/85 px-2.5 py-1.5 backdrop-blur-md sm:left-4 sm:top-4">
        <span className="font-mono text-micro uppercase tracking-[0.12em] text-ink-faint">L</span>
        <select
          value={leftYear}
          onChange={(e) => setLeftYear(Number(e.target.value))}
          data-cursor="action"
          className="bg-transparent font-mono text-micro font-medium uppercase tracking-[0.08em] text-ink focus:outline-none"
          aria-label="Left comparison year"
        >
          {AVAILABLE_YEARS.map((y) => (
            <option key={y} value={y} className="bg-[#05070A]">{y}</option>
          ))}
        </select>
        <span className="font-mono text-micro uppercase tracking-[0.12em] text-signal hidden sm:inline">{leftDate} (Baseline)</span>
        <span className="font-mono text-micro uppercase tracking-[0.12em] text-signal sm:hidden">(Baseline)</span>
      </div>
      <div className="pointer-events-auto absolute right-3 top-3 flex items-center gap-2 rounded-hard border border-line bg-[#05070A]/85 px-2.5 py-1.5 backdrop-blur-md sm:right-4 sm:top-4">
        <span className="font-mono text-micro uppercase tracking-[0.12em] text-ink-faint">R</span>
        <select
          value={rightYear}
          onChange={(e) => setRightYear(Number(e.target.value))}
          data-cursor="action"
          className="bg-transparent font-mono text-micro font-medium uppercase tracking-[0.08em] text-ink focus:outline-none"
          aria-label="Right comparison year"
        >
          {AVAILABLE_YEARS.map((y) => (
            <option key={y} value={y} className="bg-[#05070A]">{y}</option>
          ))}
        </select>
        <span className="font-mono text-micro uppercase tracking-[0.12em] text-signal hidden sm:inline">{rightDate} (Current)</span>
        <span className="font-mono text-micro uppercase tracking-[0.12em] text-signal sm:hidden">(Current)</span>
      </div>

      {/* Vertical curtain line */}
      <div
        className="absolute top-0 bottom-0 w-px bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_0_14px_rgba(140,255,190,0.45)]"
        style={{ left: `${position}%` }}
        aria-hidden="true"
      />

      {/* Draggable handle — centered on the curtain */}
      <div
        role="slider"
        aria-label="Split position"
        aria-valuemin={5}
        aria-valuemax={95}
        aria-valuenow={Math.round(position)}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="pointer-events-auto absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-line-bright bg-[#05070A]/95 text-signal shadow-[0_2px_10px_rgba(0,0,0,0.6),0_0_0_1px_rgba(140,255,190,0.3)] backdrop-blur-md transition-colors hover:border-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal cursor-ew-resize touch-none select-none"
        style={{ left: `${position}%` }}
      >
        <span aria-hidden="true" className="font-mono text-small leading-none">↔</span>
      </div>

      {/* Invisible drag surface across the map for easier grabbing */}
      <div
        className="pointer-events-auto absolute inset-y-0 -translate-x-1/2 touch-none"
        style={{ left: `${position}%`, width: "56px", cursor: "ew-resize" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        aria-hidden="true"
      />
    </div>
  );
}
