from __future__ import annotations

import argparse
import json

from .config import EngineConfig
from .render import (
    ExportRenderRequest,
    PreviewRenderRequest,
    candidate_from_contract,
    export_candidate,
    preview_candidate,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="FastLoop preview/export renderer.")
    subparsers = parser.add_subparsers(dest="command", required=True)

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
    return parser


def main() -> None:
    args = build_parser().parse_args()
    config = EngineConfig()
    candidate = candidate_from_contract(json.loads(args.candidate_json))

    if args.command == "preview":
      result = preview_candidate(
          PreviewRenderRequest(
              track_id=args.track_id,
              source_path=args.source_path,
              candidate=candidate,
              preview_mode=args.preview_mode,
          ),
          config=config,
      )
    else:
      result = export_candidate(
          ExportRenderRequest(
              track_id=args.track_id,
              source_path=args.source_path,
              candidate=candidate,
              duration_target_seconds=args.duration_target,
              scoring_mode=args.scoring_mode,
              warnings=list(json.loads(args.warnings_json)),
          ),
          config=config,
      )

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
