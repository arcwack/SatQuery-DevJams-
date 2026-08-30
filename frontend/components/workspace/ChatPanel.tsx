"use client";

import { useState, useRef, useEffect } from "react";
import { SendHorizontal, Sparkles, Loader } from "lucide-react";
import { Eyebrow } from "@/components/system/Eyebrow";
import { GlassPanel } from "@/components/system/GlassPanel";
import { useMapStore } from "@/lib/store";
import { postQuery } from "@/lib/api";
import { viewGeometry } from "@/lib/geo";

const SUGGESTED_PROMPTS = [
  "What's visible here?",
  "Find all water bodies",
  "Show areas near the river where construction increased",
  "Name all water bodies and rank them biggest to smallest",
  "What changed here over time?",
];

export function ChatPanel() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = useMapStore((s) => s.messages);
  const sending = useMapStore((s) => s.sending);
  const addMessage = useMapStore((s) => s.addMessage);
  const setSending = useMapStore((s) => s.setSending);
  const setHighlights = useMapStore((s) => s.setHighlights);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    addMessage("user", trimmed);
    setInput("");
    setSending(true);

    try {
      const geometry = useMapStore.getState().geometry ?? viewGeometry();
      if (!geometry) throw new Error("Map not ready yet — draw a region or wait a moment.");
      const result = await postQuery({ geometry, query: trimmed });
      addMessage("assistant", result.reply);
      setHighlights(result.highlights);
    } catch (err) {
      addMessage(
        "assistant",
        `Error: ${err instanceof Error ? err.message : "Query failed."}`,
      );
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
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

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !sending && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-hard border border-line text-ink-faint">
              <Sparkles size={15} strokeWidth={1.5} />
            </div>
            <p className="max-w-[26ch] text-small text-ink-dim">
              Ask about any location, any year. Draw a region on the map to
              analyze it directly.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[92%] rounded-hard border px-3 py-2 text-left ${
              msg.role === "user"
                ? "self-end border-line bg-void-3/60 text-ink"
                : "self-start border-line bg-void-2/80 text-ink-dim"
            }`}
          >
            <p className="text-caption font-medium uppercase tracking-wider text-ink-faint">
              {msg.role === "user" ? "You" : "System"}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-small leading-relaxed">{msg.text}</p>
          </div>
        ))}

        {sending && (
          <div className="self-start max-w-[92%] rounded-hard border border-line bg-void-2/80 px-3 py-2">
            <p className="text-caption font-medium uppercase tracking-wider text-ink-faint">
              System
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <Loader size={12} className="animate-spin text-signal" />
              <span className="text-small text-ink-dim">Analyzing…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-line px-4 py-4">
        <Eyebrow tone="dim" className="mb-2.5">
          Suggested
        </Eyebrow>
        <div className="mb-3 flex flex-col gap-1.5">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              data-cursor="action"
              onClick={() => handleSend(prompt)}
              className="rounded-hard border border-line bg-void-3/50 px-3 py-2 text-left text-caption text-ink-dim transition-colors hover:border-line-bright hover:text-ink"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-hard border border-line bg-void-3/60 px-3 py-2.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Query the archive…"
            className="w-full bg-transparent text-small text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <button
            type="button"
            onClick={() => handleSend(input)}
            disabled={!input.trim() || sending}
            aria-label="Send query"
            data-cursor="action"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-hard text-ink-faint transition-colors hover:text-signal disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SendHorizontal size={14} />
          </button>
        </div>
      </div>
    </GlassPanel>
  );
}
