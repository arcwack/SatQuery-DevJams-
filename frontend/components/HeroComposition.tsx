"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { EarthGlobe } from "./EarthGlobe";
import { OrbitalSatellite } from "./OrbitalSatellite";

const CORNERS = ["top-4 left-4", "top-4 right-4", "bottom-4 left-4", "bottom-4 right-4"] as const;

const KEYFRAMES = `
  @keyframes hc-scan {
    0%, 100% { top: 12%; opacity: 0.5; }
    50% { top: 86%; opacity: 0.9; }
  }
  @media (prefers-reduced-motion: reduce) {
    .hc-scan { animation: none !important; }
  }
`;

/**
 * Cinematic hero composition: a distant, hazy Earth (back), the orbital
 * satellite (mid), and a restrained HUD (corner brackets, mono telemetry,
 * faint grid, a slow scan line). Subtle pointer parallax; disabled under
 * prefers-reduced-motion. Replaces the previous flashy fixed scroll zoom.
 */
export function HeroComposition() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 40, damping: 22 });
  const sy = useSpring(my, { stiffness: 40, damping: 22 });

  const earthX = useTransform(sx, (v) => v * -16);
  const earthY = useTransform(sy, (v) => v * -10);
  const satX = useTransform(sx, (v) => v * 22);
  const satY = useTransform(sy, (v) => v * 14);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <div
      ref={ref}
      onMouseMove={reduced ? undefined : onMove}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <style>{KEYFRAMES}</style>

      {/* Faint grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-line) 1px, transparent 1px), linear-gradient(to bottom, var(--color-line) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* Earth — distant, hazy, back */}
      <div className="absolute right-[-16%] top-1/2 hidden -translate-y-1/2 md:block">
        <motion.div style={{ x: earthX, y: earthY }} className="opacity-70">
          <div className="blur-[1px]">
            <EarthGlobe size={880} rotationSpeed={0.05} />
          </div>
        </motion.div>
      </div>

      {/* Satellite — mid */}
      <div className="absolute bottom-[8%] right-[5%] hidden md:block">
        <motion.div style={{ x: satX, y: satY }}>
          <OrbitalSatellite />
        </motion.div>
      </div>

      {/* Scan line */}
      <div
        className="hc-scan absolute inset-x-0 h-px"
        style={{ background: "linear-gradient(to right, transparent, var(--color-signal-dim), transparent)", animation: "hc-scan 14s ease-in-out infinite" }}
      />

      {/* Corner brackets */}
      {CORNERS.map((pos) => {
        const isTop = pos.startsWith("top");
        const isLeft = pos.includes("left");
        return (
          <div
            key={pos}
            className={`absolute ${pos} h-5 w-5 opacity-40`}
            style={{
              borderTop: isTop ? "1px solid var(--color-signal-dim)" : undefined,
              borderBottom: !isTop ? "1px solid var(--color-signal-dim)" : undefined,
              borderLeft: isLeft ? "1px solid var(--color-signal-dim)" : undefined,
              borderRight: !isLeft ? "1px solid var(--color-signal-dim)" : undefined,
            }}
          />
        );
      })}

      {/* Mono telemetry */}
      <div className="absolute bottom-16 left-4 font-mono text-micro uppercase tracking-[0.14em] text-ink-dim md:bottom-6 md:left-10">
        LAT 44.90 · LON 60.00
      </div>
      <div className="absolute right-10 top-20 hidden font-mono text-micro uppercase tracking-[0.14em] text-ink-dim md:block">
        GRID 478
      </div>
    </div>
  );
}
