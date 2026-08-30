"use client";

import * as React from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const MINT = "#8CFFBE";
const CYAN = "#b9e7e5";

interface FeatureShellProps {
  index: number;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  reverse?: boolean;
}

function FeatureShell({ index, eyebrow, title, description, children, reverse = false }: FeatureShellProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 0.35, 0.65, 1], [reverse ? 70 : -70, 0, 0, reverse ? -35 : 35]);
  const opacity = useTransform(scrollYProgress, [0, 0.22, 0.78, 1], [0, 1, 1, 0]);
  return (
    <section ref={ref} id={`section-${String(index).padStart(2, "0")}`} className="relative flex min-h-dvh items-center px-6 py-24 sm:px-10">
      <div className={`mx-auto flex w-full max-w-6xl flex-col items-center gap-12 lg:flex-row lg:gap-20 ${reverse ? "lg:flex-row-reverse" : ""}`}>
        <motion.div className="w-full lg:flex-1" style={{ x, opacity }}>{children}</motion.div>
        <div className="w-full max-w-xl lg:flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">{eyebrow}</p>
          <h2 className="mt-4 font-display text-5xl font-semibold uppercase leading-[0.94] tracking-[-0.05em] text-ink sm:text-6xl">{title}</h2>
          <p className="mt-6 max-w-md text-small leading-relaxed text-ink-dim">{description}</p>
        </div>
      </div>
    </section>
  );
}

function MapGrid() {
  return <><path d="M0 42H520M0 84H520M0 126H520M0 168H520M52 0V210M104 0V210M156 0V210M208 0V210M260 0V210M312 0V210M364 0V210M416 0V210M468 0V210" stroke="#b9e7e5" opacity=".12" /><path d="M18 184L80 154 108 160 148 116 188 130 220 88 260 108 312 54 352 72 405 42 478 68 510 28" fill="none" stroke="#b9e7e5" opacity=".28" strokeWidth="1.5" /></>;
}

function SatelliteImage({ after = false }: { after?: boolean }) {
  return <svg viewBox="0 0 520 210" className="absolute inset-0 size-full" aria-hidden="true">
    <rect width="520" height="210" fill={after ? "#263b3b" : "#1b3034"} />
    <MapGrid />
    <path d={after ? "M12 166L104 146 174 158 240 120 310 142 390 94 520 112V210H12Z" : "M12 178L104 168 174 170 240 156 310 164 390 148 520 154V210H12Z"} fill={after ? "#477e55" : "#355b51"} opacity=".8" />
    <path d="M0 46C72 64 116 25 180 46S290 72 344 38 444 32 520 54" fill="none" stroke="#b9e7e5" opacity=".5" strokeWidth="2" />
    <circle cx="382" cy="92" r={after ? 34 : 20} fill={after ? "#8CFFBE" : "#58786b"} opacity=".38" />
  </svg>;
}

function TimeMachineVisual() {
  const [split, setSplit] = React.useState(52);
  return <div className="relative aspect-[520/260] w-full overflow-hidden rounded-sm border border-line bg-void-2 shadow-2xl">
    <SatelliteImage />
    <div className="absolute inset-y-0 right-0 overflow-hidden" style={{ width: `${100 - split}%` }}><SatelliteImage after /></div>
    <label className="absolute inset-y-0 z-10 block w-6 -translate-x-1/2 cursor-ew-resize" style={{ left: `${split}%` }}>
      <input aria-label="Compare 2018 and 2026 imagery" type="range" min="5" max="95" value={split} onChange={(event) => setSplit(Number(event.target.value))} className="sr-only" />
      <span className="absolute inset-y-0 left-1/2 w-px bg-ink shadow-[0_0_12px_rgba(255,255,255,.8)]" />
      <span className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink bg-void/80 text-center font-mono text-[13px] leading-7 text-ink">↔</span>
    </label>
    <div className="absolute inset-x-3 top-3 flex justify-between font-mono text-[9px] uppercase tracking-[.16em] text-ink"><span>2018</span><span>2026</span></div>
    <p className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[.14em] text-ink">Vegetation −27% · Built-up +41%</p>
  </div>;
}

function RegionVisual() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, .45, .8, 1], [.72, 1, 1, .9]);
  return <motion.div ref={ref} style={{ scale }} className="relative aspect-[520/260] w-full overflow-hidden rounded-sm border border-line bg-[#0d1a22] p-4">
    <svg viewBox="0 0 520 210" className="size-full" aria-hidden="true"><MapGrid /><path d="M94 158L132 52 282 28 408 82 374 176 218 192Z" fill="rgba(140,255,190,.08)" stroke={MINT} strokeWidth="2" strokeDasharray="5 4" /><circle cx="132" cy="52" r="3" fill={MINT} /><circle cx="282" cy="28" r="3" fill={MINT} /><circle cx="408" cy="82" r="3" fill={MINT} /><circle cx="374" cy="176" r="3" fill={MINT} /></svg>
    <div className="absolute bottom-4 right-4 border border-line bg-void/80 p-3 font-mono text-[10px] uppercase leading-6 tracking-[.12em] text-ink"><p>Vegetation <b className="text-signal">38%</b></p><p>Water <b className="text-signal">06%</b></p><p>Built-up <b className="text-signal">22%</b></p></div>
  </motion.div>;
}

function AnomalyVisual() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);
  return <motion.div ref={ref} style={{ y }} className="relative aspect-[520/260] w-full overflow-hidden rounded-sm border border-line bg-[#111b28] p-4"><svg viewBox="0 0 520 210" className="size-full" aria-hidden="true"><MapGrid /><path d="M30 178L110 140 192 156 272 94 344 112 430 70 510 86" fill="none" stroke="#b9e7e5" opacity=".35" strokeWidth="2" /><circle cx="330" cy="104" r="42" fill="#ffcf88" opacity=".08" className="animate-anomaly-pulse" /><circle cx="330" cy="104" r="24" fill="#ffcf88" opacity=".18" className="animate-anomaly-pulse" /><circle cx="330" cy="104" r="7" fill="#ffcf88" /><path d="M330 58V150M284 104H376" stroke="#ffcf88" opacity=".35" strokeDasharray="3 5" /></svg><div className="absolute left-7 top-7 border border-[#ffcf88]/50 bg-void/80 p-3 font-mono text-[10px] uppercase tracking-[.11em] text-ink"><span className="text-[#ffcf88]">Alert / 07:42 UTC</span><br />Anomaly flagged</div></motion.div>;
}

function ProximityVisual() {
  return <div className="relative aspect-[520/260] w-full overflow-hidden rounded-sm border border-line bg-[#0d1921] p-4"><div className="absolute left-5 right-5 top-5 border-b border-line pb-3 font-mono text-[10px] uppercase tracking-[.12em] text-ink-dim">&gt; New construction near the reservoir</div><svg viewBox="0 0 520 210" className="mt-10 size-full" aria-hidden="true"><MapGrid /><path d="M102 135C124 84 191 64 247 82S337 132 309 169 207 190 150 170Z" fill="#4d91a1" opacity=".55" /><circle cx="225" cy="128" r="76" fill="none" stroke={MINT} strokeWidth="2" strokeDasharray="7 5" opacity=".8" /><path d="M318 56l28 12-10 26-32-4zM382 70l32 9-12 28-36-8zM424 120l31 8-9 28-34-6z" fill={MINT} opacity=".75" /><text x="360" y="190" fill={MINT} fontFamily="monospace" fontSize="13">14 RESULTS</text></svg></div>;
}

function CapabilityCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <article className="flex min-w-0 flex-col rounded-soft border border-line bg-void-2/65 p-3 backdrop-blur-sm">
      <div className="aspect-[520/260] w-full">{children}</div>
      <h3 className="mt-5 font-display text-2xl font-semibold uppercase leading-none tracking-[-0.04em] text-ink">{title}</h3>
      <p className="mt-3 text-small leading-relaxed text-ink-dim">{description}</p>
    </article>
  );
}

function CapabilitiesRow() {
  const ref = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 0.35, 0.7, 1], [28, 0, 0, -18]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <section ref={ref} id="section-02" className="relative px-6 py-28 sm:px-10">
      <motion.div style={{ y, opacity }} className="mx-auto w-full max-w-6xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">SECTION 02 // CAPABILITIES</p>
        <h2 className="mt-5 max-w-3xl font-display text-5xl font-semibold uppercase leading-[0.92] tracking-[-0.06em] text-ink sm:text-6xl">Three ways to see it.</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <CapabilityCard title="Time machine" description="2018 → 2026: vegetation −27%, built-up +41%."><TimeMachineVisual /></CapabilityCard>
          <CapabilityCard title="Draw a region" description="Vegetation 38% · Water 6% · Built-up 22%."><RegionVisual /></CapabilityCard>
          <CapabilityCard title="Proximity queries" description="New construction near the reservoir — 14 results."><ProximityVisual /></CapabilityCard>
        </div>
      </motion.div>
    </section>
  );
}

export function FeatureSections() {
  return <>
    <CapabilitiesRow />
    <FeatureShell index={3} eyebrow="SECTION 03 // PROACTIVE ANOMALY DETECTION" title="Proactive anomaly detection" description="SatQuery watches for sharp departures in the signal and flags them before you ask."><AnomalyVisual /></FeatureShell>
  </>;
}
