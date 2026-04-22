export type AdobeHostKind = "premiere" | "aftereffects" | "mock" | "unknown";

export type ScoringMode =
  | "transparent"
  | "smart"
  | "duration-priority"
  | "musical-similarity";

export interface TransportCapability {
  available: boolean;
  reason?: string;
}

export interface HostCapabilities {
  host: AdobeHostKind;
  markers: TransportCapability;
  timelineTiming: TransportCapability;
  compTiming: TransportCapability;
  exportHandOff: TransportCapability;
}

export interface LibraryTrack {
  id: string;
  name: string;
  sourcePath: string;
  durationSeconds: number;
  cacheState: "missing" | "queued" | "ready" | "stale";
}

export interface ScoreBreakdown {
  beatAlignment: number;
  barAlignment: number;
  phraseAlignment: number;
  timbreContinuity: number;
  spectralContinuity: number;
  energyContinuity: number;
  loudnessContinuity: number;
  clickRiskPenalty: number;
  targetDurationUsefulness: number;
  editorialUsability: number;
  aiRerankConfidence: number;
}

export interface LoopCandidate {
  id: string;
  trackId: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  bars: number;
  phraseMultiple: number;
  targetDurationSeconds: number;
  baseDeterministicScore: number;
  scoringModeScore: number;
  rerankDelta: number;
  compositeScore: number;
  confidence: number;
  breakdown: ScoreBreakdown;
}

export interface AnalysisResult {
  trackId: string;
  bpm: number;
  bars: number;
  phraseLengthBars: number;
  sampleRate: number;
  durationSeconds: number;
  targetDurationSeconds: number;
  scoringMode: ScoringMode;
  rerankEnabled: boolean;
  beatTimes: number[];
  barTimes: number[];
  phraseTimes: number[];
  candidates: LoopCandidate[];
  waveformPeaks: number[];
  warnings: string[];
}

export interface QueueItem {
  trackId: string;
  status: "idle" | "analyzing" | "ready" | "exporting" | "error";
  candidateCount: number;
  durationTargetSeconds: number;
  exportState: "none" | "planned" | "done" | "failed";
}
