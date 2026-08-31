"use client";

import { forwardRef } from "react";
import type { RegionAnalysis } from "@/lib/api";

type ReportTemplateProps = {
  regionResult: RegionAnalysis | null;
  narrative: string | null;
  geometry: unknown | null;
  mapSnapshot: string | null;
  center: [number, number] | null;
  timestamp: string;
  leftDate: string;
  rightDate: string;
  placeName?: string | null;
};

/**
 * Formal light-mode report preview — single A4 page, professional/regulatory style.
 * White background, dark slate text, restrained accent, serif/sans for narrative,
 * monospace only for technical data. No raw JSON dump, no lab colors.
 * PDF is built natively with jsPDF (selectable text); this preview mirrors that layout.
 */
export const ReportTemplate = forwardRef<HTMLDivElement, ReportTemplateProps>(
  ({ regionResult, narrative, geometry, mapSnapshot, center, timestamp, leftDate, rightDate, placeName }, ref) => {
    const areaKm2 = regionResult ? (regionResult.valid_pixels * 0.01).toFixed(1) : "—";
    const hasResult = !!regionResult;

    const bboxDesc = (() => {
      try {
        const coords = (geometry as any)?.coordinates?.[0] as [number, number][] | undefined;
        if (!coords || coords.length < 3) return "full viewport";
        const lons = coords.map((c) => c[0]);
        const lats = coords.map((c) => c[1]);
        return `W ${Math.min(...lons).toFixed(3)} / E ${Math.max(...lons).toFixed(3)} / S ${Math.min(...lats).toFixed(3)} / N ${Math.max(...lats).toFixed(3)}`;
      } catch {
        return "full viewport";
      }
    })();

    const findings: string[] = [];
    if (hasResult && regionResult) {
      const ch = regionResult.change;
      const entries: [string, number][] = [
        ["Vegetation", ch.vegetation],
        ["Water", ch.water],
        ["Built-up", ch.built_up],
      ];
      for (const [label, v] of entries) {
        if (Math.abs(v) >= 1) findings.push(`${label} ${v > 0 ? "increased" : "decreased"} ${Math.abs(v).toFixed(1)}% (5-yr)`);
      }
      if (findings.length === 0) findings.push("No significant change (<1% in all classes) — stable");
      if (regionResult.changed && findings.length < 3) findings.push("Overall change flagged as significant");
    }

    // Suitability / Considerations for planners
    const suitability: string[] = [];
    if (hasResult && regionResult) {
      if (regionResult.water_pct > 15) suitability.push("Proximity to water bodies — observe riparian setbacks and floodplain regulations; hydrology study recommended.");
      else if (regionResult.water_pct > 5) suitability.push("Moderate water presence — check local water-body buffers.");
      else suitability.push("Limited surface water — water sourcing and drainage to be verified.");

      if (regionResult.vegetation_pct > 40) suitability.push(`High vegetation cover (${regionResult.vegetation_pct.toFixed(0)}%) — clearance and biodiversity mitigation likely required.`);
      else if (regionResult.vegetation_pct > 15) suitability.push(`Moderate vegetation (${regionResult.vegetation_pct.toFixed(0)}%) — selective clearance, retain green corridors.`);
      else suitability.push("Low vegetation — limited clearance constraints, consider greening for amenity.");

      if (regionResult.built_up_pct > 40) suitability.push(`Dense built-up/bare (${regionResult.built_up_pct.toFixed(0)}%) — infill context, infrastructure capacity review.`);
      else if (regionResult.built_up_pct > 15) suitability.push("Partially built — transitional zone, check zoning and access.");
      else suitability.push("Sparsely built — greenfield considerations, utilities extension needed.");
    }

    return (
      <div
        ref={ref}
        className="fixed left-[-9999px] top-0 w-[794px] bg-white p-6 font-sans text-slate-800"
        style={{ fontFamily: "Inter, Helvetica, Arial, sans-serif" }}
      >
        {/* Header — formal, single accent line */}
        <div className="border-b-2 border-slate-800 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-sans text-[13px] font-bold tracking-[0.08em] text-slate-900">SATQUERY — SATELLITE INTELLIGENCE REPORT</div>
              <div className="mt-1 font-sans text-[9px] tracking-[0.08em] text-slate-500">
                Sentinel-2 / Google Dynamic World · 10 m true-color · Evidence-grade
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[8px] uppercase tracking-[0.08em] text-slate-500">Generated (UTC)</div>
              <div className="font-mono text-[9px] text-slate-700">{timestamp}</div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[8px] tracking-[0.06em] text-slate-500">
            <span className="truncate">{placeName ? placeName : "Unnamed region"}</span>
            <span className="h-3 w-px bg-slate-300" />
            <span>LAT {center ? center[0].toFixed(4) : "—"} LON {center ? center[1].toFixed(4) : "—"}</span>
            <span className="h-3 w-px bg-slate-300" />
            <span>CONFIDENTIAL</span>
          </div>
        </div>

        {/* Executive Narrative — lead insight, right after header */}
        <div className="mt-4">
          <div className="font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-slate-900">01 — Executive Narrative</div>
          <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="font-sans text-[10.5px] leading-relaxed text-slate-700">
              {narrative || "Executive summary will be generated from computed statistics upon export. Draw a region to populate metrics."}
            </p>
          </div>
        </div>

        {/* Key Findings — compact, above metrics */}
        {hasResult && findings.length > 0 && (
          <div className="mt-3 rounded-md border border-teal-100 bg-teal-50/40 p-2.5">
            <div className="font-sans text-[9px] font-bold uppercase tracking-[0.08em] text-teal-800">Key Findings</div>
            <ul className="mt-1.5 list-disc pl-4 font-sans text-[9.5px] leading-relaxed text-slate-700">
              {findings.slice(0, 3).map((f, i) => (
                <li key={i} className="truncate">{f}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Spatial Overview — compact side-by-side */}
        <div className="mt-4">
          <div className="font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-slate-900">02 — Spatial Overview</div>
          <div className="mt-1.5 grid grid-cols-[1.35fr_0.65fr] gap-3">
            <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              {mapSnapshot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mapSnapshot} alt="Map snapshot" className="h-[160px] w-full object-cover" />
              ) : (
                <div className="flex h-[160px] flex-col items-center justify-center gap-1 p-3 text-center">
                  <div className="font-sans text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">Map image unavailable</div>
                  <div className="font-sans text-[8px] leading-relaxed text-slate-500">Bounding box and metrics remain fully usable without the image.</div>
                </div>
              )}
              <div className="truncate border-t border-slate-200 bg-white px-2 py-1 font-mono text-[7.5px] tracking-[0.04em] text-slate-500">
                {bboxDesc} · GIBS VIIRS TrueColor · {leftDate} to {rightDate}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                <div className="font-sans text-[8px] font-bold uppercase tracking-[0.08em] text-slate-500">Target Region Summary</div>
                <div className="mt-1.5 flex flex-col gap-1 font-sans text-[9px] text-slate-700">
                  <div className="flex justify-between gap-2"><span className="text-slate-500">Place</span><span className="max-w-[110px] truncate text-right font-medium">{placeName || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Center</span><span className="font-mono text-[9px]">{center ? `${center[0].toFixed(4)}, ${center[1].toFixed(4)}` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Area</span><span>{areaKm2} km²</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Date range</span><span className="truncate">{leftDate} to {rightDate}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Valid pixels</span><span>{regionResult?.valid_pixels ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={regionResult?.changed ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>{regionResult ? (regionResult.changed ? "Significant change" : "Stable") : "No region"}</span></div>
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-2.5">
                <div className="font-sans text-[8px] font-bold uppercase tracking-[0.08em] text-slate-500">Bounding Box (WGS84)</div>
                <div className="mt-1 font-mono text-[8px] leading-relaxed text-slate-600 break-all">
                  {bboxDesc}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics — compact, wraps, no overflow */}
        <div className="mt-4">
          <div className="font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-slate-900">03 — Quantification Metrics</div>
          <div className="mt-1.5 overflow-hidden rounded-md border border-slate-200">
            <table className="w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-slate-900 font-sans text-[8px] uppercase tracking-[0.08em] text-white">
                  <th className="w-[32%] px-2 py-1.5">Class</th>
                  <th className="w-[18%] px-2 py-1.5">Share</th>
                  <th className="w-[20%] px-2 py-1.5">Net change</th>
                  <th className="w-[30%] px-2 py-1.5">Bar</th>
                </tr>
              </thead>
              <tbody className="font-sans text-[9px] text-slate-700">
                {[
                  { label: "Water", value: regionResult?.water_pct ?? 0, change: regionResult?.change.water ?? 0, color: "#1e40af" },
                  { label: "Vegetation", value: regionResult?.vegetation_pct ?? 0, change: regionResult?.change.vegetation ?? 0, color: "#0f766e" },
                  { label: "Built-up / Bare", value: regionResult?.built_up_pct ?? 0, change: regionResult?.change.built_up ?? 0, color: "#92400e" },
                  { label: "Bare Ground", value: hasResult ? Math.max(0, 100 - (regionResult!.water_pct + regionResult!.vegetation_pct + regionResult!.built_up_pct)) : 0, change: 0, color: "#64748b" },
                ].map((row) => (
                  <tr key={row.label} className="border-t border-slate-200">
                    <td className="truncate px-2 py-1.5 font-medium">{row.label}</td>
                    <td className="px-2 py-1.5">{row.value.toFixed(1)}%</td>
                    <td className={`px-2 py-1.5 font-mono ${row.change > 0.4 ? "text-emerald-700" : row.change < -0.4 ? "text-amber-700" : "text-slate-600"}`}>
                      {row.change > 0 ? `+${row.change.toFixed(1)}%` : `${row.change.toFixed(1)}%`}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full" style={{ width: `${Math.min(100, row.value)}%`, background: row.color }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!hasResult && (
            <div className="mt-1.5 font-sans text-[9px] text-slate-500">No region analyzed — draw a boundary to populate metrics.</div>
          )}
        </div>

        {/* Planning Considerations + Legend — compact, side by side to stay on one page */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-md border border-amber-200 bg-amber-50/50 p-2.5">
            <div className="font-sans text-[9px] font-bold uppercase tracking-[0.08em] text-amber-800">04 — Suitability / Considerations</div>
            <ul className="mt-1.5 list-disc pl-4 font-sans text-[8.5px] leading-relaxed text-slate-700">
              {(suitability.length ? suitability : ["Draw a region to see planning considerations."]).slice(0, 3).map((s, i) => (
                <li key={i} className="line-clamp-2">{s}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
            <div className="font-sans text-[9px] font-bold uppercase tracking-[0.08em] text-slate-600">Legend & Definitions</div>
            <div className="mt-1.5 font-sans text-[8px] leading-relaxed text-slate-600">
              <div><span className="font-semibold">Water:</span> NDWI/MNDWI &gt; threshold, open water.</div>
              <div><span className="font-semibold">Vegetation:</span> NDVI &gt; threshold, green biomass.</div>
              <div><span className="font-semibold">Built-up/Bare:</span> non-vegetated, non-water (urban + bare soil).</div>
              <div className="mt-1"><span className="font-semibold">Net change:</span> (end % − start %) per class; &gt;5% flagged significant.</div>
            </div>
          </div>
        </div>

        {/* Footer — secondary, tiny, single line */}
        <div className="mt-3 border-t border-slate-200 pt-2 text-center font-sans text-[7px] uppercase tracking-[0.08em] text-slate-400">
          CONFIDENTIAL · PROCESSED VIA SENTINEL-2 / GOOGLE DYNAMIC WORLD ENGINE · SATQUERY AI
        </div>
        {geometry && (
          <div className="mt-1 truncate font-mono text-[6px] leading-relaxed text-slate-400">
            Geometry (traceability): {JSON.stringify(geometry).slice(0, 140)}...
          </div>
        )}
      </div>
    );
  },
);
ReportTemplate.displayName = "ReportTemplate";
