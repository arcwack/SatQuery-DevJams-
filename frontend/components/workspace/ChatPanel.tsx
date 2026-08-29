import { SendHorizontal, Sparkles } from "lucide-react";
import { Eyebrow } from "@/components/system/Eyebrow";
import { GlassPanel } from "@/components/system/GlassPanel";

const SUGGESTED_PROMPTS = [
  "Show deforestation near Manaus since 2015",
  "Compare Aral Sea coverage, 1990 vs today",
  "Flag anomalies in this region",
];

/**
 * Fixed instrument dock — hard radius, heavier border, part of the frame
 * rather than a floating overlay. Static shell only: no message state,
 * no send handler. That's Phase 5.
 */
export function ChatPanel() {
  return (
    <GlassPanel
      variant="hard"
      className="flex h-full w-full flex-col border-l-0 border-t-0 border-b-0"
    >
      <div className="flex h-14 shrink-0 items-center border-b border-line px-4">
        <Eyebrow tone="dim">Query console</Eyebrow>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-6 py-8 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-hard border border-line text-ink-faint">
          <Sparkles size={15} strokeWidth={1.5} />
        </div>
        <p className="max-w-[26ch] text-small text-ink-dim">
          Ask about any location, any year. Draw a region on the map to
          analyze it directly.
        </p>
      </div>

      <div className="shrink-0 border-t border-line px-4 py-4">
        <Eyebrow tone="dim" className="mb-2.5">
          Suggested
        </Eyebrow>
        <div className="mb-4 flex flex-col gap-1.5">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled
              data-cursor="action"
              className="rounded-hard border border-line bg-void-3/50 px-3 py-2 text-left text-caption text-ink-dim opacity-70 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-hard border border-line bg-void-3/60 px-3 py-2.5">
          <input
            type="text"
            disabled
            placeholder="Query the archive…"
            className="w-full bg-transparent text-small text-ink placeholder:text-ink-faint focus:outline-none disabled:cursor-not-allowed"
          />
          <button
            type="button"
            disabled
            aria-label="Send query"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-hard text-ink-faint disabled:cursor-not-allowed"
          >
            <SendHorizontal size={14} />
          </button>
        </div>
      </div>
    </GlassPanel>
  );
}
