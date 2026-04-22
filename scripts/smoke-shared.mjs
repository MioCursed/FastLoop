import {
  DURATION_PRESETS,
  DEFAULT_SCORING_WEIGHTS,
  computeCompositeScore
} from "../shared/dist/index.js";

const score = computeCompositeScore({
  beatAlignment: 90,
  barAlignment: 92,
  phraseAlignment: 88,
  timbreContinuity: 84,
  spectralContinuity: 86,
  energyContinuity: 85,
  loudnessContinuity: 87,
  clickRiskPenalty: 6,
  targetDurationUsefulness: 89,
  editorialUsability: 83,
  aiRerankConfidence: 0
});

if (!Number.isFinite(score) || DURATION_PRESETS.length !== 10 || DEFAULT_SCORING_WEIGHTS.barAlignment <= 0) {
  throw new Error("Shared smoke validation failed.");
}

console.log(
  JSON.stringify({
    presetCount: DURATION_PRESETS.length,
    score
  })
);
