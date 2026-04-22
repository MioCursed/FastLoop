import { JSDOM } from "jsdom";
import { pathToFileURL } from "node:url";

const workspaceRoot = "c:/Users/Nataniel/Downloads/FastLoop";

const dom = new JSDOM(`<!doctype html><html><body><div id="app"></div></body></html>`, {
  url: pathToFileURL(`${workspaceRoot}/mock/dist/index.html`).href
});

const { window } = dom;
global.window = window;
global.document = window.document;
global.HTMLElement = window.HTMLElement;
global.Node = window.Node;
global.Event = window.Event;
global.MouseEvent = window.MouseEvent;

const [{ mountApp }, { createMockAnalysis }] = await Promise.all([
  import(pathToFileURL(`${workspaceRoot}/panel/.smoke-dist/app.js`).href),
  import(pathToFileURL(`${workspaceRoot}/mock/.smoke-dist/mockData.js`).href)
]);

let lastMarkerRequest = null;
window.__FASTLOOP_BRIDGE__ = {
  async getHostCapabilities() {
    return {
      host: "mock",
      markers: { available: true, reason: "Mock smoke marker bridge." },
      timelineTiming: { available: true },
      compTiming: { available: true },
      exportHandOff: { available: false, reason: "Mock smoke export not used." }
    };
  },
  async analyzeTrack(request) {
    return createMockAnalysis(request.trackId, request.durationTargetSeconds, request.scoringMode);
  },
  async placeMarkers(request) {
    lastMarkerRequest = request;
    return { ok: true, message: `Mock markers accepted for ${request.candidate.id}.` };
  },
  async buildExportPlan() {
    return { ok: true, artifacts: [] };
  },
  async getQueue() {
    return [
      {
        trackId: "track-01",
        status: "ready",
        candidateCount: 3,
        durationTargetSeconds: 30,
        exportState: "planned"
      }
    ];
  }
};

await mountApp(window.document.querySelector("#app"), {
  bridge: window.__FASTLOOP_BRIDGE__
});

window.document.querySelector('[data-duration-target="20"]')?.dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);
window.document.querySelector('[data-scoring-mode="transparent"]')?.dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);

window.document.querySelector("#analyze-button").dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);
await new Promise((resolve) => setTimeout(resolve, 0));

const candidateRows = [...window.document.querySelectorAll("[data-candidate-id]")];
candidateRows[0]?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
window.document.querySelector("#place-markers-button").dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);
await new Promise((resolve) => setTimeout(resolve, 0));

if (!candidateRows.length || !lastMarkerRequest) {
  throw new Error("Mock smoke validation failed: candidates or marker payload missing.");
}

const inspectorValues = [...window.document.querySelectorAll(".metric-grid div")].map((node) =>
  node.textContent?.trim()
);
if (!inspectorValues.some((value) => value?.includes("20s")) || !inspectorValues.some((value) => value?.includes("transparent"))) {
  throw new Error("Mock smoke validation failed: duration-aware mode details missing.");
}

const modeValue =
  inspectorValues
    .find((value) => value?.includes("transparent"))
    ?.replace(/^Mode/i, "")
    .trim() ?? "unknown";

console.log(
  JSON.stringify(
    {
      candidateCount: candidateRows.length,
      queueRows: window.document.querySelectorAll(".queue-row").length,
      markerTrackId: lastMarkerRequest.trackId,
      scoringMode: modeValue
    },
    null,
    2
  )
);
