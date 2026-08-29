"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 (or its previous value) to `target` over
 * `durationMs`. Used anywhere a stat renders — the goal is "measured
 * instrument," not "decorative UI." Respects prefers-reduced-motion by
 * jumping straight to the target value.
 */
export function useCountUp(target: number, durationMs = 350) {
  const [value, setValue] = useState(0);
  const frame = useRef<number | undefined>(undefined);
  const from = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const effectiveDuration = reduced ? 0 : durationMs;

    const start = performance.now();
    const startValue = from.current;
    const delta = target - startValue;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = effectiveDuration === 0 ? 1 : Math.min(elapsed / effectiveDuration, 1);
      setValue(startValue + delta * progress);
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        from.current = target;
      }
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, durationMs]);

  return value;
}
