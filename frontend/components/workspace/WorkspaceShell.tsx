"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "./Header";
import { ChatPanel } from "./ChatPanel";
import { MapStage } from "./MapStage";
import { EvidencePanel } from "./EvidencePanel";
import { TimelineBar } from "./TimelineBar";

/**
 * Full workspace layout. Structure:
 *   Header (full width)
 *   ┌─────────────┬──────────────────────────────┐
 *   │  Chat dock  │  Map stage (hero)             │
 *   │  (fixed,    │    — Evidence panel floats    │
 *   │   lg+ only) │      on top, right edge       │
 *   └─────────────┴──────────────────────────────┘
 *   Timeline bar (full width)
 *
 * Below the `lg` breakpoint the chat dock becomes a slide-over triggered
 * from the header, and the map stage takes the full width — the map
 * stays the hero at every size rather than being squeezed into a
 * shrinking column.
 */
export function WorkspaceShell() {
  const [chatOpenMobile, setChatOpenMobile] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(true);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-void">
      <Header
        chatOpenMobile={chatOpenMobile}
        onToggleChatMobile={() => setChatOpenMobile((v) => !v)}
        evidenceOpen={evidenceOpen}
        onToggleEvidence={() => setEvidenceOpen((v) => !v)}
      />

      <div className="relative flex flex-1 overflow-hidden">
        {/* Chat dock — desktop, in normal flow */}
        <div className="hidden h-full w-[380px] shrink-0 lg:block xl:w-[420px]">
          <ChatPanel />
        </div>

        {/* Chat dock — mobile/tablet, slide-over */}
        <AnimatePresence>
          {chatOpenMobile && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setChatOpenMobile(false)}
                className="fixed inset-0 z-30 bg-void/70 backdrop-blur-[2px] lg:hidden"
                aria-hidden="true"
              />
              <motion.div
                key="drawer"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-y-0 left-0 z-40 w-[85vw] max-w-[380px] lg:hidden"
              >
                <ChatPanel />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <MapStage>
          <EvidencePanel open={evidenceOpen} onClose={() => setEvidenceOpen(false)} />
        </MapStage>
      </div>

      <TimelineBar />
    </div>
  );
}
