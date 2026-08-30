"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, ImageOff, TriangleAlert, Loader } from "lucide-react";
import { Eyebrow } from "@/components/system/Eyebrow";
import { GlassPanel } from "@/components/system/GlassPanel";
import { StatBar } from "@/components/system/StatBar";
import { useMapStore } from "@/lib/store";
import type { RegionAnalysis } from "@/lib/api";

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

export function EvidencePanel({ open, onClose }: EvidencePanelProps) {
  const regionResult = useMapStore((s) => s.regionResult);
  const analyzing = useMapStore((s) => s.analyzing);

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

            <div className="flex flex-1 flex-col overflow-y-auto px-4 py-5">
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
