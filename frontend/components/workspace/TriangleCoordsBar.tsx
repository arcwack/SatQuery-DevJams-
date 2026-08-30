"use client";

import { useState } from "react";
import { Triangle } from "lucide-react";
import { useMapStore } from "@/lib/store";

type Row = { lat: string; lng: string };

/**
 * Inline 3-point coordinate bar — rendered directly beside the search bar
 * in the header. Takes 3 latitude + 3 longitude values, draws a triangular
 * region and flies the map to its bounds (zoom out → zoom in).
 */
export function TriangleCoordsBar() {
  const [rows, setRows] = useState<Row[]>([
    { lat: "", lng: "" },
    { lat: "", lng: "" },
    { lat: "", lng: "" },
  ]);
  const [err, setErr] = useState("");

  const set = (i: number, field: keyof Row, v: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: v } : r)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const positions = rows.map((r) => [+r.lat, +r.lng] as [number, number]);
    if (positions.some((p) => Number.isNaN(p[0]) || Number.isNaN(p[1]))) {
      setErr("Enter 3 valid Lat/Lon pairs");
      return;
    }
    // Basic range validation
    if (positions.some((p) => p[0] < -90 || p[0] > 90 || p[1] < -180 || p[1] > 180)) {
      setErr("Lat -90..90, Lon -180..180");
      return;
    }
    setErr("");

    const addRegion = useMapStore.getState().addRegion;
    const setGeometry = useMapStore.getState().setGeometry;
    const id = `tri-${Date.now()}`;
    addRegion({ id, positions });

    const ring = positions.map(([lat, lng]) => [lng, lat]);
    ring.push(ring[0]);
    setGeometry({ type: "Polygon", coordinates: [ring] });

    const map = useMapStore.getState().map;
    const lats = positions.map((p) => p[0]);
    const lngs = positions.map((p) => p[1]);
    // flyToBounds gives the zoom-out → zoom-in animation
    map?.flyToBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { duration: 1.2, maxZoom: 12, padding: [24, 24] },
    );
  };

  const inputCls =
    "w-[72px] rounded-hard border border-line bg-void-3/60 px-1.5 py-1 text-center font-mono text-[11px] text-ink placeholder:text-ink-faint focus:border-signal-dim focus:outline-none sm:w-[76px]";

  return (
    <form onSubmit={submit} className="flex items-center gap-1.5">
      <div className="hidden items-center gap-1 xl:flex">
        <Triangle size={12} className="text-signal" />
        <span className="font-mono text-micro uppercase tracking-[0.1em] text-ink-faint">
          Triangle
        </span>
      </div>

      <div className="flex items-center gap-1">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-0.5">
            <input
              value={row.lat}
              onChange={(e) => { set(i, "lat", e.target.value); setErr(""); }}
              placeholder={`Lat${i + 1}`}
              aria-label={`Latitude ${i + 1}`}
              className={inputCls}
            />
            <input
              value={row.lng}
              onChange={(e) => { set(i, "lng", e.target.value); setErr(""); }}
              placeholder={`Lon${i + 1}`}
              aria-label={`Longitude ${i + 1}`}
              className={inputCls}
            />
            {i < 2 && <span className="mx-0.5 text-ink-faint">·</span>}
          </div>
        ))}
      </div>

      <button
        type="submit"
        data-cursor="action"
        className="rounded-hard border border-signal-dim bg-signal/15 px-2.5 py-1 font-mono text-micro font-semibold uppercase tracking-[0.1em] text-signal transition-colors hover:bg-signal hover:text-void"
      >
        Go
      </button>

      {err && (
        <span className="hidden font-mono text-micro text-alert xl:inline">{err}</span>
      )}
    </form>
  );
}
