from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .config import EngineConfig
from .features import FeatureBundle


@dataclass(slots=True)
class CandidateWindow:
    start_seconds: float
    end_seconds: float
    bars: int
    phrase_multiple: int


def generate_candidate_windows(
    features: FeatureBundle,
    duration_target_seconds: float,
    config: EngineConfig | None = None,
) -> list[CandidateWindow]:
    config = config or EngineConfig()
    bar_times = features.bar_times
    if len(bar_times) < 3:
        return []

    beat_period = 60.0 / max(features.bpm, 1e-6)
    bar_period = beat_period * max(features.beats_per_bar, 1)
    candidate_bar_lengths = _candidate_bar_lengths(
        duration_target_seconds=duration_target_seconds,
        phrase_length_bars=max(features.phrase_length_bars, 1),
        bar_period=bar_period,
        config=config,
    )
    windows: list[CandidateWindow] = []
    duration_limit = max(config.min_loop_seconds, duration_target_seconds * 2.0) if duration_target_seconds > 0 else config.max_loop_seconds
    max_duration_seconds = min(config.max_loop_seconds, max(duration_limit, config.min_loop_seconds))

    for start_index, start_time in enumerate(bar_times[:-1]):
        for bar_count in candidate_bar_lengths:
            end_index = start_index + bar_count
            if end_index >= len(bar_times):
                continue

            end_time = bar_times[end_index]
            duration = end_time - start_time
            if duration < config.min_loop_seconds or duration > max_duration_seconds:
                continue

            phrase_multiple = max(1, round(bar_count / max(1, features.phrase_length_bars)))
            windows.append(
                CandidateWindow(
                    start_seconds=float(start_time),
                    end_seconds=float(end_time),
                    bars=bar_count,
                    phrase_multiple=phrase_multiple,
                )
            )

    windows.sort(
        key=lambda window: (
            abs((window.end_seconds - window.start_seconds) - duration_target_seconds),
            -window.bars,
            window.start_seconds,
        )
    )

    unique_windows: list[CandidateWindow] = []
    seen: set[tuple[int, int]] = set()
    for window in windows:
        key = (round(window.start_seconds * 1000), round(window.end_seconds * 1000))
        if key in seen:
            continue
        seen.add(key)
        unique_windows.append(window)
        if len(unique_windows) >= config.max_candidates * 3:
            break
    return unique_windows


def _candidate_bar_lengths(
    duration_target_seconds: float,
    phrase_length_bars: int,
    bar_period: float,
    config: EngineConfig,
) -> tuple[int, ...]:
    base_lengths = {2, 4, 6, 8, 12, 16}
    max_bars = max(2, int(np.floor(config.max_loop_seconds / max(bar_period, 1e-6))))

    for multiple in range(1, 7):
        base_lengths.add(max(2, phrase_length_bars * multiple))

    if duration_target_seconds > 0:
        target_bars = max(2, int(round(duration_target_seconds / max(bar_period, 1e-6))))
        for offset in (-phrase_length_bars, -2, 0, 2, phrase_length_bars):
            base_lengths.add(max(2, target_bars + offset))

    filtered = sorted(
        {
            bar_count
            for bar_count in base_lengths
            if 2 <= bar_count <= max_bars and (bar_count % 2 == 0 or bar_count == phrase_length_bars)
        }
    )
    return tuple(filtered)


def _mean_in_time_range(series: np.ndarray, times: np.ndarray, start: float, end: float) -> float:
    mask = (times >= start) & (times < end)
    if not np.any(mask):
        return float(np.mean(series))
    return float(np.mean(series[mask]))


def _mean_vector_in_time_range(matrix: np.ndarray, times: np.ndarray, start: float, end: float) -> np.ndarray:
    mask = (times >= start) & (times < end)
    if not np.any(mask):
        return matrix.mean(axis=1)
    return matrix[:, mask].mean(axis=1)


def summarize_boundary_context(
    features: FeatureBundle,
    window: CandidateWindow,
    config: EngineConfig | None = None,
) -> dict[str, float]:
    config = config or EngineConfig()
    span = config.boundary_window_seconds
    start_left = max(0.0, window.start_seconds - span / 2.0)
    start_right = min(features.metadata.duration_seconds, window.start_seconds + span / 2.0)
    end_left = max(0.0, window.end_seconds - span / 2.0)
    end_right = min(features.metadata.duration_seconds, window.end_seconds + span / 2.0)

    start_energy = _mean_in_time_range(features.rms, features.rms_times, start_left, start_right)
    end_energy = _mean_in_time_range(features.rms, features.rms_times, end_left, end_right)

    start_spectrum = _mean_vector_in_time_range(features.mel_spectrogram, features.mel_times, start_left, start_right)
    end_spectrum = _mean_vector_in_time_range(features.mel_spectrogram, features.mel_times, end_left, end_right)

    return {
        "start_energy": start_energy,
        "end_energy": end_energy,
        "start_spectrum_norm": float(np.linalg.norm(start_spectrum)),
        "end_spectrum_norm": float(np.linalg.norm(end_spectrum)),
        "spectral_cosine": _cosine_similarity(start_spectrum, end_spectrum),
    }


def _cosine_similarity(left: np.ndarray, right: np.ndarray) -> float:
    denominator = float(np.linalg.norm(left) * np.linalg.norm(right))
    if not denominator:
        return 0.0
    return float(np.dot(left, right) / denominator)
