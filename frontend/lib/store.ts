"use client";

import { create } from "zustand";
import type { Map as LeafletMapType } from "leaflet";
import type {
  Anomaly,
  GeoJSONGeometry,
  HighlightFeatureCollection,
  RasterInfo,
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
}));
