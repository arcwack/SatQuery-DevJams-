"use client";

import { create } from "zustand";
import type { Map as LeafletMapType } from "leaflet";
import type {
  Anomaly,
  GeoJSONGeometry,
  HighlightFeatureCollection,
  RasterInfo,
  RegionAnalysis,
} from "./api";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
}

export interface Evidence {
  intent: string;
  reply: string;
  stats: unknown;
}

export interface Region {
  id: string;
  positions: [number, number][];
  label?: string;
}

/**
 * Shared workspace state. Named `useMapStore` to match the intent
 * referenced across the workspace components' design notes.
 */
interface WorkspaceState {
  rasters: RasterInfo[];
  activeYear: number | null;
  classificationOn: boolean;
  drawMode: boolean;
  geometry: GeoJSONGeometry | null;
  highlights: HighlightFeatureCollection | null;
  anomalies: Anomaly[];
  map: LeafletMapType | null;
  messages: ChatMessage[];
  evidence: Evidence | null;
  sending: boolean;
  regionResult: RegionAnalysis | null;
  analyzing: boolean;
  activeDate: string;
  timelineNarrative: string | null;
  timelineStartDate: string | null;
  timelineChange: { water: number; vegetation: number; built_up: number } | null;
  regions: Region[];
  splitEnabled: boolean;
  splitPosition: number;
  splitLeftDate: string;
  splitRightDate: string;
  splitLeftYear: number;
  splitRightYear: number;

  setRasters: (rasters: RasterInfo[]) => void;
  setActiveYear: (year: number) => void;
  toggleClassification: () => void;
  setDrawMode: (on: boolean) => void;
  setGeometry: (geometry: GeoJSONGeometry | null) => void;
  setHighlights: (highlights: HighlightFeatureCollection | null) => void;
  setAnomalies: (anomalies: Anomaly[]) => void;
  setMap: (map: LeafletMapType | null) => void;
  addMessage: (role: "user" | "assistant", text: string) => void;
  setEvidence: (evidence: Evidence | null) => void;
  setSending: (sending: boolean) => void;
  setRegionResult: (result: RegionAnalysis | null) => void;
  setAnalyzing: (analyzing: boolean) => void;
  setActiveDate: (date: string) => void;
  setTimeline: (narrative: string, startDate: string, change: { water: number; vegetation: number; built_up: number }) => void;
  clearTimeline: () => void;
  addRegion: (region: Region) => void;
  setSplitEnabled: (enabled: boolean) => void;
  toggleSplit: () => void;
  setSplitPosition: (position: number) => void;
  setSplitDates: (leftDate: string, rightDate: string) => void;
  setSplitYears: (leftYear: number, rightYear: number) => void;
  setSplitLeftYear: (year: number) => void;
  setSplitRightYear: (year: number) => void;
}

let messageId = 0;

export const useMapStore = create<WorkspaceState>((set) => ({
  rasters: [],
  activeYear: null,
  classificationOn: true,
  drawMode: false,
  geometry: null,
  highlights: null,
  anomalies: [],
  map: null,
  messages: [],
  evidence: null,
  sending: false,
  regionResult: null,
  analyzing: false,
  activeDate: "2026-06-15",
  timelineNarrative: null,
  timelineStartDate: null,
  timelineChange: null,
  regions: [],
  splitEnabled: false,
  splitPosition: 50,
  splitLeftDate: "2021-08-27",
  splitRightDate: "2026-08-27",
  splitLeftYear: 2021,
  splitRightYear: 2026,

  setRasters: (rasters) => set({ rasters }),
  setActiveYear: (activeYear) => set({ activeYear }),
  toggleClassification: () => set((s) => ({ classificationOn: !s.classificationOn })),
  setDrawMode: (drawMode) => set({ drawMode }),
  setGeometry: (geometry) => set({ geometry, highlights: null }),
  setHighlights: (highlights) => set({ highlights }),
  setAnomalies: (anomalies) => set({ anomalies }),
  setMap: (map) => set({ map }),
  addMessage: (role, text) =>
    set((s) => ({ messages: [...s.messages, { id: messageId++, role, text }] })),
  setEvidence: (evidence) => set({ evidence }),
  setSending: (sending) => set({ sending }),
  setRegionResult: (regionResult) => set({ regionResult }),
  setAnalyzing: (analyzing) => set({ analyzing }),
  setActiveDate: (activeDate) => set({ activeDate }),
  setTimeline: (timelineNarrative, timelineStartDate, timelineChange) =>
    set({ timelineNarrative, timelineStartDate, timelineChange }),
  clearTimeline: () => set({ timelineNarrative: null, timelineStartDate: null, timelineChange: null }),
  addRegion: (region) => set((s) => ({ regions: [...s.regions, region] })),
  setSplitEnabled: (splitEnabled) => set({ splitEnabled }),
  toggleSplit: () => set((s) => ({ splitEnabled: !s.splitEnabled })),
  setSplitPosition: (splitPosition) => set({ splitPosition: Math.max(5, Math.min(95, splitPosition)) }),
  setSplitDates: (splitLeftDate, splitRightDate) => set({
    splitLeftDate, splitRightDate,
    splitLeftYear: Number(splitLeftDate.slice(0,4)) || 2021,
    splitRightYear: Number(splitRightDate.slice(0,4)) || 2026,
  }),
  setSplitYears: (splitLeftYear, splitRightYear) => set({
    splitLeftYear, splitRightYear,
    splitLeftDate: `${splitLeftYear}-08-27`,
    splitRightDate: `${splitRightYear}-08-27`,
  }),
  setSplitLeftYear: (year) => set((s) => ({ splitLeftYear: year, splitLeftDate: `${year}-08-27` })),
  setSplitRightYear: (year) => set((s) => ({ splitRightYear: year, splitRightDate: `${year}-08-27` })),
}));
