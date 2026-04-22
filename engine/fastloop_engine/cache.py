from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

from .models import AnalysisResult


def write_analysis_cache(cache_dir: str, result: AnalysisResult) -> Path:
    path = Path(cache_dir)
    path.mkdir(parents=True, exist_ok=True)
    cache_path = path / f"{result.track_id}.json"
    cache_path.write_text(json.dumps(asdict(result), indent=2), encoding="utf-8")
    return cache_path
