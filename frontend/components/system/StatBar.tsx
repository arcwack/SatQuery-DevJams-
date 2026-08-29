"use client";

import { cn } from "@/lib/utils";
import { useCountUp } from "@/lib/useCountUp";

type StatBarProps = {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  decimals?: number;
  tone?: "signal" | "alert" | "good";
  className?: string;
};

/**
 * Labelled measurement bar — evidence panel stats (e.g. "FOREST LOSS  38%").
 * The fill width and the number count up together on the shared panel
 * motion curve, so a stat appearing reads as a live reading, not a static
 * mockup value.
 */
export function StatBar({
  label,
  value,
  max = 100,
  unit = "%",
  decimals = 0,
  tone = "signal",
  className,
}: StatBarProps) {
  const animated = useCountUp(value);
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const fillColor =
    tone === "signal" ? "bg-signal" : tone === "alert" ? "bg-alert" : "bg-good";
  const textColor =
    tone === "signal" ? "text-signal" : tone === "alert" ? "text-alert" : "text-good";

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-micro uppercase tracking-[0.12em] text-ink-faint">
          {label}
        </span>
        <span data-numeric="true" className={cn("font-mono text-small font-medium", textColor)}>
          {animated.toFixed(decimals)}
          {unit}
        </span>
      </div>
      <div className="h-[3px] w-full overflow-hidden rounded-pill bg-void-3">
        <div
          className={cn("h-full rounded-pill", fillColor)}
          style={{
            width: `${pct}%`,
            transition: `width var(--motion-panel) var(--ease-signature)`,
          }}
        />
      </div>
    </div>
  );
}
