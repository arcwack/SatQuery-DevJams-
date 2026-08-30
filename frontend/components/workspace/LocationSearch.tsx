"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useMapStore } from "@/lib/store";
import { geocode } from "@/lib/api";

/** Search a country/city/place name and fly the map to it. */
export function LocationSearch() {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q || busy) return;
    setBusy(true);
    setErr("");
    try {
      const result = await geocode(q);
      const map = useMapStore.getState().map;
      if (!map) return;
      if (result.bounds) map.flyToBounds(result.bounds, { duration: 1, maxZoom: 11 });
      else map.flyTo([result.lat, result.lon], 12, { duration: 1 });
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Not found");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 rounded-hard border border-line bg-void-3/60 px-2.5 py-1.5 focus-within:border-line-bright"
    >
      <Search size={13} className="shrink-0 text-ink-faint" />
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setErr("");
        }}
        placeholder="Search country / city"
        aria-label="Search location"
        className="w-40 bg-transparent text-caption text-ink placeholder:text-ink-faint focus:outline-none sm:w-48"
      />
      <button
        type="submit"
        disabled={!value.trim() || busy}
        data-cursor="action"
        aria-label="Go to location"
        className="hidden font-mono text-micro uppercase tracking-[0.12em] text-signal transition-colors hover:text-signal-bright disabled:opacity-40 sm:inline"
      >
        Go
      </button>
      {err && <span className="hidden text-micro text-alert sm:inline">{err}</span>}
    </form>
  );
}
