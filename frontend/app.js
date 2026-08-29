const SELECTED_STYLE = { color: "#2563eb", weight: 3, fillColor: "#2563eb", fillOpacity: 0.2 };

const statusEl = document.getElementById("status");
const queryEl = document.getElementById("query");
const chatBtn = document.getElementById("btn-chat");
const timelineBtn = document.getElementById("btn-timeline");
const summarizeBtn = document.getElementById("btn-summarize");
const resultsEl = document.getElementById("results");
const anomalyList = document.getElementById("anomaly-list");
const timelineEl = document.getElementById("timeline");
const yearSlider = document.getElementById("year-slider");
const yearLabel = document.getElementById("year-label");
const yearStartEl = document.getElementById("year-start");
const yearEndEl = document.getElementById("year-end");
const toggleClassification = document.getElementById("toggle-classification");

let selectedLayer = null;
let geometry = null;

function setStatus(text, ok = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("ok", ok);
}

function postJSON(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function runTool(url, makeBody) {
  if (!geometry) return;
  chatBtn.disabled = timelineBtn.disabled = summarizeBtn.disabled = true;
  addCard("loading", "Thinking…");
  try {
    const res = await postJSON(url, makeBody());
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
    resultsEl.lastElementChild.remove();
    render(data, url);
  } catch (err) {
    resultsEl.lastElementChild.remove();
    addCard("error", err.message);
  } finally {
    chatBtn.disabled = timelineBtn.disabled = summarizeBtn.disabled = false;
  }
}

const RENDERERS = {
  "/api/chat": (d) => {
    addCard("reply", d.reply);
    addStatCard("stats", [
      ["Vegetation", `${d.stats.veg_pct}%`],
      ["Water", `${d.stats.water_pct}%`],
      ["Built-up", `${d.stats.built_up_pct}%`],
      ["Valid pixels", String(d.stats.valid_pixels)],
    ]);
  },
  "/api/timeline": (d) => {
    addCard("narrative", d.narrative);
    for (const key of ["vegetation", "water", "built_up"]) {
      const s = d.diff[key];
      addStatCard(key, [
        ["Start", `${s.start_pct}%`],
        ["End", `${s.end_pct}%`],
        ["Change", `${s.net_change_pct}%`],
      ]);
    }
  },
  "/api/summarize-region": (d) => {
    addCard("summary", d.summary.narrative);
    addStatCard("raw stats", [
      ["Vegetation", `${d.summary.veg_pct}%`],
      ["Water", `${d.summary.water_pct}%`],
      ["Built-up", `${d.summary.built_up_pct}%`],
      ["Valid pixels", String(d.summary.valid_pixels)],
    ]);
  },
  "/api/query": (d) => {
    addCard("reply", d.reply);
    renderHighlights(d.highlights);
    if (d.intent === "change") {
      for (const key of ["vegetation", "water", "built_up"]) {
        const s = d.stats[key];
        addStatCard(key, [
          ["Start", `${s.start_pct}%`],
          ["End", `${s.end_pct}%`],
          ["Change", `${s.net_change_pct}%`],
        ]);
      }
    } else if (d.intent === "land_cover") {
      addStatCard("land cover", [
        ["Vegetation", `${d.stats.veg_pct}%`],
        ["Water", `${d.stats.water_pct}%`],
        ["Built-up", `${d.stats.built_up_pct}%`],
      ]);
    } else if (d.intent === "near_water_built_up") {
      addStatCard("near water", [["New construction", `${d.stats.new_construction_pixels} px`]]);
    }
  },
};

function render(data, url) {
  (RENDERERS[url] || (() => {}))(data);
  anomalyList.querySelectorAll("li").forEach((li) => li.classList.remove("focused"));
}

function addCard(title, body) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `<h4>${title}</h4><p></p>`;
  const p = card.querySelector("p");
  p.textContent = body;
  if (title === "error") p.classList.add("error");
  resultsEl.appendChild(card);
  card.scrollIntoView({ block: "nearest" });
}

function addStatCard(title, rows) {
  const card = document.createElement("div");
  card.className = "card";
  let html = `<h4>${title}</h4><dl>`;
  for (const [k, v] of rows) html += `<dt>${k}</dt><dd>${v}</dd>`;
  html += "</dl>";
  card.innerHTML = html;
  resultsEl.appendChild(card);
  card.scrollIntoView({ block: "nearest" });
}

const HIGHLIGHT_COLORS = {
  water: "#1e5adc",
  vegetation: "#22c55e",
  built_up: "#dc3c3c",
  new_construction: "#f59e0b",
};

function renderHighlights(fc) {
  if (!fc) return;
  highlightLayer.clearLayers();
  for (const feature of fc.features) {
    const color = HIGHLIGHT_COLORS[feature.properties.class] || "#f59e0b";
    L.geoJSON(feature, {
      style: { color, weight: 1, fillOpacity: 0.35 },
    }).addTo(highlightLayer);
  }
}

async function loadAnomalies() {
  try {
    const res = await fetch("/api/anomalies");
    const alerts = await res.json();
    anomalyList.innerHTML = "";
    for (const alert of alerts) {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${alert.alert}</strong>${alert.detail}`;
      li.addEventListener("click", () => {
        map.flyTo([alert.coordinates[1], alert.coordinates[0]], alert.zoom_level, { duration: 1 });
        if (rasters.length) {
          yearSlider.value = "0";
          yearSlider.dispatchEvent(new Event("input"));
          setStatus("Showing before — drag the timeline to compare", true);
        }
        anomalyList.querySelectorAll("li").forEach((l) => l.classList.remove("focused"));
        li.classList.add("focused");
      });
      anomalyList.appendChild(li);
    }
  } catch {
    anomalyList.innerHTML = "<li>Could not load anomaly alerts.</li>";
  }
}

const map = L.map("map").setView([0, 0], 5);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

let imageryOverlay = null;
let classOverlay = null;
let rasters = [];
let selectedYear = null;

async function loadImagery() {
  try {
    const res = await fetch("/api/rasters");
    rasters = await res.json();
    if (!rasters.length) return;
    const latest = rasters[rasters.length - 1];
    const { west, south, east, north } = latest.bounds;
    const corners = [[south, west], [north, east]];
    selectedYear = latest.year;

    imageryOverlay = L.imageOverlay(`/api/imagery/${latest.year}`, corners, {
      opacity: 0.85,
      zIndex: 1,
    }).addTo(map);

    classOverlay = L.imageOverlay(`/api/classification/${latest.year}`, corners, {
      opacity: 1,
      zIndex: 2,
    }).addTo(map);

    const coverage = L.rectangle(corners, {
      color: "#16a34a",
      weight: 2,
      dashArray: "6 4",
      fillColor: "#16a34a",
      fillOpacity: 0.1,
      interactive: false,
    }).addTo(map);
    coverage.bindTooltip("Demo satellite coverage — draw here", { sticky: true });

    map.fitBounds(corners);
    setupTimeline();
  } catch {
    setStatus("Could not load satellite imagery", false);
  }
}

toggleClassification.addEventListener("change", () => {
  if (!classOverlay) return;
  if (toggleClassification.checked) map.addLayer(classOverlay);
  else map.removeLayer(classOverlay);
});

function setupTimeline() {
  const last = rasters.length - 1;
  yearSlider.min = "0";
  yearSlider.max = String(last);
  yearSlider.value = String(last);
  yearStartEl.textContent = rasters[0].year;
  yearEndEl.textContent = rasters[last].year;
  yearLabel.textContent = `Year: ${rasters[last].year}`;

  yearSlider.addEventListener("input", () => {
    const year = rasters[Number(yearSlider.value)].year;
    selectedYear = year;
    yearLabel.textContent = `Year: ${year}`;
    imageryOverlay.setUrl(`/api/imagery/${year}`);
    classOverlay.setUrl(`/api/classification/${year}`);
  });

  timelineEl.classList.add("ready");
}

const drawnItems = new L.FeatureGroup();
const highlightLayer = L.layerGroup();
map.addLayer(drawnItems);
map.addLayer(highlightLayer);
map.addControl(new L.Control.Draw({
  draw: { circle: {}, circlemarker: false, marker: false, polyline: false, rectangle: {}, polygon: {} },
}));

map.on("draw:created", (e) => {
  drawnItems.clearLayers();
  highlightLayer.clearLayers();
  selectedLayer = e.layer;
  drawnItems.addLayer(selectedLayer);
  geometry = selectedLayer.toGeoJSON().geometry;
  chatBtn.disabled = timelineBtn.disabled = summarizeBtn.disabled = false;
});

chatBtn.addEventListener("click", () =>
  runTool("/api/query", () => ({ geometry, query: queryEl.value, start_year: rasters[0].year, end_year: selectedYear }))
);
timelineBtn.addEventListener("click", () =>
  runTool("/api/timeline", () => ({ geometry, start_year: rasters[0].year, end_year: selectedYear }))
);
summarizeBtn.addEventListener("click", () =>
  runTool("/api/summarize-region", () => ({ geometry, end_year: selectedYear }))
);

setStatus("online", true);
loadImagery();
loadAnomalies();