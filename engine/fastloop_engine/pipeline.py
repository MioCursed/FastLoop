from __future__ import annotations

from .candidates import generate_candidate_windows
from .config import EngineConfig
from .features import extract_features, load_audio
from .models import AnalysisRequest, AnalysisResult, LoopCandidate, TimingData
from .rerank import rerank_candidates
from .scoring import build_candidate_breakdown, compute_deterministic_score, deterministic_ranking_enabled, resolve_scoring_mode


def run_analysis(request: AnalysisRequest) -> AnalysisResult:
    config = EngineConfig()
    scoring_mode = resolve_scoring_mode(request.scoring_mode)
    rerank_enabled = deterministic_ranking_enabled(scoring_mode)
    audio = load_audio(request.source_path, config)
    features = extract_features(request.source_path, config)
    windows = generate_candidate_windows(features, request.duration_target_seconds, config)

    candidates: list[LoopCandidate] = []
    warnings = list(features.warnings)

    for index, window in enumerate(windows, start=1):
        breakdown = build_candidate_breakdown(
            samples=audio.samples,
            features=features,
            window=window,
            target_seconds=request.duration_target_seconds,
            config=config,
        )
        base_deterministic_score = compute_deterministic_score(breakdown, "transparent")
        scoring_mode_score = compute_deterministic_score(breakdown, scoring_mode)
        candidates.append(
            LoopCandidate(
                candidate_id=f"{request.track_id}-candidate-{index}",
                start_seconds=round(window.start_seconds, 4),
                end_seconds=round(window.end_seconds, 4),
                bars=window.bars,
                phrase_multiple=window.phrase_multiple,
                target_duration_seconds=request.duration_target_seconds,
                base_deterministic_score=base_deterministic_score,
                scoring_mode_score=scoring_mode_score,
                rerank_delta=0.0,
                composite_score=scoring_mode_score,
                confidence=scoring_mode_score,
                breakdown=breakdown,
            )
        )

    candidates.sort(key=lambda candidate: candidate.scoring_mode_score, reverse=True)
    candidates = rerank_candidates(candidates, scoring_mode)
    candidates = candidates[: config.max_candidates]

    if not candidates:
        warnings.append("No beat-aligned candidates satisfied the current duration constraints.")

    return AnalysisResult(
        track_id=request.track_id,
        bpm=features.bpm,
        bars=max(len(features.bar_times) - 1, 0),
        phrase_length_bars=features.phrase_length_bars,
        target_duration_seconds=request.duration_target_seconds,
        rerank_enabled=rerank_enabled,
        metadata=audio.metadata,
        timing=TimingData(
            beat_times=features.beat_times,
            bar_times=features.bar_times,
            phrase_times=features.phrase_times,
        ),
        candidates=candidates,
        waveform_peaks=features.waveform_peaks,
        warnings=warnings,
    )
