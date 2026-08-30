import Link from "next/link";
import { EarthScene3D } from "@/components/EarthScene3D";
import { LiveCoordinates } from "@/components/LiveCoordinates";
import { ScrollSection, ScrollStory } from "@/components/ScrollStory";
import { FeatureSections } from "@/components/FeatureSections";
import { UseCasesClosing } from "@/components/UseCasesClosing";

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-void text-ink">
      <EarthScene3D />

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
          <LiveCoordinates />
        </header>

        <ScrollStory>
          {/* Hero / section 01 */}
          <ScrollSection index={1} label="SECTION 01 // ORBITAL BRIEF" className="min-h-[calc(100svh-3rem)] pt-8">
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
          </ScrollSection>

          <FeatureSections />
          <UseCasesClosing />

        </ScrollStory>
      </div>
    </main>
  );
}
