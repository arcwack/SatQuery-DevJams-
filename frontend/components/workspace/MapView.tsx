"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, GeoJSON, useMap, useMapEvents } from "react-leaflet";
import L, { type Map as LeafletMap } from "leaflet";
import { cn } from "@/lib/utils";
import { MAP_DEFAULTS, ARAL_SEA, type LatLngTuple } from "@/lib/mapConfig";
import { getGibsTileUrl, DEFAULT_GIBS_LAYER_ID, type GibsLayerId } from "@/lib/gibs";
import { useMapStore } from "@/lib/store";
import { MapControls } from "./MapControls";
import { RegionLayer, type Region } from "./RegionLayer";

/**
 * Reticle-style marker matching the Cursor component's "map" state —
 * a bracketed focus square rather than Leaflet's default teardrop pin,
 * so it reads as instrument UI rather than a generic map product.
 */
const locationIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:28px;height:28px;">
      <div style="position:absolute;inset:0;border:1.5px solid var(--color-signal);border-radius:2px;"></div>
      <div style="position:absolute;top:50%;left:50%;width:4px;height:4px;background:var(--color-signal);border-radius:999px;transform:translate(-50%,-50%);"></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

/** Fill/outline color per detected class — muted, on-palette. */
const CLASS_COLORS: Record<string, string> = {
  water: "#5ea8d6",
  vegetation: "#7a9b76",
  built_up: "#c24b3f",
};

/** Renders detected land-cover polygons from /api/detect over the imagery. */
function HighlightLayer() {
  const highlights = useMapStore((s) => s.highlights);
  if (!highlights || highlights.features.length === 0) return null;
  return (
    <GeoJSON
      key={highlights.features.length}
      data={highlights}
      style={(feature) => {
        const color = CLASS_COLORS[feature?.properties.class] ?? "#d98f4e";
        return { color, weight: 1, fillOpacity: 0.35 };
      }}
    />
  );
}

/**
 * Invisible bridge component. Rendered inside <MapContainer> so it can
 * call useMap()/useMapEvents(), and forwards the map instance + view
 * changes up to MapStage (which lives outside the map's own DOM tree
 * and needs the instance for the toolbar's "reset view" button).
 */
function MapBridge({
  onReady,
  onViewChange,
}: {
  onReady?: (map: LeafletMap) => void;
  onViewChange?: (center: LatLngTuple, zoom: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onReady?.(map);
    // Re-skin the one piece of default Leaflet chrome we keep — move
    // attribution out of MapControls' corner and drop the "Leaflet |"
    // prefix so it reads as a single quiet credit line.
    if (map.attributionControl) {
      map.attributionControl.setPosition("topright");
      map.attributionControl.setPrefix(false);
    }
    onViewChange?.([map.getCenter().lat, map.getCenter().lng], map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useMapEvents({
    moveend() {
      onViewChange?.([map.getCenter().lat, map.getCenter().lng], map.getZoom());
    },
  });

  return null;
}

export type MapViewProps = {
  className?: string;
  /** Which GIBS product to render. Swappable — the seam a layer picker uses later. */
  gibsLayerId?: GibsLayerId;
  /** ISO date (YYYY-MM-DD). The seam the Timeline bar drives in a later phase. */
  date?: string;
  regions?: Region[];
  drawMode?: boolean;
  onDrawComplete?: (positions: LatLngTuple[]) => void;
  onDrawCancel?: () => void;
  onReady?: (map: LeafletMap) => void;
  onViewChange?: (center: LatLngTuple, zoom: number) => void;
};

export function MapView({
  className,
  gibsLayerId = DEFAULT_GIBS_LAYER_ID,
  date,
  regions,
  drawMode = false,
  onDrawComplete,
  onDrawCancel,
  onReady,
  onViewChange,
}: MapViewProps) {
  const activeDate = useMapStore((s) => s.activeDate);
  const tileUrl = useMemo(
    () => getGibsTileUrl(gibsLayerId, activeDate || date),
    [gibsLayerId, activeDate, date],
  );

  return (
    <MapContainer
      center={MAP_DEFAULTS.center}
      zoom={MAP_DEFAULTS.zoom}
      minZoom={MAP_DEFAULTS.minZoom}
      maxZoom={MAP_DEFAULTS.maxZoom}
      zoomControl={false}
      doubleClickZoom={!drawMode}
      className={cn("h-full w-full bg-void", drawMode && "cursor-crosshair", className)}
    >
      <TileLayer
        url={tileUrl}
        tileSize={256}
        maxNativeZoom={9}
        noWrap
        bounds={[
          [-85.0511, -179],
          [85.0511, 179],
        ]}
        attribution="Imagery &copy; NASA EOSDIS GIBS"
      />

      <Marker position={ARAL_SEA.center} icon={locationIcon} />

      <RegionLayer
        key={drawMode ? "drawing" : "idle"}
        regions={regions}
        drawMode={drawMode}
        onDrawComplete={onDrawComplete}
        onDrawCancel={onDrawCancel}
      />

      <HighlightLayer />

      <MapControls />

      <MapBridge onReady={onReady} onViewChange={onViewChange} />
    </MapContainer>
  );
}
