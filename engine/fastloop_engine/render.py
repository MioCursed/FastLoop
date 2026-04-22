from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf

from .config import EngineConfig
from .features import load_audio


@dataclass(slots=True)
class RenderCandidate:
    candidate_id: str
    start_seconds: float
    end_seconds: float
    duration_seconds: float
    target_duration_seconds: float
    base_deterministic_score: float
    scoring_mode_score: float
    rerank_delta: float
    composite_score: float


@dataclass(slots=True)
class PreviewRenderRequest:
    track_id: str
    source_path: str
    candidate: RenderCandidate
    preview_mode: str


@dataclass(slots=True)
class ExportRenderRequest:
    track_id: str
    source_path: str
    candidate: RenderCandidate
    duration_target_seconds: float
    scoring_mode: str
    warnings: list[str]
    output_directory: str | None = None


def preview_candidate(request: PreviewRenderRequest, config: EngineConfig | None = None) -> dict[str, Any]:
    config = config or EngineConfig()
    audio = load_audio(request.source_path, config)
    sample_rate = audio.metadata.analysis_sample_rate
    candidate = request.candidate
    loop_segment = _slice_segment(audio.samples, sample_rate, candidate.start_seconds, candidate.end_seconds)

    preview_mode = request.preview_mode if request.preview_mode in {"cycle", "repeat"} else "repeat"
    loop_cycles = 1 if preview_mode == "cycle" else max(2, config.preview_repeat_cycles)
    preview_audio = _assemble_looped_audio(
        loop_segment,
        loop_cycles=loop_cycles,
        crossfade_seconds=config.preview_crossfade_seconds,
        sample_rate=sample_rate,
    )

    output_directory = Path(config.output_directory) / "preview" / request.track_id / candidate.candidate_id
    output_directory.mkdir(parents=True, exist_ok=True)
    preview_file = output_directory / f"{candidate.candidate_id}-{preview_mode}.wav"
    _write_audio(preview_file, preview_audio, sample_rate)

    return {
        "ok": True,
        "message": f"Preview ready for {candidate.candidate_id} ({preview_mode}).",
        "candidateId": candidate.candidate_id,
        "previewMode": preview_mode,
        "loopCycles": loop_cycles,
        "previewFilePath": str(preview_file.resolve()),
    }


def export_candidate(request: ExportRenderRequest, config: EngineConfig | None = None) -> dict[str, Any]:
    config = config or EngineConfig()
    audio = load_audio(request.source_path, config)
    sample_rate = audio.metadata.analysis_sample_rate
    candidate = request.candidate

    intro = _slice_segment(audio.samples, sample_rate, 0.0, candidate.start_seconds)
    loop_segment = _slice_segment(audio.samples, sample_rate, candidate.start_seconds, candidate.end_seconds)
    outro = _slice_segment(audio.samples, sample_rate, candidate.end_seconds, audio.metadata.duration_seconds)

    loop_cycles = _choose_loop_cycles(
        intro_samples=len(intro),
        loop_samples=len(loop_segment),
        outro_samples=len(outro),
        sample_rate=sample_rate,
        duration_target_seconds=request.duration_target_seconds,
    )

    extended_mix = np.concatenate(
        [
            intro,
            _assemble_looped_audio(
                loop_segment,
                loop_cycles=loop_cycles,
                crossfade_seconds=config.preview_crossfade_seconds,
                sample_rate=sample_rate,
            ),
            outro,
        ]
    ).astype(np.float32)

    base_output_directory = Path(request.output_directory) if request.output_directory else Path(config.output_directory)
    output_directory = base_output_directory / "exports" / request.track_id / candidate.candidate_id
    output_directory.mkdir(parents=True, exist_ok=True)

    intro_path = output_directory / f"{candidate.candidate_id}.intro.wav"
    loop_path = output_directory / f"{candidate.candidate_id}.loop.wav"
    outro_path = output_directory / f"{candidate.candidate_id}.outro.wav"
    extended_path = output_directory / f"{candidate.candidate_id}.extended.wav"
    metadata_path = output_directory / f"{candidate.candidate_id}.metadata.json"

    _write_audio(intro_path, intro, sample_rate)
    _write_audio(loop_path, loop_segment, sample_rate)
    _write_audio(outro_path, outro, sample_rate)
    _write_audio(extended_path, extended_mix, sample_rate)

    metadata = {
        "version": "1.0.0",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "trackId": request.track_id,
        "sourcePath": str(Path(request.source_path).resolve()),
        "candidateId": candidate.candidate_id,
        "candidateStartSeconds": round(candidate.start_seconds, 4),
        "candidateEndSeconds": round(candidate.end_seconds, 4),
        "candidateDurationSeconds": round(candidate.duration_seconds, 4),
        "durationTargetSeconds": request.duration_target_seconds,
        "scoringMode": request.scoring_mode,
        "baseDeterministicScore": candidate.base_deterministic_score,
        "scoringModeScore": candidate.scoring_mode_score,
        "rerankDelta": candidate.rerank_delta,
        "compositeScore": candidate.composite_score,
        "warnings": request.warnings,
        "exportedFiles": {
            "introPath": str(intro_path.resolve()),
            "loopPath": str(loop_path.resolve()),
            "outroPath": str(outro_path.resolve()),
            "extendedMixPath": str(extended_path.resolve()),
            "metadataPath": str(metadata_path.resolve()),
        },
    }
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf8")

    return {
        "ok": True,
        "message": f"Export complete for {candidate.candidate_id}.",
        "outputDirectory": str(output_directory.resolve()),
        "artifacts": metadata["exportedFiles"],
        "metadata": metadata,
    }


def candidate_from_contract(raw_candidate: dict[str, Any]) -> RenderCandidate:
    return RenderCandidate(
        candidate_id=str(raw_candidate["id"]),
        start_seconds=float(raw_candidate["startSeconds"]),
        end_seconds=float(raw_candidate["endSeconds"]),
        duration_seconds=float(raw_candidate.get("durationSeconds", raw_candidate["endSeconds"] - raw_candidate["startSeconds"])),
        target_duration_seconds=float(raw_candidate.get("targetDurationSeconds", 0.0)),
        base_deterministic_score=float(raw_candidate.get("baseDeterministicScore", 0.0)),
        scoring_mode_score=float(raw_candidate.get("scoringModeScore", raw_candidate.get("compositeScore", 0.0))),
        rerank_delta=float(raw_candidate.get("rerankDelta", 0.0)),
        composite_score=float(raw_candidate.get("compositeScore", 0.0)),
    )


def _slice_segment(samples: np.ndarray, sample_rate: int, start_seconds: float, end_seconds: float) -> np.ndarray:
    if samples.size == 0:
        return np.zeros(0, dtype=np.float32)

    start_index = int(np.clip(round(start_seconds * sample_rate), 0, len(samples)))
    end_index = int(np.clip(round(end_seconds * sample_rate), start_index, len(samples)))
    return samples[start_index:end_index].astype(np.float32, copy=True)


def _assemble_looped_audio(
    loop_segment: np.ndarray,
    loop_cycles: int,
    crossfade_seconds: float,
    sample_rate: int,
) -> np.ndarray:
    if loop_segment.size == 0:
        return np.zeros(0, dtype=np.float32)

    assembled = loop_segment.astype(np.float32, copy=True)
    fade_samples = min(int(round(crossfade_seconds * sample_rate)), max(0, len(loop_segment) // 4))

    for _ in range(1, max(1, loop_cycles)):
        assembled = _crossfade_append(assembled, loop_segment, fade_samples)

    return assembled.astype(np.float32)


def _crossfade_append(left: np.ndarray, right: np.ndarray, fade_samples: int) -> np.ndarray:
    if fade_samples <= 0 or left.size == 0 or right.size == 0:
        return np.concatenate([left, right]).astype(np.float32)

    overlap = min(fade_samples, len(left), len(right))
    fade_out = np.linspace(1.0, 0.0, num=overlap, endpoint=False, dtype=np.float32)
    fade_in = np.linspace(0.0, 1.0, num=overlap, endpoint=False, dtype=np.float32)
    blended = (left[-overlap:] * fade_out) + (right[:overlap] * fade_in)
    return np.concatenate([left[:-overlap], blended, right[overlap:]]).astype(np.float32)


def _choose_loop_cycles(
    intro_samples: int,
    loop_samples: int,
    outro_samples: int,
    sample_rate: int,
    duration_target_seconds: float,
) -> int:
    if loop_samples <= 0 or sample_rate <= 0:
        return 1

    if duration_target_seconds <= 0:
        return 2

    intro_seconds = intro_samples / sample_rate
    loop_seconds = loop_samples / sample_rate
    outro_seconds = outro_samples / sample_rate
    remaining = max(loop_seconds, duration_target_seconds - intro_seconds - outro_seconds)

    floor_cycles = max(1, int(np.floor(remaining / loop_seconds)))
    ceil_cycles = max(1, int(np.ceil(remaining / loop_seconds)))

    def total_duration(cycles: int) -> float:
        return intro_seconds + (cycles * loop_seconds) + outro_seconds

    floor_error = abs(total_duration(floor_cycles) - duration_target_seconds)
    ceil_error = abs(total_duration(ceil_cycles) - duration_target_seconds)
    return ceil_cycles if ceil_error < floor_error else floor_cycles


def _write_audio(path: Path, samples: np.ndarray, sample_rate: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(path, samples.astype(np.float32), sample_rate)
