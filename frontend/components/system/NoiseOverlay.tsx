import { cn } from "@/lib/utils";

type NoiseOverlayProps = {
  /**
   * "grain"     — fractal-noise texture, same recipe as the global body
   *               overlay, scoped to one surface at a slightly higher
   *               opacity (used sparingly, e.g. evidence-panel imagery).
   * "scanlines" — faint static horizontal lines. Not animated — presence,
   *               not motion, is what sells "screen" / "sensor readout."
   *               Reserved for map surfaces and glass panels per the
   *               design language, not applied everywhere.
   */
  variant?: "grain" | "scanlines";
  className?: string;
};

/**
 * Absolutely-positioned texture layer. Mount inside a `relative` parent.
 * The global body-level grain (see globals.css) already covers the whole
 * app at 2.5% — this component is for surfaces that need texture on top
 * of their own background (glass panels, map canvas), not a replacement
 * for it.
 */
export function NoiseOverlay({ variant = "grain", className }: NoiseOverlayProps) {
  if (variant === "scanlines") {
    return (
      <div
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-0 opacity-[0.05]", className)}
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, var(--color-ink) 0px, var(--color-ink) 1px, transparent 1px, transparent 3px)",
        }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        backgroundRepeat: "repeat",
      }}
    />
  );
}
