/**
 * NASA GIBS (Global Imagery Browse Services) tile access.
 *
 * GIBS publishes daily satellite composites as a standard WMTS REST
 * service. The "GoogleMapsCompatible" tile matrix sets are deliberately
 * gridded to match the standard 256px Web Mercator scheme, so they drop
 * straight into a normal Leaflet TileLayer — no custom CRS needed.
 *
 * This module is the architecture seam for temporal imagery: swapping
 * the `date` (and eventually `gibsLayerId`) is all the future Timeline
 * bar needs to do to change what's on the map. Nothing else in MapView
 * needs to know a date changed.
 */

export type GibsLayerId =
  | "VIIRS_SNPP_CorrectedReflectance_TrueColor"
  | "MODIS_Terra_CorrectedReflectance_TrueColor"
  | "MODIS_Aqua_CorrectedReflectance_TrueColor";

type GibsLayerConfig = {
  label: string;
  tileMatrixSet: string;
  maxNativeZoom: number;
  format: "jpg" | "png";
};

export const GIBS_LAYERS: Record<GibsLayerId, GibsLayerConfig> = {
  VIIRS_SNPP_CorrectedReflectance_TrueColor: {
    label: "VIIRS (Suomi NPP) — True Color",
    tileMatrixSet: "GoogleMapsCompatible_Level9",
    maxNativeZoom: 9,
    format: "jpg",
  },
  MODIS_Terra_CorrectedReflectance_TrueColor: {
    label: "MODIS (Terra) — True Color",
    tileMatrixSet: "GoogleMapsCompatible_Level9",
    maxNativeZoom: 9,
    format: "jpg",
  },
  MODIS_Aqua_CorrectedReflectance_TrueColor: {
    label: "MODIS (Aqua) — True Color",
    tileMatrixSet: "GoogleMapsCompatible_Level9",
    maxNativeZoom: 9,
    format: "jpg",
  },
};

export const DEFAULT_GIBS_LAYER_ID: GibsLayerId =
  "VIIRS_SNPP_CorrectedReflectance_TrueColor";

const GIBS_BASE = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

/**
 * GIBS ingest typically lags 1–2 days behind real time. Default a few
 * days back so "today" doesn't silently render a blank/missing tile set.
 */
export function getDefaultGibsDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 3);
  return d.toISOString().slice(0, 10);
}

/**
 * Builds a GIBS WMTS REST tile URL template for react-leaflet's
 * <TileLayer url={...} />. Leaflet substitutes {z}/{x}/{y} by name
 * wherever they appear, so the GIBS row-before-column ordering
 * ({z}/{y}/{x}) works fine even though it reads unusually.
 */
export function getGibsTileUrl(
  layerId: GibsLayerId = DEFAULT_GIBS_LAYER_ID,
  date: string = getDefaultGibsDate(),
): string {
  const cfg = GIBS_LAYERS[layerId];
  return `${GIBS_BASE}/${layerId}/default/${date}/${cfg.tileMatrixSet}/{z}/{y}/{x}.${cfg.format}`;
}

const WMS_BASE = "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi";

/**
 * A single cloud-free "Blue Marble" image of Earth (NASA GIBS WMS GetMap).
 * This is a static, cloudless composite with no time dimension — ideal for a
 * clear hero backdrop, unlike the daily true-color layers which show clouds.
 */
export function getBlueMarbleUrl(width = 1600, height = 1000): string {
  const world = 20037508.34;
  return `${WMS_BASE}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0` +
    `&LAYERS=BlueMarble_ShadedRelief_Bathymetry&STYLES=&FORMAT=image/jpeg` +
    `&CRS=EPSG:3857&BBOX=${-world},${-world},${world},${world}` +
    `&WIDTH=${width}&HEIGHT=${height}`;
}

/**
 * A single static satellite image (GIBS WMS GetMap) sized to `width`x`height`,
 * centered on a location at a given zoom. Used for the landing-page backdrop —
 * one image request instead of a tile cascade, so it loads immediately rather
 * than popping in as a map.
 */
export function getGibsStaticImageUrl(options: {
  layerId?: GibsLayerId;
  date?: string;
  center?: [number, number];
  zoom?: number;
  width?: number;
  height?: number;
} = {}): string {
  const layerId = options.layerId ?? DEFAULT_GIBS_LAYER_ID;
  const date = options.date ?? getDefaultGibsDate();
  const [lat, lng] = options.center ?? [34.05, -118.24];
  const zoom = options.zoom ?? 7;
  const width = options.width ?? 1600;
  const height = options.height ?? 1000;

  const worldSize = 256 * 2 ** zoom;
  const resolution = 40075016.686 / worldSize; // metres per pixel
  const x = (lng / 180) * 20037508.34;
  const latRad = (lat * Math.PI) / 180;
  const y = Math.log(Math.tan(Math.PI / 4 + latRad / 2)) * (20037508.34 / Math.PI);
  const w = width * resolution;
  const h = height * resolution;
  const bbox = `${x - w / 2},${y - h / 2},${x + w / 2},${y + h / 2}`;

  return `${WMS_BASE}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=${layerId}` +
    `&STYLES=&FORMAT=image/jpeg&CRS=EPSG:3857&BBOX=${bbox}` +
    `&WIDTH=${width}&HEIGHT=${height}&TIME=${date}`;
}
