"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import * as React from "react";

const USE_CASES = [
  { title: "Disaster response", body: "Compare new imagery after a flood to identify cut roads, damaged roofs, and isolated neighborhoods." },
  { title: "Urban planning", body: "Measure where new construction is spreading before the next zoning review or site visit." },
  { title: "Agriculture & water monitoring", body: "Track vegetation stress beside reservoirs to spot irrigation gaps before yields fall." },
  { title: "Environmental tracking", body: "Follow shoreline retreat and land-cover change across the same coordinates over time." },
];

export function UseCasesClosing() {
  const ref = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 0.35, 0.75, 1], [30, 0, 0, -20]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0.7]);

  return (
    <>
      <section ref={ref} id="section-03" className="relative px-6 py-28 sm:px-10">
        <motion.div style={{ y, opacity }} className="mx-auto w-full max-w-6xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">SECTION 03 // USE CASES</p>
          <h2 className="mt-5 max-w-2xl font-display text-5xl font-semibold uppercase leading-[0.92] tracking-[-0.06em] text-ink sm:text-6xl">Built for the questions that matter.</h2>
          <div className="mt-14 grid gap-x-10 gap-y-10 border-t border-line pt-8 sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map((useCase) => (
              <article key={useCase.title}>
                <h3 className="font-display text-xl font-semibold uppercase leading-tight tracking-[-0.03em] text-ink">{useCase.title}</h3>
                <p className="mt-3 max-w-xs text-small leading-relaxed text-ink-dim">{useCase.body}</p>
              </article>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="section-04" className="relative flex min-h-[78svh] items-center justify-center overflow-hidden px-6 py-28 text-center sm:px-10">
        <div className="pointer-events-none absolute left-1/2 top-1/2 size-[min(72vw,620px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d9f3ff]/20" aria-hidden="true" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 size-[min(50vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d9f3ff]/10" aria-hidden="true" />
        <div className="relative z-10 max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">SECTION 04 // ORBITAL BRIEF</p>
          <h2 className="mt-5 font-display text-5xl font-semibold uppercase leading-[0.9] tracking-[-0.06em] text-ink sm:text-7xl">Ask the earth.</h2>
          <p className="mx-auto mt-6 max-w-md text-small leading-relaxed text-ink-dim">Turn satellite imagery into a clear answer about the place and change you need to understand.</p>
          <Link href="/workspace" data-cursor="action" className="mt-8 inline-flex items-center gap-2 rounded-hard bg-[#8CFFBE] px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#05070b] transition-colors duration-150 hover:bg-white">Enter workspace →</Link>
        </div>
      </section>

      <footer className="flex flex-col gap-5 border-t border-line px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <span className="font-display text-[15px] font-bold tracking-[0.02em] text-ink">SATQUERY</span>
        <nav aria-label="Footer links" className="flex gap-6 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim">
          <Link href="/workspace" className="transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal">Workspace</Link>
          <a href="https://github.com/shubhangi14r/SatQuery-DevJams-" className="transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal">GitHub</a>
        </nav>
      </footer>
    </>
  );
}
