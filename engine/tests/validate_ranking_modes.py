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


def analyze(duration_target: float, scoring_mode: str) -> dict[str, object]:
    fixture_path = create_loop_fixture(CURRENT_DIR / "generated" / "loop_fixture.wav")
    result = run_analysis(
        AnalysisRequest(
            track_id=f"fixture-{duration_target}-{scoring_mode}",
            source_path=str(fixture_path),
            duration_target_seconds=duration_target,
            scoring_mode=scoring_mode,
        )
    )
    return analysis_result_to_contract(result, scoring_mode)


def main() -> None:
    short_target = analyze(8.0, "duration-priority")
    long_target = analyze(30.0, "duration-priority")
    transparent = analyze(8.0, "transparent")
    smart = analyze(8.0, "smart")

    short_top = short_target["candidates"][0]
    long_top = long_target["candidates"][0]
    transparent_top = transparent["candidates"][0]
    smart_top = smart["candidates"][0]

    assert short_target["rerankEnabled"] is True
    assert long_target["rerankEnabled"] is True
    assert transparent["rerankEnabled"] is False
    assert short_top["targetDurationSeconds"] == 8.0
    assert long_top["targetDurationSeconds"] == 30.0
    assert short_top["breakdown"]["targetDurationUsefulness"] >= long_top["breakdown"]["targetDurationUsefulness"] or short_top["durationSeconds"] != long_top["durationSeconds"]
    assert abs(short_top["durationSeconds"] - 8.0) < abs(long_top["durationSeconds"] - 8.0)
    assert abs(long_top["durationSeconds"] - 30.0) <= abs(short_top["durationSeconds"] - 30.0)
    assert smart_top["breakdown"]["aiRerankConfidence"] > 0.0
    assert transparent_top["breakdown"]["aiRerankConfidence"] == 0.0
    assert smart_top["compositeScore"] != smart_top["scoringModeScore"] or smart_top["rerankDelta"] != 0.0

    report = {
        "shortTargetTop": {
            "durationSeconds": short_top["durationSeconds"],
            "compositeScore": short_top["compositeScore"],
            "baseDeterministicScore": short_top["baseDeterministicScore"],
            "scoringModeScore": short_top["scoringModeScore"],
            "rerankDelta": short_top["rerankDelta"],
            "targetDurationUsefulness": short_top["breakdown"]["targetDurationUsefulness"],
        },
        "longTargetTop": {
            "durationSeconds": long_top["durationSeconds"],
            "compositeScore": long_top["compositeScore"],
            "baseDeterministicScore": long_top["baseDeterministicScore"],
            "scoringModeScore": long_top["scoringModeScore"],
            "rerankDelta": long_top["rerankDelta"],
            "targetDurationUsefulness": long_top["breakdown"]["targetDurationUsefulness"],
        },
        "transparentTop": {
            "compositeScore": transparent_top["compositeScore"],
            "rerankDelta": transparent_top["rerankDelta"],
            "aiRerankConfidence": transparent_top["breakdown"]["aiRerankConfidence"],
        },
        "smartTop": {
            "compositeScore": smart_top["compositeScore"],
            "rerankDelta": smart_top["rerankDelta"],
            "aiRerankConfidence": smart_top["breakdown"]["aiRerankConfidence"],
        },
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
