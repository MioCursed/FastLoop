from __future__ import annotations

import json
import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
ENGINE_ROOT = CURRENT_DIR.parent
if str(ENGINE_ROOT) not in sys.path:
    sys.path.insert(0, str(ENGINE_ROOT))
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from fastloop_engine.models import AnalysisRequest
from fastloop_engine.pipeline import run_analysis
from fastloop_engine.serialize import analysis_result_to_contract

from fixture_builder import create_loop_fixture


def main() -> None:
    fixture_path = create_loop_fixture(CURRENT_DIR / "generated" / "loop_fixture.wav")
    result = run_analysis(
        AnalysisRequest(
            track_id="fixture-track",
            source_path=str(fixture_path),
            duration_target_seconds=8.0,
            scoring_mode="transparent",
        )
    )
    payload = analysis_result_to_contract(result, "transparent")

    assert payload["sampleRate"] == 44100
    assert payload["durationSeconds"] > 10.0
    assert len(payload["waveformPeaks"]) == 512
    assert 110.0 <= payload["bpm"] <= 130.0
    assert len(payload["beatTimes"]) >= 16
    assert len(payload["barTimes"]) >= 4
    assert len(payload["candidates"]) >= 3

    best = payload["candidates"][0]
    assert best["endSeconds"] > best["startSeconds"]
    assert 0.0 <= best["compositeScore"] <= 100.0
    assert 0.0 <= best["baseDeterministicScore"] <= 100.0
    assert best["rerankDelta"] == 0.0
    assert payload["rerankEnabled"] is False
    assert payload["targetDurationSeconds"] == 8.0
    assert "breakdown" in best
    assert {"beatAlignment", "barAlignment", "spectralContinuity", "energyContinuity", "clickRiskPenalty", "targetDurationUsefulness"} <= set(best["breakdown"].keys())

    report = {
        "fixture": str(fixture_path),
        "waveformPoints": len(payload["waveformPeaks"]),
        "bpm": payload["bpm"],
        "barCount": payload["bars"],
        "candidateCount": len(payload["candidates"]),
        "topCandidate": {
            "startSeconds": best["startSeconds"],
            "endSeconds": best["endSeconds"],
            "durationSeconds": best["durationSeconds"],
            "score": best["compositeScore"],
            "breakdown": best["breakdown"],
        },
        "warnings": payload["warnings"],
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
