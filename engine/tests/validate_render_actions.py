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

from fastloop_engine.config import EngineConfig
from fastloop_engine.models import AnalysisRequest
from fastloop_engine.pipeline import run_analysis
from fastloop_engine.render import ExportRenderRequest, PreviewRenderRequest, candidate_from_contract, export_candidate, preview_candidate
from fastloop_engine.serialize import analysis_result_to_contract

from fixture_builder import create_loop_fixture


def main() -> None:
    fixture_path = create_loop_fixture(CURRENT_DIR / "generated" / "loop_fixture.wav")
    analysis = run_analysis(
        AnalysisRequest(
            track_id="fixture-render",
            source_path=str(fixture_path),
            duration_target_seconds=30.0,
            scoring_mode="duration-priority",
        )
    )
    payload = analysis_result_to_contract(analysis, "duration-priority")
    candidate = candidate_from_contract(payload["candidates"][0])

    output_root = ENGINE_ROOT.parent / ".fastloop-output" / "validation-render"
    config = EngineConfig(output_directory=str(output_root))

    preview = preview_candidate(
        PreviewRenderRequest(
            track_id=payload["trackId"],
            source_path=str(fixture_path),
            candidate=candidate,
            preview_mode="repeat",
        ),
        config=config,
    )
    export = export_candidate(
        ExportRenderRequest(
            track_id=payload["trackId"],
            source_path=str(fixture_path),
            candidate=candidate,
            duration_target_seconds=payload["targetDurationSeconds"],
            scoring_mode=payload["scoringMode"],
            warnings=payload["warnings"],
        ),
        config=config,
    )

    preview_path = Path(preview["previewFilePath"])
    metadata_path = Path(export["artifacts"]["metadataPath"])
    extended_path = Path(export["artifacts"]["extendedMixPath"])

    assert preview["ok"] is True
    assert preview["previewMode"] == "repeat"
    assert preview_path.exists()
    assert preview_path.stat().st_size > 0

    assert export["ok"] is True
    assert metadata_path.exists()
    assert extended_path.exists()
    assert extended_path.stat().st_size > 0

    metadata = json.loads(metadata_path.read_text(encoding="utf8"))
    assert metadata["candidateId"] == candidate.candidate_id
    assert metadata["durationTargetSeconds"] == payload["targetDurationSeconds"]
    assert metadata["exportedFiles"]["metadataPath"] == str(metadata_path.resolve())
    assert metadata["baseDeterministicScore"] == payload["candidates"][0]["baseDeterministicScore"]

    report = {
        "preview": preview,
        "exportArtifacts": export["artifacts"],
        "metadataCandidate": metadata["candidateId"],
        "metadataScoringMode": metadata["scoringMode"],
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
