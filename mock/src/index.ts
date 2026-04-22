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
      exportHandOff: { available: false, reason: "Mock mode does not export through Adobe." }
    };
  },
  async analyzeTrack(request) {
    return createMockAnalysis(request.trackId, request.durationTargetSeconds, request.scoringMode);
  },
  async placeMarkers(request) {
    window.__FASTLOOP_LAST_MARKER_REQUEST__ = request;
    return { ok: true, message: `Mock markers placed for ${request.trackId}.` };
  },
  async buildExportPlan(request) {
    return {
      ok: true,
      artifacts: [
        `${request.trackId}.intro.wav`,
        `${request.trackId}.loop.wav`,
        `${request.trackId}.outro.wav`,
        `${request.trackId}.metadata.json`
      ]
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
