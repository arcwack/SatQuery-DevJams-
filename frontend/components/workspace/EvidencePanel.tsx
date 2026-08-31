"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { X, ImageOff, TriangleAlert, Loader, Zap, FileDown } from "lucide-react";
import { Eyebrow } from "@/components/system/Eyebrow";
import { GlassPanel } from "@/components/system/GlassPanel";
import { StatBar } from "@/components/system/StatBar";
import { useMapStore } from "@/lib/store";
import type { RegionAnalysis } from "@/lib/api";
import { ReportTemplate } from "./ReportTemplate";
import { usePdfExport } from "@/lib/usePdfExport";

type EvidencePanelProps = {
  open: boolean;
  onClose: () => void;
};

const CHANGE_ROWS: { key: keyof RegionAnalysis["change"]; label: string }[] = [
  { key: "water", label: "water" },
  { key: "vegetation", label: "vegetation" },
  { key: "built_up", label: "built-up" },
];

function ChangeRow({ label, value }: { label: string; value: number }) {
  const tone = value > 0.4 ? "text-good" : value < -0.4 ? "text-alert" : "text-ink";
  const sign = value > 0 ? "+" : "";
  return (
    <div className="flex items-baseline justify-between">
      <span className="font-mono text-caption font-medium uppercase tracking-[0.12em] text-ink-dim">
        {label}
      </span>
      <span data-numeric="true" className={`font-mono text-small font-semibold ${tone}`}>
        {sign}
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

function Summary({ result }: { result: RegionAnalysis }) {
  return (
    <>
      <div
        className={`flex items-center gap-2 rounded-hard border px-3 py-2 ${
          result.changed ? "border-alert-dim bg-alert/10" : "border-line bg-void-3/40"
        }`}
      >
        <TriangleAlert size={13} className={result.changed ? "text-alert" : "text-good"} />
        <span
          className={`font-mono text-micro uppercase tracking-[0.12em] ${
            result.changed ? "text-alert" : "text-good"
          }`}
        >
          {result.changed ? "Significant change detected" : "Stable — no significant change"}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <StatBar label="water" value={result.water_pct} tone="signal" />
        <StatBar label="vegetation" value={result.vegetation_pct} tone="good" />
        <StatBar label="built-up / bare" value={result.built_up_pct} tone="alert" />
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <Eyebrow tone="signal" className="mb-3">
          Change · {result.start_date} → {result.end_date}
        </Eyebrow>
        <div className="flex flex-col gap-2">
          {CHANGE_ROWS.map((row) => (
            <ChangeRow key={row.key} label={row.label} value={result.change[row.key]} />
          ))}
        </div>
      </div>
    </>
  );
}

const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;

export function EvidencePanel({ open, onClose }: EvidencePanelProps) {
  const regionResult = useMapStore((s) => s.regionResult);
  const analyzing = useMapStore((s) => s.analyzing);
  const splitEnabled = useMapStore((s) => s.splitEnabled);
  const splitLeftYear = useMapStore((s) => s.splitLeftYear);
  const splitRightYear = useMapStore((s) => s.splitRightYear);
  const setSplitLeftYear = useMapStore((s) => s.setSplitLeftYear);
  const setSplitRightYear = useMapStore((s) => s.setSplitRightYear);
  const toggleSplit = useMapStore((s) => s.toggleSplit);
  const geometry = useMapStore((s) => s.geometry);
  const timelineNarrative = useMapStore((s) => s.timelineNarrative);
  const activeDate = useMapStore((s) => s.activeDate);
  const evidence = useMapStore((s) => s.evidence);
  const map = useMapStore((s) => s.map);
  const reportRef = useRef<HTMLDivElement>(null);
  const [mapSnapshot, setMapSnapshot] = useState<string | null>(null);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const { exportWithSnapshot, generating } = usePdfExport();
  const center: [number, number] | null = map ? [map.getCenter().lat, map.getCenter().lng] : null;

  useEffect(() => {
    if (!center) {
      setPlaceName(null);
      return;
    }
    const controller = new AbortController();
    fetch(`${process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000"}/api/reverse-geocode?lat=${center[0]}&lon=${center[1]}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.label) setPlaceName(data.label.split(",").slice(0, 2).join(","));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [center ? `${center[0].toFixed(4)},${center[1].toFixed(4)}` : ""])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-y-3 right-3 z-20 w-[calc(100vw-1.5rem)] sm:w-[360px]"
        >
          <GlassPanel variant="soft" scanlines className="flex h-full flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3.5">
              <Eyebrow tone="signal">Evidence</Eyebrow>
              <button
                type="button"
                onClick={onClose}
                data-cursor="action"
                aria-label="Close evidence panel"
                className="flex h-6 w-6 items-center justify-center rounded-hard text-ink-dim transition-colors hover:text-ink"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5">
              {/* Export Intelligence Report — one-click PDF */}
              <button
                type="button"
                onClick={() =>
                  exportWithSnapshot(reportRef, setMapSnapshot, {
                    regionResult,
                    geometry,
                    center,
                    leftDate: regionResult?.start_date ?? (splitEnabled ? `${splitLeftYear}-08-27` : activeDate || "2021-08-27"),
                    rightDate: regionResult?.end_date ?? (splitEnabled ? `${splitRightYear}-08-27` : activeDate || "2026-08-27"),
                    placeName,
                    narrative: evidence?.reply ?? timelineNarrative,
                  })
                }
                disabled={generating}
                data-cursor="action"
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-hard border border-signal-dim bg-[#05070A] px-3 py-2.5 font-mono text-micro font-semibold uppercase tracking-[0.12em] text-signal transition-colors hover:bg-signal hover:text-void disabled:opacity-50"
              >
                {generating ? <Loader size={12} className="animate-spin" /> : <FileDown size={12} />}
                {generating ? "Generating PDF..." : "📄 EXPORT EVIDENCE REPORT"}
              </button>

              {/* Split-screen toggle — dark glass, spec: [ ⚡ Toggle Split-Screen ] */}
              <button
                type="button"
                onClick={toggleSplit}
                data-cursor="action"
                aria-pressed={splitEnabled}
                className={`flex w-full items-center justify-center gap-2 rounded-hard border px-3 py-2.5 font-mono text-micro uppercase tracking-[0.12em] transition-colors ${
                  splitEnabled
                    ? "border-signal-dim bg-signal/15 text-signal"
                    : "border-line bg-[#05070A]/60 text-ink-dim hover:border-line-bright hover:text-ink"
                }`}
              >
                <Zap size={12} className={splitEnabled ? "text-signal" : "text-ink-faint"} />
                {splitEnabled ? "Exit Split-Screen" : "⚡ Toggle Split-Screen"}
              </button>

              {splitEnabled && (
                <div className="mt-3 mb-4 grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="font-mono text-micro uppercase tracking-[0.1em] text-ink-faint">Left (Baseline)</span>
                    <select
                      value={splitLeftYear}
                      onChange={(e) => setSplitLeftYear(Number(e.target.value))}
                      data-cursor="action"
                      className="w-full rounded-hard border border-line bg-void-2 px-2 py-1.5 font-mono text-small text-ink focus:border-signal-dim focus:outline-none"
                    >
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y} — {y}-08-27</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-mono text-micro uppercase tracking-[0.1em] text-ink-faint">Right (Current)</span>
                    <select
                      value={splitRightYear}
                      onChange={(e) => setSplitRightYear(Number(e.target.value))}
                      data-cursor="action"
                      className="w-full rounded-hard border border-line bg-void-2 px-2 py-1.5 font-mono text-small text-ink focus:border-signal-dim focus:outline-none"
                    >
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y} — {y}-08-27</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {analyzing ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
                  <Loader size={16} className="animate-spin text-signal" />
                  <p className="font-mono text-micro uppercase tracking-[0.14em] text-ink-faint">
                    analyzing region…
                  </p>
                </div>
              ) : regionResult ? (
                <Summary result={regionResult} />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-hard border border-line text-ink-faint">
                    <ImageOff size={15} strokeWidth={1.5} />
                  </div>
                  <p className="max-w-[24ch] text-small text-ink-dim">
                    No region selected. Draw a boundary to analyze its land
                    cover and recent change.
                  </p>
                </div>
              )}
            </div>
          </GlassPanel>
          {/* Hidden report template for PDF capture — preview */}
          <div aria-hidden="true" className="pointer-events-none">
            <ReportTemplate
              ref={reportRef}
              regionResult={regionResult}
              narrative={evidence?.reply ?? timelineNarrative}
              geometry={geometry}
              mapSnapshot={mapSnapshot}
              center={center}
              timestamp={new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC"}
              leftDate={regionResult?.start_date ?? (splitEnabled ? `${splitLeftYear}-08-27` : activeDate || "2021-08-27")}
              rightDate={regionResult?.end_date ?? (splitEnabled ? `${splitRightYear}-08-27` : activeDate || "2026-08-27")}
              placeName={placeName}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
