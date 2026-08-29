import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { NoiseOverlay } from "./NoiseOverlay";

type GlassPanelProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * "soft" — floating panel: rounded-soft (16px), blurred glass, subtle
   *          border. For panels that read as overlays — evidence panel,
   *          toasts, popovers.
   * "hard" — fixed dock: radius-hard (0px) on the outward-facing edge,
   *          heavier border, less blur. For panels that read as part of
   *          the instrument frame itself — the chat dock, the timeline
   *          bar. Panels are not styled uniformly on purpose: uniform
   *          glass everywhere is what reads as "component library."
   */
  variant?: "soft" | "hard";
  /** Adds a faint scanline texture on top — reserve for map/glass surfaces. */
  scanlines?: boolean;
};

export function GlassPanel({
  variant = "soft",
  scanlines = false,
  className,
  children,
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border",
        variant === "soft" &&
          "rounded-soft border-line bg-void-2/70 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]",
        variant === "hard" && "rounded-hard border-line-bright bg-void-2/90 backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      {scanlines && <NoiseOverlay variant="scanlines" />}
      <div className="relative">{children}</div>
    </div>
  );
}
