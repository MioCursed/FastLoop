# FastLoop Engine

Python-first analysis engine for FastLoop.

## Local Setup

From the `engine/` directory:

```bash
python -m pip install -e .
```

## Smoke Entry Point

After installation:

```bash
python -m fastloop_engine.cli path/to/audio.wav --track-id demo-track
```

The current CLI is a scaffold and is used in Block 1 to validate import and execution readiness.
