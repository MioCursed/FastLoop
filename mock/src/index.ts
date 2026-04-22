import type { PanelBridge } from "@fastloop/shared";
import { createMockAnalysis } from "./mockData";

declare global {
  interface Window {
    __FASTLOOP_BRIDGE__?: PanelBridge;
    __FASTLOOP_LAST_MARKER_REQUEST__?: unknown;
  }
}

window.__FASTLOOP_BRIDGE__ = {
  async getHostCapabilities() {
    return {
      host: "mock",
      markers: { available: true, reason: "Mock marker placement enabled for UI development." },
      timelineTiming: { available: true },
      compTiming: { available: true },
      exportHandOff: { available: true, reason: "Mock mode accepts rendered-asset handoff payloads for UI validation." }
    };
  },
  async analyzeTrack(request) {
    return createMockAnalysis(request.trackId, request.durationTargetSeconds, request.scoringMode);
  },
  async pickSourceFile() {
    return "c:/Users/Nataniel/Downloads/FastLoop/engine/tests/generated/loop_fixture.wav";
  },
  async pickOutputDirectory(initialPath) {
    return initialPath || "c:/mock-fastloop/exports";
  },
  async placeMarkers(request) {
    window.__FASTLOOP_LAST_MARKER_REQUEST__ = request;
    return { ok: true, message: `Mock markers placed for ${request.trackId}.` };
  },
  async previewCandidate(request) {
    return {
      ok: true,
      message: `Mock preview ready for ${request.candidate.id}.`,
      candidateId: request.candidate.id,
      previewMode: request.previewMode,
      loopCycles: request.previewMode === "cycle" ? 1 : 4,
      previewFilePath: `${request.sourcePath}`
    };
  },
  async exportCandidate(request) {
    const outputDirectory = `${request.outputDirectory || "c:/mock-fastloop"}/exports/${request.trackId}/${request.candidate.id}`;
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
    return {
      ok: true,
      message: request.renderedAssetPath
        ? `Mock commit accepted for ${request.candidate.id} with rendered asset handoff.`
        : `Mock commit accepted for ${request.candidate.id}.`,
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
