import Link from "next/link";
import { SatelliteBackdrop } from "@/components/SatelliteBackdrop";
import { HeroComposition } from "@/components/HeroComposition";

const FACTS = [
  {
    title: "90% of the Aral Sea",
    body: "The Aral Sea has lost roughly 90% of its volume since the 1960s — one of the fastest human-driven environmental changes ever filmed from space.",
  },
  {
    title: "705 km up",
    body: "Sun-synchronous satellites orbit about 705 km above the surface, circling the planet roughly every 90 minutes.",
  },
  {
    title: "Green from orbit",
    body: "NDVI measures plant health from space: healthy vegetation reflects near-infrared strongly, so forests glow green in the data.",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-void text-ink">
      <SatelliteBackdrop />

      {/* Top bar — brand left, telemetry right */}
      <header className="relative z-20 flex items-center justify-between px-6 pt-5 sm:px-10">
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

      {/* About hero */}
      <section className="relative flex min-h-[calc(100svh-3rem)] items-center px-6 sm:px-10">
        <HeroComposition />
        <div className="relative z-10 max-w-xl">
          <span className="font-mono text-micro uppercase tracking-[0.16em] text-signal">
            01 / About SatQuery
          </span>

          <h1 className="mt-5 font-display text-4xl font-semibold uppercase leading-[1.02] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Ask the planet what changed.
          </h1>

          <p className="mt-4 font-display text-subhead text-ink-dim">
            Less searching. More seeing.
          </p>

          <Link
            href="/workspace"
            data-cursor="action"
            className="mt-8 inline-flex items-center gap-2 rounded-hard bg-signal px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-void transition-colors duration-150 hover:bg-signal-bright"
          >
            Enter workspace →
          </Link>
        </div>
      </section>

      {/* Signal notes */}
      <section className="relative z-10 px-6 pb-24 pt-12 sm:px-10">
        <span className="font-mono text-micro uppercase tracking-[0.16em] text-signal">
          02 / Signal Notes
        </span>
        <h2 className="mt-4 font-display text-section font-semibold text-ink">
          Fun facts, measured from orbit.
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FACTS.map((fact) => (
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

      {/* Footer */}
      <footer className="relative z-10 flex items-end justify-between gap-6 border-t border-line px-6 py-8 sm:px-10">
        <div>
          <p className="font-mono text-micro uppercase tracking-[0.16em] text-signal">
            Signal received
          </p>
          <p className="mt-2 font-display text-subhead font-semibold text-ink">
            Ready to look closer?
          </p>
        </div>
        <Link
          href="/workspace"
          data-cursor="action"
          className="hidden shrink-0 font-mono text-caption uppercase tracking-[0.12em] text-ink underline decoration-line underline-offset-4 transition-colors hover:text-signal sm:inline"
        >
          Open the workspace →
        </Link>
        <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-signal/70 md:block">
          NDVI Anomaly +0.14
        </span>
      </footer>
    </main>
  );
}
