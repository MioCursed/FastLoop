import type { ScoreBreakdown, ScoringMode } from "./types.js";

export interface ScoringWeights {
  beatAlignment: number;
  barAlignment: number;
  phraseAlignment: number;
  timbreContinuity: number;
  spectralContinuity: number;
  energyContinuity: number;
  loudnessContinuity: number;
  targetDurationUsefulness: number;
  editorialUsability: number;
}

export const SCORING_WEIGHTS: Record<ScoringMode, ScoringWeights> = {
  transparent: {
    beatAlignment: 0.14,
    barAlignment: 0.14,
    phraseAlignment: 0.12,
    timbreContinuity: 0.1,
    spectralContinuity: 0.1,
    energyContinuity: 0.1,
    loudnessContinuity: 0.08,
    targetDurationUsefulness: 0.1,
    editorialUsability: 0.12
  },
  smart: {
    beatAlignment: 0.14,
    barAlignment: 0.14,
    phraseAlignment: 0.12,
    timbreContinuity: 0.1,
    spectralContinuity: 0.1,
    energyContinuity: 0.1,
    loudnessContinuity: 0.08,
    targetDurationUsefulness: 0.1,
    editorialUsability: 0.12
  },
  "duration-priority": {
    beatAlignment: 0.1,
    barAlignment: 0.1,
    phraseAlignment: 0.1,
    timbreContinuity: 0.08,
    spectralContinuity: 0.08,
    energyContinuity: 0.08,
    loudnessContinuity: 0.06,
    targetDurationUsefulness: 0.2,
    editorialUsability: 0.2
  },
  "musical-similarity": {
    beatAlignment: 0.12,
    barAlignment: 0.12,
    phraseAlignment: 0.14,
    timbreContinuity: 0.14,
    spectralContinuity: 0.14,
    energyContinuity: 0.1,
    loudnessContinuity: 0.08,
    targetDurationUsefulness: 0.06,
    editorialUsability: 0.1
  }
};

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = SCORING_WEIGHTS.smart;

export const CLICK_RISK_PENALTY_WEIGHT: Record<ScoringMode, number> = {
  transparent: 0.08,
  smart: 0.08,
  "duration-priority": 0.07,
  "musical-similarity": 0.08
};

export const RERANK_MAX_DELTA: Record<ScoringMode, number> = {
  transparent: 0,
  smart: 4,
  "duration-priority": 5,
  "musical-similarity": 4.5
};

export function computeDeterministicScore(
  breakdown: ScoreBreakdown,
  scoringMode: ScoringMode = "smart"
): number {
  const weights = SCORING_WEIGHTS[scoringMode];
  const positive =
    breakdown.beatAlignment * weights.beatAlignment +
    breakdown.barAlignment * weights.barAlignment +
    breakdown.phraseAlignment * weights.phraseAlignment +
    breakdown.timbreContinuity * weights.timbreContinuity +
    breakdown.spectralContinuity * weights.spectralContinuity +
    breakdown.energyContinuity * weights.energyContinuity +
    breakdown.loudnessContinuity * weights.loudnessContinuity +
    breakdown.targetDurationUsefulness * weights.targetDurationUsefulness +
    breakdown.editorialUsability * weights.editorialUsability;

  const penalty = breakdown.clickRiskPenalty * CLICK_RISK_PENALTY_WEIGHT[scoringMode];
  return Number(Math.max(0, Math.min(100, positive - penalty)).toFixed(2));
}

export function computeCompositeScore(
  breakdown: ScoreBreakdown,
  scoringMode: ScoringMode = "smart"
): number {
  const deterministicScore = computeDeterministicScore(breakdown, scoringMode);
  const rerankDelta =
    scoringMode === "transparent"
      ? 0
      : Number((((breakdown.aiRerankConfidence - 75) / 25) * RERANK_MAX_DELTA[scoringMode]).toFixed(2));

  return Number(Math.max(0, Math.min(100, deterministicScore + rerankDelta)).toFixed(2));
}
