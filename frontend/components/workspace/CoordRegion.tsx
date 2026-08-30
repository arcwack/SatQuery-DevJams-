"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Grid2x2 } from "lucide-react";
import { Eyebrow } from "@/components/system/Eyebrow";
import { useMapStore } from "@/lib/store";

type Row = { lat: string; lng: string };

/** Enter three latitude/longitude pairs to draw a triangular region. */
export function CoordRegion() {
  const [open, setOpen] = useState(false);
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
    setOpen(false);

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

  const inputClass =
    "w-full rounded-hard border border-line bg-void-3/50 px-2.5 py-1.5 font-mono text-caption text-ink placeholder:text-ink-faint focus:border-line-bright focus:outline-none";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-cursor="action"
        aria-label="Draw region from coordinates"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-hard border border-line px-2.5 py-1.5 text-ink-dim transition-colors hover:border-line-bright hover:text-ink"
      >
        <Grid2x2 size={13} />
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] lg:inline">
          Region
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-72 rounded-soft border border-line bg-void-2/95 p-4 shadow-lg backdrop-blur-md"
          >
            <form onSubmit={submit}>
              <Eyebrow tone="signal">3-point region</Eyebrow>

              <div className="mt-3 flex flex-col gap-2">
                <div className="grid grid-cols-[1.5rem,1fr,1fr] items-center gap-x-2 font-mono text-micro uppercase tracking-[0.1em] text-ink-faint">
                  <span />
                  <span>Lat</span>
                  <span>Lon</span>
                </div>
                {rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1.5rem,1fr,1fr] items-center gap-x-2">
                    <span className="font-mono text-micro text-ink-faint">{i + 1}</span>
                    <input
                      value={row.lat}
                      onChange={(e) => set(i, "lat", e.target.value)}
                      placeholder={`Lat ${i + 1}`}
                      aria-label={`Latitude ${i + 1}`}
                      className={inputClass}
                    />
                    <input
                      value={row.lng}
                      onChange={(e) => set(i, "lng", e.target.value)}
                      placeholder={`Lon ${i + 1}`}
                      aria-label={`Longitude ${i + 1}`}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>

              <p className="mt-3 font-mono text-micro uppercase tracking-[0.1em] text-ink-faint">
                Decimal degrees · draws a triangle
              </p>
              {err && <p className="mt-2 text-caption text-alert">{err}</p>}

              <button
                type="submit"
                data-cursor="action"
                className="mt-3 w-full rounded-hard bg-signal px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-void transition-colors hover:bg-signal-bright"
              >
                Draw region
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
