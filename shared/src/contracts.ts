import type { AnalysisResult, HostCapabilities, LoopCandidate, QueueItem, ScoringMode } from "./types.js";

export interface AnalyzeTrackRequest {
  trackId: string;
  sourcePath: string;
  durationTargetSeconds: number;
  scoringMode: ScoringMode;
}

export interface PlaceMarkersRequest {
  trackId: string;
  candidate: LoopCandidate;
}

export interface ExportPlanRequest {
  trackId: string;
  candidate: LoopCandidate;
  includeIntro: boolean;
  includeLoop: boolean;
  includeOutro: boolean;
  includeExtendedMix: boolean;
  durationTargetSeconds: number;
}

export interface PanelBridge {
  getHostCapabilities(): Promise<HostCapabilities>;
  analyzeTrack(request: AnalyzeTrackRequest): Promise<AnalysisResult>;
  placeMarkers(request: PlaceMarkersRequest): Promise<{ ok: boolean; message: string }>;
  buildExportPlan(request: ExportPlanRequest): Promise<{ ok: boolean; artifacts: string[] }>;
  getQueue(): Promise<QueueItem[]>;
}
