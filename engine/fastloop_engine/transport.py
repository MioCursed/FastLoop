from __future__ import annotations

import json

from .models import AnalysisRequest
from .pipeline import run_analysis
from .serialize import analysis_result_to_contract


def handle_analysis_request(raw: str) -> str:
    payload = json.loads(raw)
    result = run_analysis(
        AnalysisRequest(
            track_id=payload.get("trackId", payload.get("track_id")),
            source_path=payload.get("sourcePath", payload.get("source_path")),
            duration_target_seconds=payload.get("durationTargetSeconds", payload.get("duration_target_seconds")),
            scoring_mode=payload.get("scoringMode", payload.get("scoring_mode")),
        )
    )
    scoring_mode = payload.get("scoringMode", payload.get("scoring_mode", "transparent"))
    return json.dumps(analysis_result_to_contract(result, scoring_mode))
