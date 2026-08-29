"use client";

import { cn } from "@/lib/utils";
import { useCountUp } from "@/lib/useCountUp";

type StatChipProps = {
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
  tone?: "signal" | "alert" | "good" | "dim";
  className?: string;
};

/**
 * Small readout, e.g. "CONFIDENCE  94%". Mono value, tabular-nums, counts
 * up from 0 on mount/change rather than snapping — a real instrument
 * measures, it doesn't just display.
 */
export function StatChip({
  label,
  value,
  unit = "",
  decimals = 0,
  tone = "signal",
  className,
}: StatChipProps) {
  const animated = useCountUp(value);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-hard border border-line bg-void-2/60 px-3 py-1.5",
        className,
      )}
    >
      <span className="font-mono text-micro uppercase tracking-[0.12em] text-ink-faint">
        {label}
      </span>
      <span
        data-numeric="true"
        className={cn(
          "font-mono text-small font-medium",
          tone === "signal" && "text-signal",
          tone === "alert" && "text-alert",
          tone === "good" && "text-good",
          tone === "dim" && "text-ink-dim",
        )}
      >
        {animated.toFixed(decimals)}
        {unit}
      </span>
    </div>
  );
}
