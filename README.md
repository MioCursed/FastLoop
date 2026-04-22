# FastLoop

FastLoop is a CEP-based Adobe extension project for Premiere Pro and After Effects focused on loop finding, seamless preview, music bed building, and marker/export workflows for editors.

The project is intentionally designed as a dense desktop utility with clear batch-oriented workflows, compact controls, and strong waveform-centric analysis inspired by the structure and interaction philosophy of Shutter Encoder, while being rebuilt clean-room style for loop analysis.

## Workspace Layout

- `docs/`: ordered product, design, legal, architecture, analysis, and roadmap deliverables
- `panel/`: shared CEP panel UI in TypeScript, HTML, and CSS
- `host-premiere/`: Premiere Pro host bridge and marker helpers
- `host-aftereffects/`: After Effects host bridge and comp marker helpers
- `engine/`: local Python-first analysis engine scaffold
- `shared/`: shared TypeScript contracts, schemas, and preset definitions
- `mock/`: standalone mock-mode runtime for UI development without Adobe

## Development Intent

This scaffold is production-oriented in structure:

- strong separation between UI, host bridge, and analysis engine
- typed IPC contracts between panel and adapters
- deterministic-first DSP pipeline with optional AI reranking
- explicit CEP manifest and host script boundaries
- cache-ready analysis model and export planning types

## Next Step

Install dependencies, wire the build scripts, and implement the engine internals against real DSP libraries such as `librosa`, `numpy`, `soundfile`, and `ffmpeg`.
