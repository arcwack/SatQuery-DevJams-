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

      <section id="section-04" className="relative px-6 pb-24 pt-28 sm:px-10">
        <motion.div className="mx-auto w-full max-w-6xl" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.6 }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">SECTION 04 // PLANETARY SIGNAL</p>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-signal">Did you know?</p>
          <h2 className="mt-4 font-display text-5xl font-semibold uppercase leading-[0.92] tracking-[-0.06em] text-ink sm:text-6xl">Our changing planet</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["90% of the Aral Sea", "The Aral Sea has lost roughly 90% of its volume since the 1960s — one of the fastest human-driven environmental changes ever filmed from space."],
              ["705 km up", "Sun-synchronous satellites orbit about 705 km above the surface, circling the planet roughly every 90 minutes."],
              ["A planet a day", "A single satellite can image the entire Earth in one day — enough to watch seasons shift and cities sprawl."],
              ["Green from orbit", "NDVI measures plant health from space: healthy vegetation reflects near-infrared strongly, so forests glow green in the data."],
              ["Meters, not guesses", "Modern sensors resolve features just a few metres across — a new construction site is visible within months, not years."],
              ["Cloud-free composites", "Satellites combine many passes to strip out clouds, giving clean, comparable images of the same place over decades."],
            ].map(([title, body]) => (
              <article key={title} className="rounded-soft border border-line bg-void-2/70 p-5 backdrop-blur-sm">
                <h3 className="font-display text-subhead font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-small leading-relaxed text-ink-dim">{body}</p>
              </article>
            ))}
          </div>
        </motion.div>
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
