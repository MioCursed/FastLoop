from __future__ import annotations

from collections.abc import Mapping

import numpy as np

from .candidates import CandidateWindow, summarize_boundary_context
from .config import EngineConfig
from .features import FeatureBundle
from .models import CandidateBreakdown

ScoringWeights = dict[str, float]

DETERMINISTIC_SCORING_WEIGHTS: dict[str, ScoringWeights] = {
    "transparent": {
        "beat_alignment": 0.14,
        "bar_alignment": 0.14,
        "phrase_alignment": 0.12,
        "timbre_continuity": 0.10,
        "spectral_continuity": 0.10,
        "energy_continuity": 0.10,
        "loudness_continuity": 0.08,
        "target_duration_usefulness": 0.10,
        "editorial_usability": 0.12,
    },
    "smart": {
        "beat_alignment": 0.14,
        "bar_alignment": 0.14,
        "phrase_alignment": 0.12,
        "timbre_continuity": 0.10,
        "spectral_continuity": 0.10,
        "energy_continuity": 0.10,
        "loudness_continuity": 0.08,
        "target_duration_usefulness": 0.10,
        "editorial_usability": 0.12,
    },
    "duration-priority": {
        "beat_alignment": 0.10,
        "bar_alignment": 0.10,
        "phrase_alignment": 0.10,
        "timbre_continuity": 0.08,
        "spectral_continuity": 0.08,
        "energy_continuity": 0.08,
        "loudness_continuity": 0.06,
        "target_duration_usefulness": 0.20,
        "editorial_usability": 0.20,
    },
    "musical-similarity": {
        "beat_alignment": 0.12,
        "bar_alignment": 0.12,
        "phrase_alignment": 0.14,
        "timbre_continuity": 0.14,
        "spectral_continuity": 0.14,
        "energy_continuity": 0.10,
        "loudness_continuity": 0.08,
        "target_duration_usefulness": 0.06,
        "editorial_usability": 0.10,
    },
}

CLICK_RISK_PENALTY_WEIGHTS: dict[str, float] = {
    "transparent": 0.08,
    "smart": 0.08,
    "duration-priority": 0.07,
    "musical-similarity": 0.08,
}


def deterministic_modes() -> tuple[str, ...]:
    return tuple(DETERMINISTIC_SCORING_WEIGHTS.keys())


def resolve_scoring_mode(scoring_mode: str) -> str:
    return scoring_mode if scoring_mode in DETERMINISTIC_SCORING_WEIGHTS else "smart"


def deterministic_ranking_enabled(scoring_mode: str) -> bool:
    return resolve_scoring_mode(scoring_mode) != "transparent"


def compute_deterministic_score(breakdown: CandidateBreakdown, scoring_mode: str) -> float:
    mode = resolve_scoring_mode(scoring_mode)
    weights = DETERMINISTIC_SCORING_WEIGHTS[mode]
    positive = sum(getattr(breakdown, metric) * weight for metric, weight in weights.items())
    penalty = breakdown.click_risk_penalty * CLICK_RISK_PENALTY_WEIGHTS[mode]
    return round(max(0.0, min(100.0, positive - penalty)), 2)


def candidate_feature_vector(breakdown: CandidateBreakdown) -> Mapping[str, float]:
    return {
        "beat_alignment": breakdown.beat_alignment,
        "bar_alignment": breakdown.bar_alignment,
        "phrase_alignment": breakdown.phrase_alignment,
        "timbre_continuity": breakdown.timbre_continuity,
        "spectral_continuity": breakdown.spectral_continuity,
        "energy_continuity": breakdown.energy_continuity,
        "loudness_continuity": breakdown.loudness_continuity,
        "target_duration_usefulness": breakdown.target_duration_usefulness,
        "editorial_usability": breakdown.editorial_usability,
        "click_safe": round(100.0 - breakdown.click_risk_penalty, 2),
    }


def _scale_similarity(value: float) -> float:
    return round(float(np.clip((value + 1.0) * 50.0, 0.0, 100.0)), 2)


def _energy_continuity(start_energy: float, end_energy: float) -> float:
    denominator = max(abs(start_energy), abs(end_energy), 1e-6)
    delta = abs(end_energy - start_energy) / denominator
    return round(float(np.clip(100.0 * (1.0 - delta), 0.0, 100.0)), 2)


def _click_risk_penalty(samples: np.ndarray, sample_rate: int, start: float, end: float) -> float:
    start_index = int(np.clip(round(start * sample_rate), 1, len(samples) - 2))
    end_index = int(np.clip(round(end * sample_rate), 1, len(samples) - 2))

    sample_gap = abs(float(samples[start_index] - samples[end_index]))
    start_slope = float(samples[start_index] - samples[start_index - 1])
    end_slope = float(samples[end_index] - samples[end_index - 1])
    slope_gap = abs(start_slope - end_slope)

    penalty = (sample_gap * 0.7) + (slope_gap * 0.3)
    return round(float(np.clip(penalty * 100.0, 0.0, 100.0)), 2)


def _nearest_grid_alignment(times: list[float], target: float, tolerance: float) -> float:
    if not times:
        return 0.0
    nearest = min(abs(point - target) for point in times)
    ratio = min(nearest / max(tolerance, 1e-6), 1.0)
    return round((1.0 - ratio) * 100.0, 2)


def _duration_fit(duration_seconds: float, target_seconds: float) -> float:
    if target_seconds <= 0:
        return 50.0
    error_ratio = min(abs(duration_seconds - target_seconds) / max(target_seconds, 1e-6), 1.0)
    close_bonus = 10.0 if abs(duration_seconds - target_seconds) <= 0.5 else 0.0
    return round(float(np.clip((1.0 - error_ratio) * 100.0 + close_bonus, 0.0, 100.0)), 2)


def build_candidate_breakdown(
    samples: np.ndarray,
    features: FeatureBundle,
    window: CandidateWindow,
    target_seconds: float,
    config: EngineConfig | None = None,
) -> CandidateBreakdown:
    config = config or EngineConfig()
    duration_seconds = window.end_seconds - window.start_seconds
    beat_period = 60.0 / max(features.bpm, 1e-6)
    bar_period = beat_period * max(features.beats_per_bar, 1)

    boundary = summarize_boundary_context(features, window, config)
    spectral_continuity = _scale_similarity(boundary["spectral_cosine"])
    energy_continuity = _energy_continuity(boundary["start_energy"], boundary["end_energy"])
    duration_fit = _duration_fit(duration_seconds, target_seconds)
    beat_alignment = (
        _nearest_grid_alignment(features.beat_times, window.start_seconds, beat_period / 2.0)
        + _nearest_grid_alignment(features.beat_times, window.end_seconds, beat_period / 2.0)
    ) / 2.0
    bar_alignment = (
        _nearest_grid_alignment(features.bar_times, window.start_seconds, bar_period / 2.0)
        + _nearest_grid_alignment(features.bar_times, window.end_seconds, bar_period / 2.0)
    ) / 2.0
    phrase_alignment = 100.0 if window.bars % max(features.phrase_length_bars, 1) == 0 else 65.0
    click_risk_penalty = _click_risk_penalty(
        samples=samples,
        sample_rate=features.metadata.analysis_sample_rate,
        start=window.start_seconds,
        end=window.end_seconds,
    )

    loudness_continuity = energy_continuity
    timbre_continuity = spectral_continuity
    editorial_usability = round((duration_fit * 0.55) + (phrase_alignment * 0.45), 2)

    return CandidateBreakdown(
        beat_alignment=round(beat_alignment, 2),
        bar_alignment=round(bar_alignment, 2),
        phrase_alignment=round(phrase_alignment, 2),
        timbre_continuity=timbre_continuity,
        spectral_continuity=spectral_continuity,
        energy_continuity=energy_continuity,
        loudness_continuity=loudness_continuity,
        click_risk_penalty=click_risk_penalty,
        target_duration_usefulness=duration_fit,
        editorial_usability=editorial_usability,
        ai_rerank_confidence=0.0,
    )
