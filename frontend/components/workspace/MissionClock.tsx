"use client";

import { useEffect, useState } from "react";

function format(date: Date) {
  const h = String(date.getUTCHours()).padStart(2, "0");
  const m = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/**
 * Ticking UTC readout. Purely decorative mission-console telemetry — not
 * wired to any product state, so it's safe ahead of chat/map logic.
 */
export function MissionClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setTime(format(new Date()));
    const id = setInterval(tick, 1000);
    const kickoff = setTimeout(tick, 0);
    return () => {
      clearInterval(id);
      clearTimeout(kickoff);
    };
  }, []);

  return (
    <span data-numeric="true" className="font-mono text-micro tracking-[0.08em] text-ink-faint">
      {time ?? "--:--:--"} UTC
    </span>
  );
}
