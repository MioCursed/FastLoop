import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const workspaceRoot = process.cwd();
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
global.HTMLMediaElement = window.HTMLMediaElement;

if (window.HTMLMediaElement) {
  window.HTMLMediaElement.prototype.play = function () {
    this.dataset.played = "true";
    return Promise.resolve();
  };
  window.HTMLMediaElement.prototype.pause = function () {};
}

let lastMarkerRequest = null;
let lastCommitRequest = null;
let lastPreviewResult = null;
let lastExportResult = null;
let lastPickedOutputDirectory = null;

window.__FASTLOOP_BRIDGE__ = {
  async getHostCapabilities() {
    return {
      host: "mock",
      markers: { available: true, reason: "Smoke bridge marker validation." },
      timelineTiming: { available: true },
      compTiming: { available: true },
      exportHandOff: { available: true, reason: "Smoke bridge validates rendered-asset handoff." }
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
  async pickSourceFile() {
    return fixturePath;
  },
  async pickOutputDirectory(initialPath) {
    lastPickedOutputDirectory = initialPath || `${workspaceRoot}/.fastloop-output/smoke-panel`;
    return lastPickedOutputDirectory;
  },
  async placeMarkers(request) {
    lastMarkerRequest = request;
    return { ok: true, message: `Smoke markers accepted for ${request.candidate.id}.` };
  },
  async previewCandidate(request) {
    const stdout = execFileSync(
      "python",
      [
        "-m",
        "fastloop_engine.render_cli",
        "preview",
        request.sourcePath,
        "--track-id",
        request.trackId,
        "--candidate-json",
        JSON.stringify(request.candidate),
        "--preview-mode",
        request.previewMode
      ],
      {
        cwd: workspaceRoot,
        encoding: "utf8"
      }
    );
    lastPreviewResult = JSON.parse(stdout);
    return lastPreviewResult;
  },
  async exportCandidate(request) {
    const stdout = execFileSync(
      "python",
      [
        "-m",
        "fastloop_engine.render_cli",
        "export",
        request.sourcePath,
        "--track-id",
        request.trackId,
        "--candidate-json",
        JSON.stringify(request.candidate),
        "--duration-target",
        String(request.durationTargetSeconds),
        "--scoring-mode",
        request.scoringMode,
        "--warnings-json",
        JSON.stringify(request.warnings),
        ...(request.outputDirectory ? ["--output-dir", request.outputDirectory] : [])
      ],
      {
        cwd: workspaceRoot,
        encoding: "utf8"
      }
    );
    lastExportResult = JSON.parse(stdout);
    return lastExportResult;
  },
  async buildExportPlan(request) {
    const result = await this.exportCandidate(request);
    return { ok: result.ok, artifacts: Object.values(result.artifacts) };
  },
  async commitCandidate(request) {
    lastCommitRequest = request;
    return {
      ok: true,
      message: `Smoke commit accepted for ${request.candidate.id}.`,
      importedAssetPath: request.renderedAssetPath ?? null
    };
  },
  async getQueue() {
    return [];
  }
};

const appModule = await import(pathToFileURL(`${workspaceRoot}/panel/.smoke-dist/app.js`).href);
await appModule.mountApp(window.document.querySelector("#app"), {
  bridge: window.__FASTLOOP_BRIDGE__
});

window.document.querySelector("#choose-track-button").dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);
await new Promise((resolve) => setTimeout(resolve, 0));
window.document.querySelector("#sidebar-choose-output-button").dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);
await new Promise((resolve) => setTimeout(resolve, 0));

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

window.document.querySelector("#preview-button").dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);
await new Promise((resolve) => setTimeout(resolve, 0));

window.document.querySelector("#export-button").dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);
await new Promise((resolve) => setTimeout(resolve, 0));

window.document.querySelector("#commit-button").dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);
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
const previewAudio = window.document.querySelector("#preview-audio");
const sourcePathValue = window.document.querySelector("#track-path-input")?.value ?? "";
const exportDirectoryValue = window.document.querySelector("#export-directory-input")?.value ?? "";

if (
  !bpmText ||
  !selectedCandidate ||
  !lastMarkerRequest ||
  !lastCommitRequest ||
  !lastPreviewResult ||
  !lastExportResult ||
  !previewAudio ||
  !sourcePathValue.includes("loop_fixture.wav") ||
  !exportDirectoryValue.includes(".fastloop-output/smoke-panel") ||
  targetText !== "30s" ||
  modeText !== "duration-priority" ||
  lastPickedOutputDirectory === null
) {
  throw new Error("Panel smoke validation failed: render or payload flow is incomplete.");
}

console.log(
  JSON.stringify(
    {
      bpm: bpmText,
      renderedCandidates: candidateRows.length,
      selectedCandidateId: lastMarkerRequest.candidate.id,
      markerMessage: statusLine.trim(),
      previewPath: lastPreviewResult.previewFilePath,
      exportMetadataPath: lastExportResult.artifacts.metadataPath,
      committedCandidateId: lastCommitRequest.candidate.id,
      commitAssetPath: lastCommitRequest.renderedAssetPath,
      exportOutputDirectory: lastExportResult.outputDirectory,
      targetText,
      modeText
    },
    null,
    2
  )
);
