from __future__ import annotations

from dataclasses import asdict
from typing import Any

from .models import AnalysisResult


def _to_camel_case(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


def _camelize(value: Any) -> Any:
    if isinstance(value, dict):
        return {_to_camel_case(key): _camelize(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_camelize(item) for item in value]
    return value


def analysis_result_to_contract(result: AnalysisResult, scoring_mode: str) -> dict[str, Any]:
    payload = _camelize(asdict(result))
    payload.pop("metadata", None)
    payload.pop("timing", None)
    payload["scoringMode"] = scoring_mode
    payload["trackId"] = result.track_id
    payload["bars"] = result.bars
    payload["phraseLengthBars"] = result.phrase_length_bars
    payload["waveformPeaks"] = result.waveform_peaks
    payload["beatTimes"] = result.timing.beat_times
    payload["barTimes"] = result.timing.bar_times
    payload["phraseTimes"] = result.timing.phrase_times
    payload["sampleRate"] = result.metadata.analysis_sample_rate
    payload["durationSeconds"] = result.metadata.duration_seconds
    payload["warnings"] = result.warnings
    payload["targetDurationSeconds"] = result.target_duration_seconds
    payload["rerankEnabled"] = result.rerank_enabled

    for candidate in payload["candidates"]:
        candidate["id"] = candidate.pop("candidateId")
        candidate["trackId"] = result.track_id
        candidate["durationSeconds"] = round(candidate["endSeconds"] - candidate["startSeconds"], 4)

    return payload
