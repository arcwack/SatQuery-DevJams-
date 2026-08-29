"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Custom targeting-reticle cursor.
 *
 * States, set by adding `data-cursor="..."` to any hovered ancestor:
 *  - (none)  → small crosshair dot, default
 *  - "map"   → crosshair expands into a bracketed focus-square reticle
 *  - "draw"  → reticle becomes a dashed square (draw-tool active state)
 *  - "action"→ reticle shrinks and fills solid (buttons / links)
 *
 * Additive only: every element still needs a real :hover/:focus-visible
 * state, since this is disabled entirely on touch/coarse-pointer devices
 * and must never be the sole affordance.
 */
type CursorState = "default" | "map" | "draw" | "action";

export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<CursorState>("default");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setEnabled(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-custom-cursor", String(enabled));
    return () => document.body.removeAttribute("data-custom-cursor");
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const move = (e: PointerEvent) => {
      if (!visible) setVisible(true);
      const el = dotRef.current;
      if (el) {
        el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
      const target = (e.target as HTMLElement)?.closest?.("[data-cursor]");
      const next = (target?.getAttribute("data-cursor") as CursorState) || "default";
      setState((prev) => (prev === next ? prev : next));
    };

    const leave = () => setVisible(false);

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("mouseleave", leave);
    };
  }, [enabled, visible]);

  if (!enabled) return null;

  return (
    <div
      ref={dotRef}
      aria-hidden="true"
      data-state={state}
      className="cursor-reticle"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <span className="cursor-reticle__mark" />
      <style jsx>{`
        .cursor-reticle {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 10000;
          pointer-events: none;
          mix-blend-mode: difference;
          transition: opacity 150ms var(--ease-signature);
          will-change: transform;
        }
        .cursor-reticle__mark {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          transform: translate(-50%, -50%);
          border-radius: 2px;
          transition:
            width 180ms var(--ease-signature),
            height 180ms var(--ease-signature),
            border-radius 180ms var(--ease-signature),
            background-color 180ms var(--ease-signature),
            border-color 180ms var(--ease-signature);
        }

        /* default: 12px crosshair dot */
        .cursor-reticle[data-state="default"] .cursor-reticle__mark {
          width: 12px;
          height: 12px;
          background: transparent;
          border: 1.5px solid var(--color-signal);
          border-radius: 999px;
        }

        /* map: bracketed focus-square, camera-focus style */
        .cursor-reticle[data-state="map"] .cursor-reticle__mark {
          width: 28px;
          height: 28px;
          background: transparent;
          border: 1.5px solid var(--color-signal);
          border-radius: 2px;
          box-shadow:
            inset 0 0 0 3px transparent;
        }

        /* draw: dashed square, matches active draw-tool cursor */
        .cursor-reticle[data-state="draw"] .cursor-reticle__mark {
          width: 24px;
          height: 24px;
          background: transparent;
          border: 1.5px dashed var(--color-signal-bright);
          border-radius: 0px;
        }

        /* action: shrinks + fills solid — clickable affordance */
        .cursor-reticle[data-state="action"] .cursor-reticle__mark {
          width: 7px;
          height: 7px;
          background: var(--color-signal);
          border: 1.5px solid var(--color-signal);
          border-radius: 999px;
        }
      `}</style>
    </div>
  );
}
