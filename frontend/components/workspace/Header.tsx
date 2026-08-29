"use client";

import { PanelRightClose, PanelRightOpen, MessageSquare, X } from "lucide-react";
import { MissionClock } from "./MissionClock";

type HeaderProps = {
  chatOpenMobile: boolean;
  onToggleChatMobile: () => void;
  evidenceOpen: boolean;
  onToggleEvidence: () => void;
};

/**
 * Fixed-height instrument title bar. Deliberately not a marketing nav —
 * no links, no menu of pages, just identity, system status, and the two
 * panel toggles the workspace actually needs.
 */
export function Header({
  chatOpenMobile,
  onToggleChatMobile,
  evidenceOpen,
  onToggleEvidence,
}: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-void-2/80 px-4 backdrop-blur-sm sm:px-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleChatMobile}
          data-cursor="action"
          aria-label={chatOpenMobile ? "Close chat panel" : "Open chat panel"}
          className="flex h-8 w-8 items-center justify-center rounded-hard border border-line text-ink-dim transition-colors hover:border-line-bright hover:text-ink lg:hidden"
        >
          {chatOpenMobile ? <X size={15} /> : <MessageSquare size={15} />}
        </button>

        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-good" aria-hidden="true" />
          <span className="font-display text-[15px] font-semibold tracking-[0.02em] text-ink">
            SATQUERY
          </span>
        </div>

        <div className="hidden h-4 w-px bg-line sm:block" aria-hidden="true" />

        <span className="hidden font-mono text-micro uppercase tracking-[0.14em] text-ink-faint sm:inline">
          Workspace
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-good" aria-hidden="true" />
          <span className="font-mono text-micro uppercase tracking-[0.12em] text-ink-faint">
            link nominal
          </span>
        </div>

        <div className="hidden sm:block">
          <MissionClock />
        </div>

        <button
          type="button"
          onClick={onToggleEvidence}
          data-cursor="action"
          aria-label={evidenceOpen ? "Close evidence panel" : "Open evidence panel"}
          aria-pressed={evidenceOpen}
          className="flex h-8 items-center gap-2 rounded-hard border border-line px-2.5 text-ink-dim transition-colors hover:border-line-bright hover:text-ink"
        >
          {evidenceOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
          <span className="hidden font-mono text-micro uppercase tracking-[0.1em] sm:inline">
            Evidence
          </span>
        </button>
      </div>
    </header>
  );
}
