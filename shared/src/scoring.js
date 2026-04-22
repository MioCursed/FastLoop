export const DEFAULT_SCORING_WEIGHTS = {
    beatAlignment: 0.12,
    barAlignment: 0.12,
    phraseAlignment: 0.12,
    timbreContinuity: 0.1,
    spectralContinuity: 0.1,
    energyContinuity: 0.1,
    loudnessContinuity: 0.08,
    clickRiskPenalty: 0.08,
    targetDurationUsefulness: 0.08,
    editorialUsability: 0.06,
    aiRerankConfidence: 0.04
};
export function computeCompositeScore(breakdown, weights = DEFAULT_SCORING_WEIGHTS) {
    const positive = breakdown.beatAlignment * weights.beatAlignment +
        breakdown.barAlignment * weights.barAlignment +
        breakdown.phraseAlignment * weights.phraseAlignment +
        breakdown.timbreContinuity * weights.timbreContinuity +
        breakdown.spectralContinuity * weights.spectralContinuity +
        breakdown.energyContinuity * weights.energyContinuity +
        breakdown.loudnessContinuity * weights.loudnessContinuity +
        breakdown.targetDurationUsefulness * weights.targetDurationUsefulness +
        breakdown.editorialUsability * weights.editorialUsability +
        breakdown.aiRerankConfidence * weights.aiRerankConfidence;
    const penalty = breakdown.clickRiskPenalty * weights.clickRiskPenalty;
    return Number(Math.max(0, Math.min(100, positive - penalty)).toFixed(2));
}
