import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type EyebrowProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * Only pass this when the content is an actual sequence (a real step
   * order the reader needs) — not decoration. Renders as a zero-padded
   * mono index instead of the dash.
   */
  index?: number;
  tone?: "signal" | "dim" | "alert";
};

export function Eyebrow({ index, tone = "signal", className, children, ...props }: EyebrowProps) {
  return (
    <div
      className={cn(
        "font-mono text-micro uppercase tracking-[0.14em] inline-flex items-center gap-2",
        tone === "signal" && "text-signal",
        tone === "dim" && "text-ink-faint",
        tone === "alert" && "text-alert",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="opacity-70">
        {typeof index === "number" ? String(index).padStart(2, "0") : "—"}
      </span>
      <span>{children}</span>
    </div>
  );
}
