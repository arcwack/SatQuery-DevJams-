"use client";

import * as React from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

interface ScrollSectionProps {
  index: number;
  label: string;
  children?: React.ReactNode;
  className?: string;
}

interface ScrollRailProps {
  labels: string[];
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}

const sectionLabels = [
  "SECTION 01 // ORBITAL BRIEF",
  "SECTION 02 // TIME MACHINE",
  "SECTION 03 // DRAW A REGION",
  "SECTION 04 // PROACTIVE ANOMALY DETECTION",
  "SECTION 05 // PROXIMITY QUERIES",
  "SECTION 06 // PLANETARY SIGNAL",
];

export function ScrollSection({ index, label, children, className = "" }: ScrollSectionProps) {
  const ref = React.useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.18, 0.5, 0.82, 1], [0, 1, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.22, 0.78, 1], [0.96, 1, 1, 0.97]);
  const y = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [32, 0, 0, -24]);

  return (
    <section ref={ref} id={`section-${String(index).padStart(2, "0")}`} className={`relative flex min-h-dvh items-center px-6 py-24 sm:px-10 ${className}`}>
      <motion.div
        className="w-full"
        style={reduceMotion ? undefined : { opacity, scale, y }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">{label}</p>
        {children}
      </motion.div>
    </section>
  );
}

function ScrollRail({ labels, progress }: ScrollRailProps) {
  const reduceMotion = useReducedMotion();
  const railScale = useTransform(progress, [0, 1], [0, 1]);
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    return progress.on("change", (value) => {
      setActive(Math.min(labels.length - 1, Math.floor(value * labels.length)));
    });
  }, [labels.length, progress]);

  return (
    <nav aria-label="Page sections" className="fixed right-4 top-1/2 z-30 hidden h-64 -translate-y-1/2 sm:block">
      <div className="absolute inset-y-0 right-1/2 w-px translate-x-1/2 bg-line/70" aria-hidden="true" />
      <motion.div
        className="absolute right-1/2 top-0 w-px origin-top translate-x-1/2 bg-signal"
        style={reduceMotion ? { height: "100%" } : { height: "100%", scaleY: railScale }}
        aria-hidden="true"
      />
      <ol className="relative flex h-full flex-col items-center justify-between">
        {labels.map((label, index) => (
          <li key={label}>
            <a
              href={`#section-${String(index + 1).padStart(2, "0")}`}
              aria-label={label}
              aria-current={active === index ? "step" : undefined}
              className="group relative flex size-3 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
            >
              <span className={`size-1.5 rounded-full border transition-all duration-200 ${active === index ? "scale-150 border-signal bg-signal" : "border-ink-dim bg-void"}`} />
              <span className="pointer-events-none absolute right-5 hidden whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.14em] text-ink-dim group-hover:block group-focus-visible:block">
                {label}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ScrollStory({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  return (
    <div ref={ref} className="relative">
      <ScrollRail labels={sectionLabels} progress={scrollYProgress} />
      {children}
    </div>
  );
}

export { sectionLabels };
