"use client";

import { useState } from "react";
import { Grid2x2 } from "lucide-react";
import { useMapStore } from "@/lib/store";

type Row = { lat: string; lng: string };

/** Enter three latitude/longitude pairs to draw a triangular region. */
export function CoordRegion() {
  const [rows, setRows] = useState<Row[]>([
    { lat: "", lng: "" },
    { lat: "", lng: "" },
    { lat: "", lng: "" },
  ]);
  const [err, setErr] = useState("");
  const addRegion = useMapStore((s) => s.addRegion);
  const setGeometry = useMapStore((s) => s.setGeometry);

  const set = (i: number, field: keyof Row, v: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: v } : r)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const positions = rows.map((r) => [+r.lat, +r.lng] as [number, number]);
    if (positions.some((p) => Number.isNaN(p[0]) || Number.isNaN(p[1]))) {
      setErr("Enter valid latitude and longitude for all three points.");
      return;
    }
    setErr("");

    const id = `coord-${Date.now()}`;
    addRegion({ id, positions });

    const ring = positions.map(([lat, lng]) => [lng, lat]);
    ring.push(ring[0]);
    setGeometry({ type: "Polygon", coordinates: [ring] });

    const map = useMapStore.getState().map;
    const lats = positions.map((p) => p[0]);
    const lngs = positions.map((p) => p[1]);
    map?.flyToBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { duration: 1, maxZoom: 12 },
    );
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 rounded-hard border border-line bg-void-3/60 px-2.5 py-1.5 focus-within:border-line-bright"
    >
      <Grid2x2 size={13} className="shrink-0 text-ink-faint" />
      <div className="flex flex-col gap-0.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-1">
            <input
              value={row.lat}
              onChange={(e) => set(i, "lat", e.target.value)}
              placeholder={`lat ${i + 1}`}
              aria-label={`Latitude ${i + 1}`}
              className="w-14 bg-transparent font-mono text-micro text-ink placeholder:text-ink-faint focus:outline-none"
            />
            <span className="text-ink-faint">,</span>
            <input
              value={row.lng}
              onChange={(e) => set(i, "lng", e.target.value)}
              placeholder={`lon ${i + 1}`}
              aria-label={`Longitude ${i + 1}`}
              className="w-14 bg-transparent font-mono text-micro text-ink placeholder:text-ink-faint focus:outline-none"
            />
          </div>
        ))}
      </div>
      <button
        type="submit"
        data-cursor="action"
        aria-label="Draw region from coordinates"
        className="hidden font-mono text-micro uppercase tracking-[0.12em] text-signal transition-colors hover:text-signal-bright sm:inline"
      >
        Draw
      </button>
      {err && <span className="hidden max-w-[10rem] text-micro text-alert sm:inline">{err}</span>}
    </form>
  );
}
