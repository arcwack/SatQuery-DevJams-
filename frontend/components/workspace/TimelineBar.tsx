import { Play } from "lucide-react";
import { Eyebrow } from "@/components/system/Eyebrow";

const YEAR_MARKS = [2000, 2005, 2010, 2015, 2020, 2025];
const CURRENT_YEAR = 2024;
const MIN_YEAR = 2000;
const MAX_YEAR = 2025;
const FILL_PCT = ((CURRENT_YEAR - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;

/**
 * Full-width instrument strip beneath both the chat dock and the map.
 * Track, fill, and year marks are rendered at a fixed position — no
 * drag/click handling or `useMapStore.activeYear` wiring yet (Phase 6).
 */
export function TimelineBar() {
  return (
    <div className="flex h-20 shrink-0 items-center gap-5 border-t border-line bg-void-2/80 px-4 backdrop-blur-sm sm:h-[84px] sm:gap-8 sm:px-6">
      <div className="flex shrink-0 items-center gap-4">
        <button
          type="button"
          disabled
          data-cursor="action"
          aria-label="Play timeline"
          className="flex h-8 w-8 items-center justify-center rounded-hard border border-line-bright text-ink-dim disabled:cursor-not-allowed"
        >
          <Play size={13} fill="currentColor" className="ml-0.5" />
        </button>

        <div className="hidden flex-col sm:flex">
          <Eyebrow tone="dim">Time machine</Eyebrow>
          <span data-numeric="true" className="mt-1 font-mono text-section leading-none text-ink">
            {CURRENT_YEAR}
          </span>
        </div>

        <span
          data-numeric="true"
          className="font-mono text-subhead leading-none text-ink sm:hidden"
        >
          {CURRENT_YEAR}
        </span>
      </div>

      <div className="relative h-full flex-1">
        {/* Track */}
        <div className="absolute top-1/2 h-[3px] w-full -translate-y-1/2 rounded-pill bg-void-3">
          <div
            className="h-full rounded-pill bg-signal-dim"
            style={{ width: `${FILL_PCT}%` }}
          />
          <div
            aria-hidden="true"
            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-signal bg-void"
            style={{ left: `calc(${FILL_PCT}% - 5px)` }}
          />
        </div>

        {/* Year marks */}
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between">
          {YEAR_MARKS.map((year) => (
            <div key={year} className="flex flex-col items-center gap-1.5">
              <span className="h-2 w-px bg-line-bright" aria-hidden="true" />
              <span className="hidden font-mono text-micro tracking-[0.04em] text-ink-faint min-[480px]:inline">
                {year}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
