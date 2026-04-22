import {
  computeCompositeScore,
  computeDeterministicScore,
  type AnalysisResult,
  type LoopCandidate,
  type ScoreBreakdown,
  type ScoringMode
} from "@fastloop/shared";

function buildBreakdown(seed: number, durationTargetSeconds: number): ScoreBreakdown {
  const durationFit = Math.max(55, Math.min(100, 100 - Math.abs(durationTargetSeconds - (8 + seed)) * 3));

  return {
    beatAlignment: 90 + seed,
    barAlignment: 92 + seed,
    phraseAlignment: 86 + seed,
    timbreContinuity: 82 + seed,
    spectralContinuity: 84 + seed,
    energyContinuity: 81 + seed,
    loudnessContinuity: 83 + seed,
    clickRiskPenalty: Math.max(2, 8 - Math.floor(seed / 2)),
    targetDurationUsefulness: durationFit,
    editorialUsability: 80 + seed,
    aiRerankConfidence: 72 + seed
  };
}

export function createMockCandidates(
  trackId: string,
  durationTargetSeconds = 8,
  scoringMode: ScoringMode = "smart"
): LoopCandidate[] {
  const windows = [
    { startSeconds: 8, endSeconds: 16, bars: 4, phraseMultiple: 1 },
    { startSeconds: 16, endSeconds: 32, bars: 8, phraseMultiple: 1 },
    { startSeconds: 32, endSeconds: 64, bars: 16, phraseMultiple: 2 }
  ];

  return windows
    .map((window, index) => {
      const seed = index * 4;
      const breakdown = buildBreakdown(seed, durationTargetSeconds);
      const baseDeterministicScore = computeDeterministicScore(breakdown, "transparent");
      const scoringModeScore = computeDeterministicScore(breakdown, scoringMode);
      const compositeScore = computeCompositeScore(breakdown, scoringMode);

      return {
        id: `candidate-${index + 1}`,
        trackId,
        startSeconds: window.startSeconds,
        endSeconds: window.endSeconds,
        durationSeconds: window.endSeconds - window.startSeconds,
        bars: window.bars,
        phraseMultiple: window.phraseMultiple,
        targetDurationSeconds: durationTargetSeconds,
        baseDeterministicScore,
        scoringModeScore,
        rerankDelta: Number((compositeScore - scoringModeScore).toFixed(2)),
        confidence: compositeScore,
        breakdown,
        compositeScore
      };
    })
    .sort((left, right) => right.compositeScore - left.compositeScore);
}

export function createMockAnalysis(
  trackId: string,
  durationTargetSeconds = 8,
  scoringMode: ScoringMode = "smart"
): AnalysisResult {
  return {
    trackId,
    bpm: 124,
    bars: 48,
    phraseLengthBars: 8,
    sampleRate: 44100,
    durationSeconds: 92.4,
    targetDurationSeconds: durationTargetSeconds,
    scoringMode,
    rerankEnabled: scoringMode !== "transparent",
    beatTimes: Array.from({ length: 49 }, (_, index) => index * 0.48),
    barTimes: Array.from({ length: 13 }, (_, index) => index * 1.92),
    phraseTimes: [0, 15.36, 30.72, 46.08],
    candidates: createMockCandidates(trackId, durationTargetSeconds, scoringMode),
    waveformPeaks: Array.from({ length: 96 }, (_, index) => Math.abs(Math.sin(index / 5) * 0.6)),
    warnings: scoringMode === "transparent" ? ["Smart rerank disabled in transparent mode."] : []
  };
}
