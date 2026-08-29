"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, ImageOff } from "lucide-react";
import { Eyebrow } from "@/components/system/Eyebrow";
import { GlassPanel } from "@/components/system/GlassPanel";
import { StatBar } from "@/components/system/StatBar";

type EvidencePanelProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Floating overlay drawer on the map's right edge — soft radius, real
 * glass, margin on every side (it reads as instrument overlay, not part
 * of the frame). Empty state only: no `useMapStore.evidencePanel` wiring
 * until Phase 8.
 */
export function EvidencePanel({ open, onClose }: EvidencePanelProps) {
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
              <Eyebrow tone="dim">Evidence</Eyebrow>
              <button
                type="button"
                onClick={onClose}
                data-cursor="action"
                aria-label="Close evidence panel"
                className="flex h-6 w-6 items-center justify-center rounded-hard text-ink-faint transition-colors hover:text-ink"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto px-4 py-5">
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-hard border border-line text-ink-faint">
                  <ImageOff size={15} strokeWidth={1.5} />
                </div>
                <p className="max-w-[24ch] text-small text-ink-dim">
                  No region selected. Draw a boundary or ask a question to
                  begin an analysis.
                </p>
              </div>

              <div className="mt-2 border-t border-line pt-5 opacity-40">
                <Eyebrow tone="dim" className="mb-3">
                  Preview · awaiting data
                </Eyebrow>
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <div className="flex aspect-video items-center justify-center rounded-hard border border-dashed border-line font-mono text-micro uppercase tracking-wide text-ink-faint">
                    Before
                  </div>
                  <div className="flex aspect-video items-center justify-center rounded-hard border border-dashed border-line font-mono text-micro uppercase tracking-wide text-ink-faint">
                    After
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <StatBar label="change detected" value={0} tone="signal" />
                  <StatBar label="confidence" value={0} tone="good" />
                </div>
              </div>
            </div>
          </GlassPanel>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
