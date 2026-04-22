from __future__ import annotations

from dataclasses import dataclass, field
import math

import numpy as np
from scipy.signal import find_peaks, resample_poly, stft
import soundfile as sf

from .config import EngineConfig
from .models import AudioMetadata, TimingData


@dataclass(slots=True)
class AnalysisAudio:
    samples: np.ndarray
    metadata: AudioMetadata


@dataclass(slots=True)
class FeatureBundle:
    metadata: AudioMetadata
    waveform_peaks: list[float]
    onset_envelope: np.ndarray
    bpm: float
    beat_frames: np.ndarray
    beat_times: list[float]
    bar_times: list[float]
    phrase_times: list[float]
    phrase_length_bars: int
    beats_per_bar: int
    rms: np.ndarray
    rms_times: np.ndarray
    mel_spectrogram: np.ndarray
    mel_times: np.ndarray
    warnings: list[str] = field(default_factory=list)


HOP_LENGTH = 512
WINDOW_LENGTH = 2048


def load_audio(source_path: str, config: EngineConfig) -> AnalysisAudio:
    info = sf.info(source_path)
    samples, sample_rate = sf.read(source_path, always_2d=True, dtype="float32")
    mono = np.mean(samples, axis=1, dtype=np.float32)

    peak = float(np.max(np.abs(mono))) if mono.size else 0.0
    if peak > 1.0:
        mono = mono / peak

    analysis = mono
    if sample_rate != config.working_sample_rate:
        greatest_common_divisor = math.gcd(sample_rate, config.working_sample_rate)
        up = config.working_sample_rate // greatest_common_divisor
        down = sample_rate // greatest_common_divisor
        analysis = resample_poly(mono, up, down).astype(np.float32)

    metadata = AudioMetadata(
        source_path=source_path,
        original_sample_rate=int(sample_rate),
        analysis_sample_rate=config.working_sample_rate,
        channel_count=int(samples.shape[1]),
        duration_seconds=float(len(mono) / sample_rate) if sample_rate else 0.0,
    )
    return AnalysisAudio(samples=analysis, metadata=metadata)


def build_waveform_peaks(samples: np.ndarray, bins: int) -> list[float]:
    if samples.size == 0 or bins <= 0:
        return []

    edges = np.linspace(0, len(samples), num=bins + 1, dtype=int)
    peaks: list[float] = []
    for start, end in zip(edges[:-1], edges[1:]):
        window = samples[start:end]
        peak = float(np.max(np.abs(window))) if window.size else 0.0
        peaks.append(round(peak, 6))
    return peaks


def _estimate_tempo_from_onset_envelope(onset_envelope: np.ndarray, sample_rate: int) -> float:
    if onset_envelope.size < 4:
        return 120.0

    centered = onset_envelope - float(np.mean(onset_envelope))
    autocorrelation = np.correlate(centered, centered, mode="full")[centered.size - 1 :]
    min_lag = max(1, int(round((60.0 / 180.0) * sample_rate / HOP_LENGTH)))
    max_lag = min(len(autocorrelation) - 1, int(round((60.0 / 70.0) * sample_rate / HOP_LENGTH)))

    if max_lag <= min_lag:
        return 120.0

    search = autocorrelation[min_lag : max_lag + 1]
    if search.size == 0:
        return 120.0

    lag = int(np.argmax(search)) + min_lag
    bpm = 60.0 * sample_rate / (HOP_LENGTH * lag)
    return float(np.clip(bpm, 70.0, 180.0))


def _track_beats(onset_envelope: np.ndarray, bpm: float, sample_rate: int) -> np.ndarray:
    frames_per_beat = max(1, int(round((60.0 / max(bpm, 1e-6)) * sample_rate / HOP_LENGTH)))
    prominence = max(float(np.std(onset_envelope) * 0.35), 0.01)
    peak_indices, _ = find_peaks(
        onset_envelope,
        distance=max(1, int(frames_per_beat * 0.6)),
        prominence=prominence,
    )

    if peak_indices.size == 0:
        return np.arange(0, len(onset_envelope), frames_per_beat, dtype=np.int64)

    beats: list[int] = [int(peak_indices[0])]
    current = int(peak_indices[0] + frames_per_beat)
    tolerance = max(1, int(frames_per_beat * 0.3))

    while current < len(onset_envelope):
        nearby = peak_indices[np.abs(peak_indices - current) <= tolerance]
        if nearby.size:
            strengths = onset_envelope[nearby]
            snapped = int(nearby[int(np.argmax(strengths))])
            if snapped > beats[-1]:
                beats.append(snapped)
                current = snapped + frames_per_beat
                continue
        beats.append(int(current))
        current += frames_per_beat

    return np.asarray(sorted(set(beats)), dtype=np.int64)


def _build_spectral_flux(magnitude: np.ndarray) -> np.ndarray:
    if magnitude.shape[1] < 2:
        return np.zeros(1, dtype=np.float32)
    log_magnitude = np.log1p(magnitude)
    diff = np.diff(log_magnitude, axis=1)
    positive = np.maximum(diff, 0.0)
    return positive.sum(axis=0).astype(np.float32)


def _frame_band_energies(magnitude: np.ndarray, band_count: int = 48) -> np.ndarray:
    log_magnitude = np.log1p(magnitude)
    bands = np.array_split(log_magnitude, band_count, axis=0)
    return np.asarray([band.mean(axis=0) for band in bands], dtype=np.float32)


def _frame_rms(magnitude: np.ndarray) -> np.ndarray:
    return np.sqrt(np.mean(np.square(magnitude), axis=0)).astype(np.float32)


def _estimate_phrase_length_bars(
    beat_frames: np.ndarray,
    rms: np.ndarray,
    config: EngineConfig,
) -> int:
    beats_per_bar = config.beats_per_bar
    if len(beat_frames) < beats_per_bar * 8:
        return 4

    valid_beats = beat_frames[: len(beat_frames) - (len(beat_frames) % beats_per_bar)]
    if valid_beats.size < beats_per_bar * 4:
        return 4

    beat_energy: list[float] = []
    for start, end in zip(valid_beats[:-1], valid_beats[1:]):
        if end <= start:
            continue
        beat_energy.append(float(np.mean(rms[start:end])))

    if len(beat_energy) < beats_per_bar * 4:
        return 4

    usable_count = len(beat_energy) - (len(beat_energy) % beats_per_bar)
    if usable_count < beats_per_bar * 4:
        return 4

    bar_energy = np.asarray(beat_energy[:usable_count], dtype=np.float32).reshape(-1, beats_per_bar).mean(axis=1)
    if len(bar_energy) < 4:
        return 4

    centered = bar_energy - float(np.mean(bar_energy))
    best_lag = 4
    best_corr = -1.0
    for lag in (4, 8, 16):
        if lag >= len(centered):
            continue
        left = centered[:-lag]
        right = centered[lag:]
        denom = float(np.linalg.norm(left) * np.linalg.norm(right))
        corr = float(np.dot(left, right) / denom) if denom else 0.0
        if corr > best_corr:
            best_corr = corr
            best_lag = lag
    return best_lag


def extract_features(source_path: str, config: EngineConfig | None = None) -> FeatureBundle:
    config = config or EngineConfig()
    analysis_audio = load_audio(source_path, config)
    samples = analysis_audio.samples
    sample_rate = analysis_audio.metadata.analysis_sample_rate
    warnings: list[str] = []

    if samples.size == 0:
        raise ValueError("Audio file contains no samples.")

    _, frame_times, stft_matrix = stft(
        samples,
        fs=sample_rate,
        nperseg=WINDOW_LENGTH,
        noverlap=WINDOW_LENGTH - HOP_LENGTH,
        boundary=None,
        padded=False,
    )
    magnitude = np.abs(stft_matrix)
    onset_envelope = _build_spectral_flux(magnitude)
    onset_times = frame_times[1:] if frame_times.size > 1 else frame_times
    bpm = _estimate_tempo_from_onset_envelope(onset_envelope, sample_rate)
    beat_frames = _track_beats(onset_envelope, bpm, sample_rate)

    if beat_frames.size < 8:
        warnings.append("Beat tracker found too few beats; using a regularized fallback grid.")
        if bpm <= 0:
            bpm = 120.0
        seconds_per_beat = 60.0 / bpm
        beat_times_array = np.arange(0.0, analysis_audio.metadata.duration_seconds, seconds_per_beat)
        beat_times = [float(value) for value in beat_times_array.tolist()]
        beat_frames = np.asarray(np.round(beat_times_array * sample_rate / HOP_LENGTH), dtype=np.int64)
    else:
        beat_frames = beat_frames[beat_frames < len(onset_times)]
        beat_times = [float(onset_times[index]) for index in beat_frames.tolist()]

    beats_per_bar = config.beats_per_bar
    bar_times = beat_times[::beats_per_bar]
    if not bar_times:
        warnings.append("No bar markers could be established from detected beats.")

    rms = _frame_rms(magnitude)
    rms_times = frame_times
    mel_spectrogram = _frame_band_energies(magnitude, band_count=48)
    mel_times = frame_times

    phrase_length_bars = _estimate_phrase_length_bars(beat_frames, rms, config)
    phrase_stride = max(1, phrase_length_bars)
    phrase_times = bar_times[::phrase_stride]

    if phrase_length_bars == 4:
        warnings.append("Phrase length uses a heuristic estimate and may require human refinement.")

    waveform_peaks = build_waveform_peaks(samples, config.waveform_points)
    timing = TimingData(
        beat_times=beat_times,
        bar_times=[float(value) for value in bar_times],
        phrase_times=[float(value) for value in phrase_times],
    )

    return FeatureBundle(
        metadata=analysis_audio.metadata,
        waveform_peaks=waveform_peaks,
        onset_envelope=onset_envelope,
        bpm=round(bpm, 2),
        beat_frames=beat_frames,
        beat_times=timing.beat_times,
        bar_times=timing.bar_times,
        phrase_times=timing.phrase_times,
        phrase_length_bars=phrase_length_bars,
        beats_per_bar=beats_per_bar,
        rms=rms,
        rms_times=rms_times,
        mel_spectrogram=mel_spectrogram,
        mel_times=mel_times,
        warnings=warnings,
    )
