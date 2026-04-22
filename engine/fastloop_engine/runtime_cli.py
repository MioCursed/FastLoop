from __future__ import annotations

import argparse
import json

from fastloop_engine.models import AnalysisRequest
from fastloop_engine.pipeline import run_analysis
from fastloop_engine.render import (
    ExportRenderRequest,
    PreviewRenderRequest,
    candidate_from_contract,
    export_candidate,
    preview_candidate,
)
from fastloop_engine.scoring import resolve_scoring_mode
from fastloop_engine.serialize import analysis_result_to_contract


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="FastLoop packaged runtime CLI.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    analyze_parser = subparsers.add_parser("analyze")
    analyze_parser.add_argument("source_path")
    analyze_parser.add_argument("--track-id", required=True)
    analyze_parser.add_argument("--duration-target", type=float, default=30.0)
    analyze_parser.add_argument("--scoring-mode", default="smart")

    preview_parser = subparsers.add_parser("preview")
    preview_parser.add_argument("source_path")
    preview_parser.add_argument("--track-id", required=True)
    preview_parser.add_argument("--candidate-json", required=True)
    preview_parser.add_argument("--preview-mode", default="repeat")

    export_parser = subparsers.add_parser("export")
    export_parser.add_argument("source_path")
    export_parser.add_argument("--track-id", required=True)
    export_parser.add_argument("--candidate-json", required=True)
    export_parser.add_argument("--duration-target", type=float, default=0.0)
    export_parser.add_argument("--scoring-mode", default="smart")
    export_parser.add_argument("--warnings-json", default="[]")
    export_parser.add_argument("--output-dir")
    return parser


def main() -> None:
    args = build_parser().parse_args()

    if args.command == "analyze":
        scoring_mode = resolve_scoring_mode(args.scoring_mode)
        result = run_analysis(
            AnalysisRequest(
                track_id=args.track_id,
                source_path=args.source_path,
                duration_target_seconds=args.duration_target,
                scoring_mode=scoring_mode,
            )
        )
        print(json.dumps(analysis_result_to_contract(result, scoring_mode), indent=2))
        return

    candidate = candidate_from_contract(json.loads(args.candidate_json))
    if args.command == "preview":
        result = preview_candidate(
            PreviewRenderRequest(
                track_id=args.track_id,
                source_path=args.source_path,
                candidate=candidate,
                preview_mode=args.preview_mode,
            )
        )
    else:
        result = export_candidate(
            ExportRenderRequest(
                track_id=args.track_id,
                source_path=args.source_path,
                candidate=candidate,
                duration_target_seconds=args.duration_target,
                scoring_mode=resolve_scoring_mode(args.scoring_mode),
                warnings=list(json.loads(args.warnings_json)),
                output_directory=args.output_dir,
            )
        )

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
