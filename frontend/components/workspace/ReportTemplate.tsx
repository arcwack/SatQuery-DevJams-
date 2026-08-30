"use client";

import { forwardRef } from "react";
import type { RegionAnalysis } from "@/lib/api";

type ReportTemplateProps = {
  regionResult: RegionAnalysis | null;
  narrative: string | null;
  geometry: unknown | null;
  mapSnapshot: string | null; // dataURL from html2canvas map capture
  center: [number, number] | null;
  timestamp: string;
  leftDate: string;
  rightDate: string;
};

/**
 * Hidden A4 report template — dark aerospace theme (#05070A, signal #8CFFBE).
 * Rendered off-screen (fixed -9999px) for html2canvas capture. Matches spec:
 * Header, Spatial Overview (map snapshot + region meta), Metrics table, AI narrative, Footer.
 */
export const ReportTemplate = forwardRef<HTMLDivElement, ReportTemplateProps>(
  ({ regionResult, narrative, geometry, mapSnapshot, center, timestamp, leftDate, rightDate }, ref) => {
    const areaKm2 = regionResult ? ((regionResult.valid_pixels * 0.01).toFixed(1)) : "—"; // ~10m pixel approx
    const hasResult = !!regionResult;

    return (
      <div
        ref={ref}
        className="fixed left-[-9999px] top-0 w-[794px] bg-[#05070A] p-8 font-mono text-ink"
        style={{ fontFamily: "IBM Plex Mono, monospace" }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#1a2e26] pb-4">
          <div>
            <div className="font-display text-[13px] font-bold tracking-[0.18em] text-[#8CFFBE]">SATQUERY SATELLITE INTELLIGENCE REPORT</div>
            <div className="mt-1 font-mono text-[10px] tracking-[0.1em] text-[#8d9299]">
              SENTINEL-2 / GOOGLE DYNAMIC WORLD ENGINE · 10m TRUE-COLOR
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] tracking-[0.1em] text-[#8d9299]">GENERATED (UTC)</div>
            <div className="font-mono text-[11px] tracking-[0.08em] text-[#ece7db]">{timestamp}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4 font-mono text-[10px] tracking-[0.08em] text-[#8d9299]">
          <span>
            LAT {center ? center[0].toFixed(4) + "°" : "—"} · LON {center ? center[1].toFixed(4) + "°" : "—"}
          </span>
          <span className="h-3 w-px bg-[#262e35]" />
          <span>CONFIDENTIAL</span>
        </div>

        {/* Section 1 — Spatial Overview */}
        <div className="mt-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8CFFBE]">01 — Spatial Overview</div>
          <div className="mt-2 grid grid-cols-[1.35fr_0.65fr] gap-4">
            <div className="overflow-hidden rounded-[8px] border border-[#262e35] bg-[#0a0c0e]">
              {mapSnapshot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mapSnapshot} alt="Map snapshot" className="h-[280px] w-full object-cover" />
              ) : (
                <div className="flex h-[280px] items-center justify-center font-mono text-[10px] uppercase tracking-[0.12em] text-[#565d64]">
                  No map snapshot (CORS fallback)
                </div>
              )}
              <div className="border-t border-[#262e35] px-3 py-2 font-mono text-[9px] tracking-[0.08em] text-[#8d9299]">
                Bounding box: {geometry ? JSON.stringify((geometry as any).coordinates?.[0]?.slice(0, 2)) + " …" : "full viewport"} · GIBS VIIRS TrueColor
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-[8px] border border-[#1a2e26] bg-[#12161a]/60 p-3">
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#8d9299]">Target Region Summary</div>
                <div className="mt-2 flex flex-col gap-1.5 font-mono text-[11px] text-[#ece7db]">
                  <div className="flex justify-between"><span className="text-[#8d9299]">Area</span><span>{areaKm2} km²</span></div>
                  <div className="flex justify-between"><span className="text-[#8d9299]">Date range</span><span>{leftDate} → {rightDate}</span></div>
                  <div className="flex justify-between"><span className="text-[#8d9299]">Valid pixels</span><span>{regionResult?.valid_pixels ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-[#8d9299]">Status</span><span className={regionResult?.changed ? "text-[#c24b3f]" : "text-[#7a9b76]"}>{regionResult ? (regionResult.changed ? "Significant change" : "Stable") : "No region"}</span></div>
                </div>
              </div>
              <div className="rounded-[8px] border border-[#262e35] bg-[#1a2027]/40 p-3">
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#8d9299]">Coordinates (WGS84)</div>
                <div className="mt-1 font-mono text-[10px] leading-relaxed text-[#8d9299] break-all">
                  {geometry ? JSON.stringify(geometry) : "No geometry — viewport extent"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 — Metrics */}
        <div className="mt-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8CFFBE]">02 — Quantification Metrics & Data Bars</div>
          <div className="mt-2 overflow-hidden rounded-[8px] border border-[#262e35]">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#12161a] font-mono text-[9px] uppercase tracking-[0.12em] text-[#8d9299]">
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Share %</th>
                  <th className="px-3 py-2">Net change</th>
                  <th className="px-3 py-2">Bar</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[11px] text-[#ece7db]">
                {[
                  { label: "Water", value: regionResult?.water_pct ?? 0, change: regionResult?.change.water ?? 0, color: "#5ea8d6" },
                  { label: "Trees / Vegetation", value: regionResult?.vegetation_pct ?? 0, change: regionResult?.change.vegetation ?? 0, color: "#7a9b76" },
                  { label: "Built-up / Bare", value: regionResult?.built_up_pct ?? 0, change: regionResult?.change.built_up ?? 0, color: "#c24b3f" },
                  { label: "Bare Ground", value: hasResult ? Math.max(0, 100 - (regionResult!.water_pct + regionResult!.vegetation_pct + regionResult!.built_up_pct)) : 0, change: 0, color: "#8d9299" },
                ].map((row) => (
                  <tr key={row.label} className="border-t border-[#1a2027]">
                    <td className="px-3 py-2">{row.label}</td>
                    <td className="px-3 py-2">{row.value.toFixed(1)}%</td>
                    <td className={`px-3 py-2 ${row.change > 0.4 ? "text-[#7a9b76]" : row.change < -0.4 ? "text-[#c24b3f]" : "text-[#ece7db]"}`}>
                      {row.change > 0 ? `+${row.change.toFixed(1)}%` : `${row.change.toFixed(1)}%`}
                    </td>
                    <td className="px-3 py-2">
                      <div className="h-2 w-[160px] rounded-full bg-[#1a2027] overflow-hidden">
                        <div className="h-full" style={{ width: `${Math.min(100, row.value)}%`, background: row.color }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!hasResult && (
            <div className="mt-2 font-mono text-[10px] text-[#565d64]">No region analyzed — draw a boundary to populate metrics.</div>
          )}
        </div>

        {/* Section 3 — AI Narrative */}
        <div className="mt-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8CFFBE]">03 — AI Executive Narrative</div>
          <div className="mt-2 rounded-[8px] border border-[#1a2e26] bg-[#12161a]/60 p-4">
            <p className="font-mono text-[11px] leading-relaxed text-[#ece7db]">
              {narrative || "No AI narrative available — ask SatQuery (e.g., “What’s visible here?” or “How has this changed since 2018?”) to generate a transformation summary."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 border-t border-[#1a2e26] pt-3 text-center font-mono text-[8px] uppercase tracking-[0.14em] text-[#565d64]">
          CONFIDENTIAL · PROCESSED VIA SENTINEL-2 / GOOGLE DYNAMIC WORLD ENGINE · SATQUERY AI
        </div>
      </div>
    );
  },
);
ReportTemplate.displayName = "ReportTemplate";
