from __future__ import annotations

from collections.abc import Mapping

from .models import LoopCandidate
from .scoring import candidate_feature_vector, resolve_scoring_mode

RERANK_PROFILES: dict[str, dict[str, object]] = {
    "smart": {
        "max_delta": 4.0,
        "weights": {
            "spectral_continuity": 0.20,
            "timbre_continuity": 0.18,
            "energy_continuity": 0.16,
            "loudness_continuity": 0.10,
            "phrase_alignment": 0.08,
            "bar_alignment": 0.06,
            "beat_alignment": 0.06,
            "target_duration_usefulness": 0.07,
            "editorial_usability": 0.09,
            "click_safe": 0.10,
        },
    },
    "duration-priority": {
        "max_delta": 5.0,
        "weights": {
            "target_duration_usefulness": 0.24,
            "editorial_usability": 0.18,
            "spectral_continuity": 0.14,
            "timbre_continuity": 0.12,
            "energy_continuity": 0.10,
            "loudness_continuity": 0.06,
            "phrase_alignment": 0.05,
            "bar_alignment": 0.03,
            "beat_alignment": 0.03,
            "click_safe": 0.05,
        },
    },
    "musical-similarity": {
        "max_delta": 4.5,
        "weights": {
            "spectral_continuity": 0.24,
            "timbre_continuity": 0.22,
            "energy_continuity": 0.14,
            "loudness_continuity": 0.08,
            "phrase_alignment": 0.10,
            "bar_alignment": 0.08,
            "beat_alignment": 0.04,
            "target_duration_usefulness": 0.03,
            "editorial_usability": 0.03,
            "click_safe": 0.04,
        },
    },
}


def rerank_candidates(candidates: list[LoopCandidate], scoring_mode: str) -> list[LoopCandidate]:
    mode = resolve_scoring_mode(scoring_mode)
    if mode == "transparent":
        for candidate in candidates:
            candidate.rerank_delta = 0.0
            candidate.breakdown.ai_rerank_confidence = 0.0
            candidate.composite_score = candidate.scoring_mode_score
            candidate.confidence = candidate.composite_score
        return sorted(candidates, key=lambda candidate: candidate.composite_score, reverse=True)

    profile = RERANK_PROFILES.get(mode, RERANK_PROFILES["smart"])
    weights = profile["weights"]
    max_delta = float(profile["max_delta"])

    for candidate in candidates:
        ai_confidence = _weighted_confidence(candidate_feature_vector(candidate.breakdown), weights)
        rerank_delta = round(((ai_confidence - 75.0) / 25.0) * max_delta, 2)
        candidate.breakdown.ai_rerank_confidence = ai_confidence
        candidate.rerank_delta = rerank_delta
        candidate.composite_score = round(_clamp_score(candidate.scoring_mode_score + rerank_delta), 2)
        candidate.confidence = candidate.composite_score

    return sorted(
        candidates,
        key=lambda candidate: (
            candidate.composite_score,
            candidate.breakdown.ai_rerank_confidence,
            candidate.scoring_mode_score,
        ),
        reverse=True,
    )


def _weighted_confidence(features: Mapping[str, float], weights: object) -> float:
    typed_weights = weights if isinstance(weights, dict) else {}
    total = 0.0
    for metric, weight in typed_weights.items():
        total += float(features.get(metric, 0.0)) * float(weight)
    return round(_clamp_score(total), 2)


def _clamp_score(value: float) -> float:
    return max(0.0, min(100.0, value))
