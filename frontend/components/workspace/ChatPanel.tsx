"use client";

import { useRef, useState } from "react";
import { SendHorizontal, Sparkles } from "lucide-react";
import { Eyebrow } from "@/components/system/Eyebrow";
import { GlassPanel } from "@/components/system/GlassPanel";
import { useMapStore } from "@/lib/store";
import { detectFeatures } from "@/lib/api";
import { viewGeometry } from "@/lib/geo";

const SUGGESTED_PROMPTS = [
  "What's visible here?",
  "Find all water bodies",
  "Highlight vegetation",
  "Highlight built-up areas",
];

/**
 * Fixed instrument dock. Sends plain-language queries to /api/detect, which
 * classifies the area, replies in text, and highlights the detected features
 * directly on the map.
 */
export function ChatPanel() {
  const messages = useMapStore((s) => s.messages);
  const sending = useMapStore((s) => s.sending);
  const addMessage = useMapStore((s) => s.addMessage);
  const setSending = useMapStore((s) => s.setSending);
  const setHighlights = useMapStore((s) => s.setHighlights);
  const [value, setValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const submit = async (raw?: string) => {
    const query = (raw ?? value).trim();
    if (!query || sending) return;
    setValue("");
    addMessage("user", query);

    const state = useMapStore.getState();
    const geometry = state.geometry ?? viewGeometry();
    if (!geometry) {
      addMessage("assistant", "Map not ready yet — try again in a moment.");
      return;
    }

    setSending(true);
    try {
      const result = await detectFeatures({ geometry, query });
      addMessage("assistant", result.reply);
      setHighlights(result.highlights);
    } catch (err) {
      addMessage("assistant", err instanceof Error ? err.message : "Request failed.");
    } finally {
      setSending(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }),
      );
    }
  };

  return (
    <GlassPanel
      variant="hard"
      className="flex h-full w-full flex-col border-l-0 border-t-0 border-b-0"
    >
      <div className="flex h-14 shrink-0 items-center border-b border-line px-4">
        <Eyebrow tone="dim">Query console</Eyebrow>
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-hard border border-line text-ink-faint">
              <Sparkles size={15} strokeWidth={1.5} />
            </div>
            <p className="max-w-[26ch] text-small text-ink-dim">
              Ask what&rsquo;s in the view, or draw a region and ask about it.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-hard border border-line-bright bg-void-3/60 px-3 py-2 text-small text-ink"
                  : "max-w-[85%] rounded-hard border border-line bg-void-2/60 px-3 py-2 text-small text-ink-dim"
              }
            >
              <p className="whitespace-pre-wrap">{m.text}</p>
            </div>
          ))
        )}
        {sending && (
          <div className="max-w-[85%] rounded-hard border border-line bg-void-2/60 px-3 py-2">
            <span className="font-mono text-micro uppercase tracking-[0.12em] text-ink-faint">
              analyzing imagery…
            </span>
          </div>
        )}
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
              disabled={sending}
              onClick={() => submit(prompt)}
              data-cursor="action"
              className="rounded-hard border border-line bg-void-3/50 px-3 py-2 text-left text-caption text-ink-dim transition-colors hover:border-line-bright hover:text-ink disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form
          className="flex items-center gap-2 rounded-hard border border-line bg-void-3/60 px-3 py-2.5 focus-within:border-line-bright"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Query the archive…"
            aria-label="Query"
            className="w-full bg-transparent text-small text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <button
            type="submit"
            disabled={!value.trim() || sending}
            aria-label="Send query"
            data-cursor="action"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-hard text-ink-dim transition-colors hover:text-signal disabled:cursor-not-allowed disabled:text-ink-faint"
          >
            <SendHorizontal size={14} />
          </button>
        </form>
      </div>
    </GlassPanel>
  );
}
