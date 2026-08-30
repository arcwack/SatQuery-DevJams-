"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { Eyebrow } from "@/components/system/Eyebrow";
import { useMapStore } from "@/lib/store";
import { postTimeline } from "@/lib/api";
import { viewGeometry } from "@/lib/geo";

const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const START_DATE = "2018-06-15";
const MONTH_DAY = "-06-15";
const DEFAULT_YEAR = 2026;

/**
 * Full-width instrument strip beneath the map. A real year slider (2018 →
 * 2026) that swaps the GIBS imagery date on the map and, for the drawn/view
 * area, computes the change from 2018 → selected year and narrates it.
 */
export function TimelineBar() {
  const activeDate = useMapStore((s) => s.activeDate);
  const narrative = useMapStore((s) => s.timelineNarrative);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);
  const reqId = useRef(0);

  const currentYear = Number(activeDate?.slice(0, 4) ?? DEFAULT_YEAR);
  const index = Math.max(0, YEARS.indexOf(currentYear));

  const setYear = (year: number, geo?: ReturnType<typeof viewGeometry>) => {
    const id = ++reqId.current;
    const date = `${year}${MONTH_DAY}`;
    useMapStore.getState().setActiveDate(date);
    const geometry = geo ?? useMapStore.getState().geometry ?? viewGeometry();
    if (!geometry) {
      useMapStore.getState().clearTimeline();
      return;
    }
    postTimeline({ geometry, start_date: START_DATE, end_date: date })
      .then((result) => {
        if (id !== reqId.current) return;
        useMapStore.getState().setTimeline(result.narrative, result.start_date, result.change);
      })
      .catch(() => {
        if (id === reqId.current) useMapStore.getState().clearTimeline();
      });
  };

  const onSlider = (value: number) => {
    setPlaying(false);
    setYear(YEARS[value]);
  };

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => {
      const state = useMapStore.getState();
      const cur = Number(state.activeDate?.slice(0, 4) ?? DEFAULT_YEAR);
      const i = YEARS.indexOf(cur);
      const next = YEARS[(i + 1) % YEARS.length];
      setYear(next);
    }, 1000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing]);

  const fillPct = (index / (YEARS.length - 1)) * 100;

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-line bg-void-2/80 px-4 py-3 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-5 sm:gap-8">
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            data-cursor="action"
            aria-label={playing ? "Pause timeline" : "Play timeline"}
            className="flex h-8 w-8 items-center justify-center rounded-hard border border-line-bright text-ink-dim transition-colors hover:text-ink"
          >
            {playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="ml-0.5" />}
          </button>

          <div className="hidden flex-col sm:flex">
            <Eyebrow tone="dim">Time machine</Eyebrow>
            <span data-numeric="true" className="mt-1 font-mono text-section leading-none text-ink">
              {currentYear}
            </span>
          </div>

          <span data-numeric="true" className="font-mono text-subhead leading-none text-ink sm:hidden">
            {currentYear}
          </span>
        </div>

        <div className="relative h-full flex-1">
          <input
            type="range"
            min={0}
            max={YEARS.length - 1}
            step={1}
            value={index}
            onChange={(e) => onSlider(Number(e.target.value))}
            aria-label="Imagery year"
            data-cursor="action"
            className="timeline-range w-full"
            style={{
              background: `linear-gradient(to right, var(--color-signal-dim) 0%, var(--color-signal-dim) ${fillPct}%, var(--color-void-3) ${fillPct}%, var(--color-void-3) 100%)`,
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between">
            {YEARS.map((year) => (
              <span
                key={year}
                aria-hidden="true"
                className={`h-2 w-px ${year === currentYear ? "bg-signal" : "bg-line-bright"}`}
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-full mt-1 flex justify-between">
            {YEARS.map((year) => (
              <span
                key={year}
                data-numeric="true"
                className={`font-mono text-micro tracking-[0.04em] ${
                  year === currentYear ? "text-signal" : "text-ink-faint"
                }`}
              >
                {year}
              </span>
            ))}
          </div>
        </div>
      </div>

      {narrative && (
        <p className="line-clamp-2 max-w-3xl pl-[88px] font-mono text-micro uppercase leading-relaxed tracking-[0.08em] text-ink-dim sm:pl-0">
          {narrative}
        </p>
      )}
    </div>
  );
}
