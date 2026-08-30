"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { EarthSatellite } from "@/components/EarthSatellite";
import { SatelliteBackdrop } from "@/components/SatelliteBackdrop";
import { Eyebrow } from "@/components/system/Eyebrow";

const FUN_FACTS = [
  { title: "90% of the Aral Sea", body: "The Aral Sea has lost roughly 90% of its volume since the 1960s — one of the fastest human-driven environmental changes ever filmed from space." },
  { title: "705 km up", body: "Sun-synchronous satellites orbit about 705 km above the surface, circling the planet roughly every 90 minutes." },
  { title: "A planet a day", body: "A single satellite can image the entire Earth in one day — enough to watch seasons shift and cities sprawl." },
  { title: "Green from orbit", body: "NDVI measures plant health from space: healthy vegetation reflects near-infrared strongly, so forests glow green in the data." },
  { title: "Meters, not guesses", body: "Modern sensors resolve features just a few metres across — a new construction site is visible within months, not years." },
  { title: "Cloud-free composites", body: "Satellites combine many passes to strip out clouds, giving clean, comparable images of the same place over decades." },
];

export default function Home() {
  const { scrollYProgress } = useScroll();
  const x = useTransform(
    scrollYProgress,
    [0, 0.28, 0.56, 0.82, 1],
    ["52vw", "10vw", "52vw", "10vw", "40vw"],
  );
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.1, 1.3, 1.1]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 45]);

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-void text-ink">
      <SatelliteBackdrop />

      {/* Drifting satellite — swings left/right as you scroll */}
      <motion.div
        style={{ x, scale, rotate }}
        className="pointer-events-none fixed left-0 top-[12%] z-20"
      >
        <EarthSatellite />
      </motion.div>

      <div className="relative z-10">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 pt-5 sm:px-10">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-[15px] font-bold tracking-[0.02em] text-ink">
              SATQUERY
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim sm:inline">
              Satellite Intelligence Platform
            </span>
          </div>
          <div className="hidden text-right font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-ink-dim md:block">
            <p data-numeric="true">34.8522° N · 118.2437° W</p>
            <p>ALT 705KM · SUN SYNC</p>
          </div>
        </header>

        {/* Hero */}
        <section className="flex min-h-[calc(100svh-3rem)] items-center px-6 sm:px-10">
          <div className="max-w-xl">
            <p className="text-small leading-relaxed text-ink">
              Ask questions about satellite imagery. Get answers directly on the map.
            </p>
            <Link
              href="/workspace"
              data-cursor="action"
              className="mt-5 inline-flex items-center gap-2 rounded-hard bg-[#8CFFBE] px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#05070b] transition-colors duration-150 hover:bg-white"
            >
              Enter workspace →
            </Link>
            <h1 className="mt-8 font-display text-4xl font-semibold uppercase leading-[1.02] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Talk to the earth.
              <br />
              Understand
              <br />
              the change.
            </h1>
          </div>
        </section>

        {/* Fun facts */}
        <section className="px-6 pb-24 pt-12 sm:px-10">
          <Eyebrow tone="signal">Did you know?</Eyebrow>
          <h2 className="mt-4 font-display text-section font-semibold text-ink">
            Our changing planet
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FUN_FACTS.map((fact) => (
              <article
                key={fact.title}
                className="rounded-soft border border-line bg-void-2/70 p-5 backdrop-blur-sm"
              >
                <h3 className="font-display text-subhead font-semibold text-ink">{fact.title}</h3>
                <p className="mt-2 text-small leading-relaxed text-ink-dim">{fact.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Corner telemetry */}
        <footer className="flex items-end justify-between px-6 pb-6 sm:px-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8CFFBE]/70">
            Scanning · Grid 478
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8CFFBE]/70">
            NDVI Anomaly +0.14
          </span>
        </footer>
      </div>
    </main>
  );
}
