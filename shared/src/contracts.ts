import type {
  AnalysisResult,
  CommitCandidateResult,
  ExportResult,
  HostCapabilities,
  LoopCandidate,
  PreviewMode,
  PreviewResult,
  QueueItem,
  ScoringMode
} from "./types.js";

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

export interface PreviewCandidateRequest {
  trackId: string;
  sourcePath: string;
  candidate: LoopCandidate;
  previewMode: PreviewMode;
}

export interface ExportPlanRequest {
  trackId: string;
  sourcePath: string;
  candidate: LoopCandidate;
  scoringMode: ScoringMode;
  warnings: string[];
  includeIntro: boolean;
  includeLoop: boolean;
  includeOutro: boolean;
  includeExtendedMix: boolean;
  durationTargetSeconds: number;
  outputDirectory?: string | null;
}

export interface CommitCandidateRequest {
  trackId: string;
  candidate: LoopCandidate;
  renderedAssetPath?: string | null;
}

export interface PanelBridge {
  getHostCapabilities(): Promise<HostCapabilities>;
  analyzeTrack(request: AnalyzeTrackRequest): Promise<AnalysisResult>;
  pickSourceFile(initialPath?: string | null): Promise<string | null>;
  pickOutputDirectory(initialPath?: string | null): Promise<string | null>;
  placeMarkers(request: PlaceMarkersRequest): Promise<{ ok: boolean; message: string }>;
  previewCandidate(request: PreviewCandidateRequest): Promise<PreviewResult>;
  exportCandidate(request: ExportPlanRequest): Promise<ExportResult>;
  buildExportPlan(request: ExportPlanRequest): Promise<{ ok: boolean; artifacts: string[] }>;
  commitCandidate(request: CommitCandidateRequest): Promise<CommitCandidateResult>;
  getQueue(): Promise<QueueItem[]>;
}
