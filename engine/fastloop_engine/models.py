from __future__ import annotations

from dataclasses import dataclass, field
from typing import List


@dataclass(slots=True)
class CandidateBreakdown:
    beat_alignment: float
    bar_alignment: float
    phrase_alignment: float
    timbre_continuity: float
    spectral_continuity: float
    energy_continuity: float
    loudness_continuity: float
    click_risk_penalty: float
    target_duration_usefulness: float
    editorial_usability: float
    ai_rerank_confidence: float = 0.0


@dataclass(slots=True)
class AudioMetadata:
    source_path: str
    original_sample_rate: int
    analysis_sample_rate: int
    channel_count: int
    duration_seconds: float


@dataclass(slots=True)
class TimingData:
    beat_times: List[float] = field(default_factory=list)
    bar_times: List[float] = field(default_factory=list)
    phrase_times: List[float] = field(default_factory=list)


@dataclass(slots=True)
class LoopCandidate:
    candidate_id: str
    start_seconds: float
    end_seconds: float
    bars: int
    phrase_multiple: int
    target_duration_seconds: float
    base_deterministic_score: float
    scoring_mode_score: float
    rerank_delta: float
    composite_score: float
    confidence: float
    breakdown: CandidateBreakdown


@dataclass(slots=True)
class AnalysisRequest:
    track_id: str
    source_path: str
    duration_target_seconds: float
    scoring_mode: str


@dataclass(slots=True)
class AnalysisResult:
    track_id: str
    bpm: float
    bars: int
    phrase_length_bars: int
    target_duration_seconds: float
    rerank_enabled: bool
    metadata: AudioMetadata
    timing: TimingData
    candidates: List[LoopCandidate] = field(default_factory=list)
    waveform_peaks: List[float] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
