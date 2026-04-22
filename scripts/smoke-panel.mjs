import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const workspaceRoot = "c:/Users/Nataniel/Downloads/FastLoop";
const fixtureBuilder = `${workspaceRoot}/engine/tests/fixture_builder.py`;
const fixturePath = `${workspaceRoot}/engine/tests/generated/loop_fixture.wav`;

execFileSync("python", [fixtureBuilder], {
  cwd: workspaceRoot,
  encoding: "utf8"
});

const dom = new JSDOM(`<!doctype html><html><body><div id="app"></div></body></html>`, {
  url: pathToFileURL(`${workspaceRoot}/panel/dist/index.html`).href
});

const { window } = dom;
global.window = window;
global.document = window.document;
global.HTMLElement = window.HTMLElement;
global.Node = window.Node;
global.Event = window.Event;
global.MouseEvent = window.MouseEvent;

let lastMarkerRequest = null;

window.__FASTLOOP_BRIDGE__ = {
  async getHostCapabilities() {
    return {
      host: "mock",
      markers: { available: true, reason: "Smoke bridge marker validation." },
      timelineTiming: { available: true },
      compTiming: { available: true },
      exportHandOff: { available: false, reason: "Not used in Block 3 smoke." }
    };
  },
  async analyzeTrack(request) {
    const stdout = execFileSync(
      "python",
      [
        "-m",
        "fastloop_engine.cli",
        request.sourcePath,
        "--track-id",
        request.trackId,
        "--duration-target",
        String(request.durationTargetSeconds),
        "--scoring-mode",
        request.scoringMode
      ],
      {
        cwd: workspaceRoot,
        encoding: "utf8"
      }
    );

    return JSON.parse(stdout);
  },
  async placeMarkers(request) {
    lastMarkerRequest = request;
    return { ok: true, message: `Smoke markers accepted for ${request.candidate.id}.` };
  },
  async buildExportPlan() {
    return { ok: true, artifacts: [] };
  },
  async getQueue() {
    return [];
  }
};

const appModule = await import(pathToFileURL(`${workspaceRoot}/panel/.smoke-dist/app.js`).href);
await appModule.mountApp(window.document.querySelector("#app"), {
  bridge: window.__FASTLOOP_BRIDGE__
});

const pathInput = window.document.querySelector("#track-path-input");
pathInput.value = fixturePath;
pathInput.dispatchEvent(new window.Event("input", { bubbles: true }));

window.document.querySelector('[data-duration-target="30"]')?.dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);
window.document.querySelector('[data-scoring-mode="duration-priority"]')?.dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);

const analyzeButton = window.document.querySelector("#analyze-button");
analyzeButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 50));

const candidateRows = [...window.document.querySelectorAll("[data-candidate-id]")];
if (candidateRows.length < 2) {
  throw new Error("Panel smoke validation failed: expected multiple rendered candidates.");
}

candidateRows[1].dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 0));

window.document.querySelector("#place-markers-button").dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);
await new Promise((resolve) => setTimeout(resolve, 0));

const bpmText = window.document.querySelector(".metric-grid strong")?.textContent ?? "";
const selectedCandidate = window.document.querySelector(".candidate-row.selected");
const statusLine = window.document.querySelector(".status-line")?.textContent ?? "";
const targetText = [...window.document.querySelectorAll(".metric-grid span")]
  .find((node) => node.textContent === "Target")
  ?.nextElementSibling?.textContent;
const modeText = [...window.document.querySelectorAll(".metric-grid span")]
  .find((node) => node.textContent === "Mode")
  ?.nextElementSibling?.textContent;

if (!bpmText || !selectedCandidate || !lastMarkerRequest || targetText !== "30s" || modeText !== "duration-priority") {
  throw new Error("Panel smoke validation failed: render or payload flow is incomplete.");
}

console.log(
  JSON.stringify(
    {
      bpm: bpmText,
      renderedCandidates: candidateRows.length,
      selectedCandidateId: lastMarkerRequest.candidate.id,
      markerMessage: statusLine.trim(),
      targetText,
      modeText
    },
    null,
    2
  )
);
