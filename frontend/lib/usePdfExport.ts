"use client";

import { useCallback, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

type ExportParams = {
  regionResult: any | null;
  geometry: any | null;
  center: [number, number] | null;
  leftDate: string;
  rightDate: string;
  placeName?: string | null;
  narrative?: string | null;
};

/**
 * Formal light-mode single-page PDF — native vector text (selectable).
 * Fixes: arrow encoding ("to" not "→"), text overflow (wrap/ellipsis), single page constraint,
 * suitability & legend for planners, human-readable bbox (no raw JSON).
 */
export function usePdfExport() {
  const [generating, setGenerating] = useState(false);

  const exportWithSnapshot = useCallback(async (
    _reportRef: React.RefObject<HTMLDivElement | null>,
    setMapSnapshot: (url: string | null) => void,
    params?: ExportParams
  ) => {
    if (generating) return;
    setGenerating(true);
    try {
      // 1. Map snapshot only (graceful fallback to null)
      const mapEl = document.querySelector(".leaflet-container") as HTMLElement | null;
      let snap: string | null = null;
      if (mapEl) {
        try {
          const c = await html2canvas(mapEl, {
            useCORS: true,
            allowTaint: false,
            scale: 2,
            backgroundColor: "#ffffff",
            logging: false,
            imageTimeout: 15000,
          });
          snap = c.toDataURL("image/png");
        } catch {
          snap = null;
        }
      }
      setMapSnapshot(snap);

      // 2. Place name (best-effort)
      let placeName: string | null = params?.placeName ?? null;
      if (!placeName && params?.center) {
        try {
          const res = await fetch(`${API_BASE}/api/reverse-geocode?lat=${params.center[0]}&lon=${params.center[1]}`);
          if (res.ok) {
            const data = await res.json();
            placeName = data.label?.split(",").slice(0, 2).join(",") || data.label || null;
          }
        } catch {}
      }

      // 3. Real AI narrative — always
      let narrative: string | null = params?.narrative ?? null;
      const regionResult = params?.regionResult ?? null;
      const geometry = params?.geometry ?? null;
      const leftDate = params?.leftDate ?? "2021-08-27";
      const rightDate = params?.rightDate ?? "2026-08-27";
      const center = params?.center ?? null;

      const needsNarrative = !narrative || narrative.includes("No AI narrative") || narrative.length < 20;
      if (needsNarrative && regionResult) {
        try {
          const res = await fetch(`${API_BASE}/api/report-narrative`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              geometry: geometry ?? { type: "Point", coordinates: center ? [center[1], center[0]] : [0, 0] },
              stats: regionResult,
              start_date: leftDate,
              end_date: rightDate,
              place_name: placeName ?? (center ? `${center[0].toFixed(3)}, ${center[1].toFixed(3)}` : "the selected region"),
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.narrative) narrative = data.narrative;
          }
        } catch {}
      }
      if (!narrative) {
        if (regionResult?.change) {
          const ch = regionResult.change;
          const parts: string[] = [];
          if (Math.abs(ch.water) >= 1) parts.push(`Water ${ch.water > 0 ? "grew" : "dropped"} ${Math.abs(ch.water).toFixed(1)}%`);
          if (Math.abs(ch.vegetation) >= 1) parts.push(`Vegetation ${ch.vegetation > 0 ? "grew" : "dropped"} ${Math.abs(ch.vegetation).toFixed(1)}%`);
          if (Math.abs(ch.built_up) >= 1) parts.push(`Built-up ${ch.built_up > 0 ? "grew" : "dropped"} ${Math.abs(ch.built_up).toFixed(1)}%`);
          if (parts.length) narrative = `Between ${leftDate} to ${rightDate}, ${parts.join(", ")}. Overall change is ${regionResult.changed ? "significant" : "not significant"} for this period.`;
          else narrative = `Between ${leftDate} to ${rightDate}, land cover remained largely stable. No class changed by more than 1%.`;
        } else {
          narrative = "Executive summary will be available after a region is analyzed. Draw a boundary to generate metrics.";
        }
      }

      // Key Findings + Suitability
      const findings: string[] = [];
      if (regionResult?.change) {
        const ch = regionResult.change;
        const entries: [string, number][] = [["Vegetation", ch.vegetation], ["Water", ch.water], ["Built-up", ch.built_up]];
        for (const [label, v] of entries) if (Math.abs(v) >= 1) findings.push(`${label} ${v > 0 ? "increased" : "decreased"} ${Math.abs(v).toFixed(1)}%`);
        if (findings.length === 0) findings.push("No significant change (<1% in all classes)");
        if (regionResult.changed) findings.push("Overall change flagged as significant");
      }

      const suitability: string[] = [];
      if (regionResult) {
        if (regionResult.water_pct > 15) suitability.push("Water proximity — riparian setbacks / floodplain review recommended.");
        else if (regionResult.water_pct > 5) suitability.push("Moderate water — check local water buffers.");
        else suitability.push("Limited surface water — verify water sourcing.");

        if (regionResult.vegetation_pct > 40) suitability.push(`High vegetation (${regionResult.vegetation_pct.toFixed(0)}%) — clearance / biodiversity mitigation likely.`);
        else if (regionResult.vegetation_pct > 15) suitability.push(`Moderate vegetation (${regionResult.vegetation_pct.toFixed(0)}%) — retain green corridors.`);
        else suitability.push("Low vegetation — limited clearance constraints.");

        if (regionResult.built_up_pct > 40) suitability.push(`Dense built-up (${regionResult.built_up_pct.toFixed(0)}%) — infill, capacity review.`);
        else if (regionResult.built_up_pct > 15) suitability.push("Partially built — transitional zoning.");
        else suitability.push("Sparsely built — greenfield, utilities extension.");
      }

      const bboxDesc = (() => {
        try {
          const coords = (geometry as any)?.coordinates?.[0] as [number, number][] | undefined;
          if (!coords || coords.length < 3) return "full viewport";
          const lons = coords.map((c) => c[0]); const lats = coords.map((c) => c[1]);
          return `W ${Math.min(...lons).toFixed(3)} / E ${Math.max(...lons).toFixed(3)} / S ${Math.min(...lats).toFixed(3)} / N ${Math.max(...lats).toFixed(3)}`;
        } catch { return "full viewport"; }
      })();

      // 4. Build native single-page light PDF
      const pdf = new jsPDF("portrait", "pt", "a4");
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      const M = 28;
      let y = 28;

      // White background (already white, but ensure)
      pdf.setFillColor("#ffffff");
      pdf.rect(0, 0, W, H, "F");

      // Header accent line (slate-900, restrained)
      pdf.setDrawColor("#0f172a"); pdf.setLineWidth(1.2); pdf.line(M, y, W - M, y);
      y += 10;

      pdf.setFont("Helvetica", "bold"); pdf.setFontSize(12); pdf.setTextColor("#0f172a");
      pdf.text("SATQUERY — SATELLITE INTELLIGENCE REPORT", M, y);
      y += 9;
      pdf.setFont("Helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor("#64748b");
      pdf.text("Sentinel-2 / Google Dynamic World  • 10 m true-color  •  Evidence-grade", M, y);
      const ts = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
      pdf.text(ts, W - M, y - 9, { align: "right" });
      pdf.setFontSize(6); pdf.text("GENERATED (UTC)", W - M, y - 16, { align: "right" });
      y += 6;
      pdf.setDrawColor("#e2e8f0"); pdf.setLineWidth(0.4); pdf.line(M, y, W - M, y);
      y += 8;

      pdf.setFontSize(7); pdf.setTextColor("#64748b");
      // Use "to" not "→" for encoding safety; truncate placeName to fit
      const placeShort = placeName && placeName.length > 42 ? placeName.slice(0, 42) + "..." : (placeName || "Unnamed region");
      const sub = `${placeShort}  |  LAT ${center ? center[0].toFixed(4) : "—"}  LON ${center ? center[1].toFixed(4) : "—"}  |  CONFIDENTIAL`;
      // Wrap sub if too long (ensure no overflow)
      const subLines = pdf.splitTextToSize(sub, W - M * 2);
      subLines.slice(0, 1).forEach((ln: string) => { pdf.text(ln, M, y); y += 8; });

      // Key Findings — compact, top
      if (findings.length) {
        y += 2;
        pdf.setFont("Helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor("#0f172a");
        pdf.text("KEY FINDINGS", M, y);
        y += 8;
        pdf.setFont("Helvetica", "normal"); pdf.setFontSize(7.5); pdf.setTextColor("#334155");
        findings.slice(0, 3).forEach((f) => {
          const lines = pdf.splitTextToSize(`- ${f}`, W - M * 2 - 10);
          lines.slice(0, 1).forEach((ln: string) => { pdf.text(ln, M + 6, y); y += 8; });
        });
        y += 2;
      }

      // Executive Narrative — lead, sans-serif, readable, wraps
      pdf.setFont("Helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor("#0f172a");
      pdf.text("01  EXECUTIVE NARRATIVE", M, y);
      y += 8;
      pdf.setDrawColor("#e2e8f0"); pdf.setFillColor("#f8fafb");
      pdf.setFont("Helvetica", "normal"); pdf.setFontSize(7.5); pdf.setTextColor("#334155");
      const maxW = W - M * 2 - 12;
      const nLines = pdf.splitTextToSize(narrative || "", maxW);
      // Limit narrative to 4 lines to stay on one page
      const clipped = nLines.slice(0, 4);
      const boxH = clipped.length * 9 + 10;
      pdf.roundedRect(M, y - 6, W - M * 2, boxH, 3, 3, "FD");
      let ty = y + 4;
      clipped.forEach((ln: string) => { pdf.text(ln, M + 6, ty); ty += 9; });
      y += boxH + 6;

      // Spatial Overview — compact side-by-side, fixed height to stay on one page
      pdf.setFont("Helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor("#0f172a");
      pdf.text("02  SPATIAL OVERVIEW", M, y);
      y += 8;

      const imgW = 300; const imgH = 130; const gap = 10; const summaryW = W - M * 2 - imgW - gap;
      const imgX = M; const summaryX = M + imgW + gap;
      const blockY = y;

      // Map box
      pdf.setDrawColor("#e2e8f0"); pdf.setFillColor("#f8fafb");
      pdf.roundedRect(imgX, y, imgW, imgH, 3, 3, "FD");
      if (snap) {
        try { pdf.addImage(snap, "PNG", imgX + 2, y + 2, imgW - 4, imgH - 14, undefined, "FAST"); } catch {}
      } else {
        pdf.setFontSize(7); pdf.setTextColor("#64748b");
        pdf.text("Map image unavailable", imgX + imgW / 2, y + imgH / 2 - 4, { align: "center" });
        pdf.setFontSize(6); pdf.setTextColor("#94a3b8");
        pdf.text("Bounding box and metrics remain usable", imgX + imgW / 2, y + imgH / 2 + 6, { align: "center" });
      }
      pdf.setFontSize(6); pdf.setTextColor("#64748b");
      const bboxLine = `${bboxDesc}  |  GIBS VIIRS TrueColor  |  ${leftDate} to ${rightDate}`;
      // Ensure bbox line doesn't overflow: truncate if needed
      const bboxShort = bboxLine.length > 78 ? bboxLine.slice(0, 78) + "..." : bboxLine;
      pdf.text(bboxShort, imgX + 4, y + imgH - 4);

      // Summary box
      pdf.setFillColor("#f8fafb"); pdf.setDrawColor("#e2e8f0");
      pdf.roundedRect(summaryX, y, summaryW, imgH, 3, 3, "FD");
      let sy = y + 10;
      pdf.setFont("Helvetica", "bold"); pdf.setFontSize(6.5); pdf.setTextColor("#64748b");
      pdf.text("TARGET REGION SUMMARY", summaryX + 6, sy);
      sy += 9;
      pdf.setFont("Helvetica", "normal"); pdf.setFontSize(6.5); pdf.setTextColor("#334155");
      const rows: [string, string][] = [
        ["Place", placeName || "—"],
        ["Center", center ? `${center[0].toFixed(4)}, ${center[1].toFixed(4)}` : "—"],
        ["Area", regionResult ? `${(regionResult.valid_pixels * 0.01).toFixed(1)} km2` : "—"],
        ["Date range", `${leftDate} to ${rightDate}`],
        ["Status", regionResult ? (regionResult.changed ? "Significant change" : "Stable") : "No region"],
      ];
      rows.forEach(([k, v]) => {
        pdf.setTextColor("#64748b"); pdf.text(k, summaryX + 6, sy);
        pdf.setTextColor("#0f172a");
        let tv = v;
        if (tv.length > 22) tv = tv.slice(0, 22) + "...";
        pdf.text(tv, summaryX + summaryW - 6, sy, { align: "right" });
        sy += 8;
      });
      sy += 2;
      pdf.setFontSize(6); pdf.setTextColor("#64748b");
      pdf.text("Bounding Box (WGS84)", summaryX + 6, sy);
      sy += 7;
      pdf.setFontSize(6); pdf.setTextColor("#64748b");
      const bboxWrap = pdf.splitTextToSize(bboxDesc, summaryW - 12);
      bboxWrap.slice(0, 2).forEach((ln: string) => { pdf.text(ln, summaryX + 6, sy); sy += 7; });

      y = blockY + imgH + 8;

      // Metrics table — compact, native, wraps
      pdf.setFont("Helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor("#0f172a");
      pdf.text("03  QUANTIFICATION METRICS", M, y);
      y += 8;

      const cols = [M, M + 150, M + 220, M + 290];
      const colW = [150, 70, 70, W - M * 2 - 290];
      const rowH = 14;

      pdf.setFillColor("#0f172a"); pdf.rect(M, y, W - M * 2, rowH, "F");
      pdf.setFontSize(6.5); pdf.setTextColor("#ffffff");
      ["Class", "Share", "Net change", "Bar"].forEach((h, i) => pdf.text(h, cols[i] + 3, y + 9));
      y += rowH;

      const tableRows = [
        { label: "Water", value: regionResult?.water_pct ?? 0, change: regionResult?.change.water ?? 0, color: "#1e40af" },
        { label: "Vegetation", value: regionResult?.vegetation_pct ?? 0, change: regionResult?.change.vegetation ?? 0, color: "#0f766e" },
        { label: "Built-up / Bare", value: regionResult?.built_up_pct ?? 0, change: regionResult?.change.built_up ?? 0, color: "#92400e" },
        { label: "Bare Ground", value: regionResult ? Math.max(0, 100 - (regionResult.water_pct + regionResult.vegetation_pct + regionResult.built_up_pct)) : 0, change: 0, color: "#64748b" },
      ];

      tableRows.forEach((row) => {
        pdf.setFillColor("#ffffff"); pdf.setDrawColor("#e2e8f0"); pdf.rect(M, y, W - M * 2, rowH, "FD");
        pdf.setFontSize(6.5); pdf.setTextColor("#334155");
        // Truncate label if needed
        let lab = row.label;
        if (lab.length > 18) lab = lab.slice(0, 18) + "...";
        pdf.text(lab, cols[0] + 3, y + 9);
        pdf.text(`${row.value.toFixed(1)}%`, cols[1] + 3, y + 9);
        const ch = row.change;
        const chStr = ch > 0 ? `+${ch.toFixed(1)}%` : `${ch.toFixed(1)}%`;
        pdf.setTextColor(ch > 0.4 ? "#059669" : ch < -0.4 ? "#d97706" : "#334155");
        pdf.text(chStr, cols[2] + 3, y + 9);
        const barX = cols[3] + 3; const barW = colW[3] - 6; const barH = 5; const barY = y + 5;
        pdf.setFillColor("#e2e8f0"); pdf.roundedRect(barX, barY, barW, barH, 1.5, 1.5, "F");
        pdf.setFillColor(row.color); pdf.roundedRect(barX, barY, (barW * Math.min(100, row.value)) / 100, barH, 1.5, 1.5, "F");
        y += rowH;
      });

      // Suitability + Legend — compact side-by-side to stay on one page
      y += 4;
      // Ensure we stay on one page — if y > H - 80, we are tight but we will not add a new page; shrink instead
      const bottomY = y;
      const boxH2 = 56;
      // Left: Suitability
      pdf.setFillColor("#fffbeb"); pdf.setDrawColor("#fde68a");
      pdf.roundedRect(M, y, (W - M * 2) / 2 - 4, boxH2, 3, 3, "FD");
      pdf.setFont("Helvetica", "bold"); pdf.setFontSize(6.5); pdf.setTextColor("#92400e");
      pdf.text("04  SUITABILITY / CONSIDERATIONS", M + 6, y + 9);
      pdf.setFont("Helvetica", "normal"); pdf.setFontSize(6); pdf.setTextColor("#57534e");
      const suitLines = suitability.length ? suitability.slice(0, 3) : ["Draw a region to see planning considerations."];
      let syy = y + 16;
      suitLines.forEach((s) => {
        const wrapped = pdf.splitTextToSize(`- ${s}`, (W - M * 2) / 2 - 16);
        wrapped.slice(0, 1).forEach((ln: string) => { pdf.text(ln, M + 6, syy); syy += 7; });
      });

      // Right: Legend
      const lx = M + (W - M * 2) / 2 + 4;
      pdf.setFillColor("#f8fafb"); pdf.setDrawColor("#e2e8f0");
      pdf.roundedRect(lx, y, (W - M * 2) / 2 - 4, boxH2, 3, 3, "FD");
      pdf.setFont("Helvetica", "bold"); pdf.setFontSize(6.5); pdf.setTextColor("#475569");
      pdf.text("LEGEND & DEFINITIONS", lx + 6, y + 9);
      pdf.setFont("Helvetica", "normal"); pdf.setFontSize(6); pdf.setTextColor("#475569");
      const legend = [
        "Water: NDWI/MNDWI > threshold, open water.",
        "Vegetation: NDVI > threshold, green biomass.",
        "Built-up/Bare: non-vegetated, non-water.",
        "Net change: end% - start% per class; >5% = significant.",
      ];
      let ly = y + 16;
      legend.forEach((ln) => { pdf.text(`- ${ln}`, lx + 6, ly); ly += 7; });

      y = bottomY + boxH2 + 8;

      // Footer — single line, tiny
      pdf.setDrawColor("#e2e8f0"); pdf.line(M, H - 18, W - M, H - 18);
      pdf.setFontSize(6); pdf.setTextColor("#94a3b8");
      pdf.text("CONFIDENTIAL  |  PROCESSED VIA SENTINEL-2 / GOOGLE DYNAMIC WORLD ENGINE  |  SATQUERY AI", W / 2, H - 10, { align: "center" });
      if (geometry) {
        pdf.setFontSize(5); pdf.setTextColor("#94a3b8");
        const raw = JSON.stringify(geometry);
        const short = raw.length > 90 ? raw.slice(0, 90) + "..." : raw;
        pdf.text(`Geometry: ${short}`, M, H - 6);
      }

      const date = new Date().toISOString().slice(0, 10);
      pdf.save(`SatQuery_Intelligence_Report_${date}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, [generating]);

  const exportToPdf = useCallback(async (
    reportRef: React.RefObject<HTMLDivElement | null>,
    mapElement?: HTMLElement | null
  ) => {
    return exportWithSnapshot(reportRef, () => {}, {} as any);
  }, [exportWithSnapshot]);

  return { exportToPdf, exportWithSnapshot, generating };
}
