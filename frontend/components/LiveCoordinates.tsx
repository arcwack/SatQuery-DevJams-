"use client";

import * as React from "react";

/**
 * The corner telemetry read-out. Lat/lon interpolate from a wide "orbital"
 * position toward a fixed target as the user scrolls the hero past — the
 * numbers tighten in step with the camera descent. A small amount of jitter
 * on each frame keeps it feeling live rather than static.
 */

// Where the descent starts (mid-orbit) and where it lands.
const START = { lat: 41.204, lon: -104.812 };
const TARGET = { lat: 34.8522, lon: -118.2437 };
const DESCENT_SPAN = 1.15;

function fmtLat(v: number) {
  return `${Math.abs(v).toFixed(4)}° ${v >= 0 ? "N" : "S"}`;
}

function fmtLon(v: number) {
  return `${Math.abs(v).toFixed(4)}° ${v >= 0 ? "E" : "W"}`;
}

export function LiveCoordinates() {
  const [coord, setCoord] = React.useState(START);

  React.useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const at = (p: number, jitter: number) => ({
      lat: START.lat + (TARGET.lat - START.lat) * p + (Math.random() - 0.5) * jitter,
      lon: START.lon + (TARGET.lon - START.lon) * p + (Math.random() - 0.5) * jitter,
    });
    const progress = () => {
      const span = window.innerHeight * DESCENT_SPAN || 1;
      return Math.min(1, Math.max(0, window.scrollY / span));
    };

    // Reduced motion: update only on scroll, no continuous jitter.
    if (reduce) {
      const onScroll = () => setCoord(at(progress(), 0));
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    let raf = 0;
    const tick = () => {
      const p = progress();
      // Jitter shrinks as we lock on, so it settles near the target.
      setCoord(at(p, (1 - p) * 0.03 + 0.0015));
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="hidden text-right font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-ink-dim md:block">
      <p data-numeric="true">
        {fmtLat(coord.lat)} · {fmtLon(coord.lon)}
      </p>
      <p>ALT 705KM · SUN SYNC</p>
    </div>
  );
}
