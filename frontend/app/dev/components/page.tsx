import { Eyebrow } from "@/components/system/Eyebrow";
import { GlassPanel } from "@/components/system/GlassPanel";
import { Button } from "@/components/system/Button";
import { StatChip } from "@/components/system/StatChip";
import { StatBar } from "@/components/system/StatBar";

function Section({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-line py-10 first:pt-0 last:border-b-0">
      <Eyebrow index={index}>{title}</Eyebrow>
      <div className="mt-6 flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

/**
 * Internal review route — not part of the product. Every design-system
 * primitive rendered in isolation, per the implementation plan's Phase 1:
 * cheaper to fix a motion curve here than after it's used in 12 places.
 */
export default function ComponentGallery() {
  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-6 py-16">
      <header className="mb-12">
        <Eyebrow tone="dim">Internal · not part of the product</Eyebrow>
        <h1 className="mt-4 font-display text-section font-semibold text-ink">
          Component gallery
        </h1>
        <p className="mt-2 text-small text-ink-dim">
          Design-system primitives, reviewed in isolation before wiring into
          real screens.
        </p>
      </header>

      <Section index={1} title="Eyebrow">
        <div className="flex flex-col gap-3">
          <Eyebrow>Signal detected</Eyebrow>
          <Eyebrow tone="dim">Scene loaded</Eyebrow>
          <Eyebrow tone="alert">Anomaly flagged</Eyebrow>
          <Eyebrow index={1}>Draw a region</Eyebrow>
          <Eyebrow index={2}>Confirm bounds</Eyebrow>
        </div>
      </Section>

      <Section index={2} title="Button">
        <Button variant="primary">Run query</Button>
        <Button variant="ghost">Reset view</Button>
        <Button variant="primary" disabled>
          Processing
        </Button>
      </Section>

      <Section index={3} title="StatChip">
        <StatChip label="confidence" value={94} unit="%" tone="signal" />
        <StatChip label="anomalies" value={3} tone="alert" />
        <StatChip label="coverage" value={100} unit="%" tone="good" />
        <StatChip label="cloud" value={12.4} unit="%" decimals={1} tone="dim" />
      </Section>

      <Section index={4} title="StatBar">
        <div className="flex w-full flex-col gap-5">
          <StatBar label="forest loss" value={38} tone="alert" />
          <StatBar label="water coverage" value={71} tone="signal" />
          <StatBar label="scene confidence" value={94} tone="good" />
        </div>
      </Section>

      <Section index={5} title="GlassPanel">
        <GlassPanel variant="soft" className="w-64 p-5">
          <p className="font-mono text-micro uppercase tracking-[0.12em] text-ink-faint">
            variant=&quot;soft&quot;
          </p>
          <p className="mt-2 text-small text-ink-dim">
            Floating overlay panel — evidence panel, toasts, popovers.
          </p>
        </GlassPanel>
        <GlassPanel variant="hard" scanlines className="w-64 p-5">
          <p className="font-mono text-micro uppercase tracking-[0.12em] text-ink-faint">
            variant=&quot;hard&quot;
          </p>
          <p className="mt-2 text-small text-ink-dim">
            Fixed dock — chat panel, timeline bar. Scanline texture shown.
          </p>
        </GlassPanel>
      </Section>

      <Section index={6} title="Type scale">
        <div className="flex flex-col gap-3">
          <p className="font-display text-display-lg text-ink">Aa 68</p>
          <p className="font-display text-display-sm text-ink">Aa 42</p>
          <p className="font-display text-section text-ink">Aa 26</p>
          <p className="font-sans text-subhead text-ink">Aa 19 subhead</p>
          <p className="font-sans text-body text-ink">Aa 15 body</p>
          <p className="font-sans text-small text-ink-dim">Aa 13 small</p>
          <p className="font-mono text-caption uppercase tracking-wide text-ink-dim">
            Aa 12 caption
          </p>
          <p className="font-mono text-micro uppercase tracking-wide text-ink-faint">
            Aa 10 micro / telemetry
          </p>
        </div>
      </Section>

      <Section index={7} title="Color">
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {[
            ["void", "bg-void"],
            ["void-2", "bg-void-2"],
            ["void-3", "bg-void-3"],
            ["line", "bg-line"],
            ["ink", "bg-ink"],
            ["ink-dim", "bg-ink-dim"],
            ["signal", "bg-signal"],
            ["signal-dim", "bg-signal-dim"],
            ["alert", "bg-alert"],
            ["good", "bg-good"],
          ].map(([name, cls]) => (
            <div key={name} className="flex flex-col gap-1.5">
              <div className={`h-12 w-full rounded-hard border border-line ${cls}`} />
              <span className="font-mono text-micro text-ink-faint">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section index={8} title="Cursor">
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          <div
            data-cursor="map"
            className="flex h-24 items-center justify-center rounded-soft border border-line bg-void-2 font-mono text-micro uppercase tracking-wide text-ink-faint"
          >
            data-cursor=&quot;map&quot;
          </div>
          <div
            data-cursor="draw"
            className="flex h-24 items-center justify-center rounded-soft border border-line bg-void-2 font-mono text-micro uppercase tracking-wide text-ink-faint"
          >
            data-cursor=&quot;draw&quot;
          </div>
          <div
            data-cursor="action"
            className="flex h-24 items-center justify-center rounded-soft border border-line bg-void-2 font-mono text-micro uppercase tracking-wide text-ink-faint"
          >
            data-cursor=&quot;action&quot;
          </div>
        </div>
        <p className="w-full font-mono text-micro text-ink-faint">
          Disabled automatically on touch / coarse-pointer devices. Move your
          pointer over each box above.
        </p>
      </Section>
    </main>
  );
}
