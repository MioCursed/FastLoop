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
global.HTMLMediaElement = window.HTMLMediaElement;

if (window.HTMLMediaElement) {
  window.HTMLMediaElement.prototype.play = function () {
    this.dataset.played = "true";
    return Promise.resolve();
  };
  window.HTMLMediaElement.prototype.pause = function () {};
}

const [{ mountApp }, { createMockAnalysis }] = await Promise.all([
  import(pathToFileURL(`${workspaceRoot}/panel/.smoke-dist/app.js`).href),
  import(pathToFileURL(`${workspaceRoot}/mock/.smoke-dist/mockData.js`).href)
]);

let lastMarkerRequest = null;
let lastCommitRequest = null;
window.__FASTLOOP_BRIDGE__ = {
  async getHostCapabilities() {
    return {
      host: "mock",
      markers: { available: true, reason: "Mock smoke marker bridge." },
      timelineTiming: { available: true },
      compTiming: { available: true },
      exportHandOff: { available: true, reason: "Mock smoke validates rendered-asset handoff." }
    };
  },
  async analyzeTrack(request) {
    return createMockAnalysis(request.trackId, request.durationTargetSeconds, request.scoringMode);
  },
  async pickSourceFile() {
    return `${workspaceRoot}/engine/tests/generated/loop_fixture.wav`;
  },
  async pickOutputDirectory(initialPath) {
    return initialPath || `${workspaceRoot}/.fastloop-output/mock-smoke`;
  },
  async placeMarkers(request) {
    lastMarkerRequest = request;
    return { ok: true, message: `Mock markers accepted for ${request.candidate.id}.` };
  },
  async previewCandidate(request) {
    return {
      ok: true,
      message: `Mock preview ready for ${request.candidate.id}.`,
      candidateId: request.candidate.id,
      previewMode: request.previewMode,
      loopCycles: request.previewMode === "cycle" ? 1 : 4,
      previewFilePath: `${workspaceRoot}/engine/tests/generated/loop_fixture.wav`
    };
  },
  async exportCandidate(request) {
    const outputDirectory = `${request.outputDirectory || `${workspaceRoot}/.fastloop-output/mock`}/exports/${request.trackId}/${request.candidate.id}`;
    const artifacts = {
      introPath: `${outputDirectory}/${request.candidate.id}.intro.wav`,
      loopPath: `${outputDirectory}/${request.candidate.id}.loop.wav`,
      outroPath: `${outputDirectory}/${request.candidate.id}.outro.wav`,
      extendedMixPath: `${outputDirectory}/${request.candidate.id}.extended.wav`,
      metadataPath: `${outputDirectory}/${request.candidate.id}.metadata.json`
    };
    return {
      ok: true,
      message: `Mock export ready for ${request.candidate.id}.`,
      outputDirectory,
      artifacts,
      metadata: {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        trackId: request.trackId,
        sourcePath: request.sourcePath,
        candidateId: request.candidate.id,
        candidateStartSeconds: request.candidate.startSeconds,
        candidateEndSeconds: request.candidate.endSeconds,
        candidateDurationSeconds: request.candidate.durationSeconds,
        durationTargetSeconds: request.durationTargetSeconds,
        scoringMode: request.scoringMode,
        baseDeterministicScore: request.candidate.baseDeterministicScore,
        scoringModeScore: request.candidate.scoringModeScore,
        rerankDelta: request.candidate.rerankDelta,
        compositeScore: request.candidate.compositeScore,
        warnings: request.warnings,
        exportedFiles: artifacts
      }
    };
  },
  async buildExportPlan(request) {
    const result = await this.exportCandidate(request);
    return { ok: result.ok, artifacts: Object.values(result.artifacts) };
  },
  async commitCandidate(request) {
    lastCommitRequest = request;
    return {
      ok: true,
      message: `Mock commit accepted for ${request.candidate.id}.`,
      importedAssetPath: request.renderedAssetPath ?? null
    };
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
window.document.querySelector("#choose-track-button").dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);
await new Promise((resolve) => setTimeout(resolve, 0));
window.document.querySelector("#sidebar-choose-output-button").dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);
await new Promise((resolve) => setTimeout(resolve, 0));

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

if (!candidateRows.length || !lastMarkerRequest || !lastCommitRequest) {
  throw new Error("Mock smoke validation failed: candidate actions missing.");
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
      commitTrackId: lastCommitRequest.trackId,
      commitAssetPath: lastCommitRequest.renderedAssetPath,
      scoringMode: modeValue
    },
    null,
    2
  )
);
