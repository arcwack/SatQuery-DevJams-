import Link from "next/link";
import { EarthSatellite } from "@/components/EarthSatellite";
import { SatelliteBackdrop } from "@/components/SatelliteBackdrop";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-void text-ink">
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

      {/* Hero — text left, globe right */}
      <div className="relative z-10 flex flex-1 flex-col-reverse items-center justify-between gap-8 px-6 py-10 sm:px-10 md:flex-row md:items-center">
        <div className="max-w-md md:pb-10">
          <p className="text-small leading-relaxed text-ink">
            Ask questions about satellite imagery. Get answers directly on the map.
          </p>

          <Link
            href="/workspace"
            data-cursor="action"
            className="mt-5 inline-flex items-center gap-2 rounded-hard bg-[#00E5FF] px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#03151B] transition-colors duration-150 hover:bg-[#7FF7FF]"
          >
            Enter workspace →
          </Link>

          <h1 className="mt-10 font-display text-display-sm font-semibold uppercase leading-[0.98] tracking-tight text-ink sm:text-display-lg">
            Talk to the earth.
            <br />
            Understand
            <br />
            the change.
          </h1>
        </div>

        <div className="flex-shrink-0 origin-center scale-[0.82] sm:scale-100">
          <EarthSatellite />
        </div>
      </div>

      {/* Corner telemetry */}
      <footer className="relative z-10 flex items-end justify-between px-6 pb-6 sm:px-10">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#00E5FF]/70">
          Scanning · Grid 478
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#00E5FF]/70">
          NDVI Anomaly +0.14
        </span>
      </footer>
    </main>
  );
}
