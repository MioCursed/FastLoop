from __future__ import annotations

import argparse
import json

from .cache import write_analysis_cache
from .models import AnalysisRequest
from .pipeline import run_analysis
from .scoring import resolve_scoring_mode
from .serialize import analysis_result_to_contract


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="FastLoop engine CLI scaffold.")
    parser.add_argument("source_path")
    parser.add_argument("--track-id", required=True)
    parser.add_argument("--duration-target", type=float, default=30.0)
    parser.add_argument("--scoring-mode", default="smart")
    parser.add_argument("--write-cache", action="store_true")
    parser.add_argument("--cache-dir", default=".fastloop-cache")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    scoring_mode = resolve_scoring_mode(args.scoring_mode)
    result = run_analysis(
        AnalysisRequest(
            track_id=args.track_id,
            source_path=args.source_path,
            duration_target_seconds=args.duration_target,
            scoring_mode=scoring_mode,
        )
    )
    if args.write_cache:
        write_analysis_cache(args.cache_dir, result)
    print(json.dumps(analysis_result_to_contract(result, scoring_mode), indent=2))


if __name__ == "__main__":
    main()
