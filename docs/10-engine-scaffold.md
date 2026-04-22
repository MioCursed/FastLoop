# 10. Engine Scaffold

## Language

Python-first, with a future Rust rewrite path isolated behind transport boundaries.

## Scaffold Components

- `engine/fastloop_engine/models.py`: dataclasses for requests and results
- `engine/fastloop_engine/features.py`: DSP feature extraction entrypoints
- `engine/fastloop_engine/scoring.py`: deterministic composite score logic
- `engine/fastloop_engine/rerank.py`: optional AI reranking boundary
- `engine/fastloop_engine/pipeline.py`: orchestration
- `engine/fastloop_engine/cache.py`: artifact persistence
- `engine/fastloop_engine/transport.py`: JSON transport surface
- `engine/fastloop_engine/cli.py`: command-line entrypoint

## Implementation Principle

Keep each scoring component inspectable and testable so editorial trust remains high.

## Reference Influence

- PyMusicLooper: loop/export framing
- Remixatron: similarity ideas
- YAMNet/musicnn: optional embedding stage
