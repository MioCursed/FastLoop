# FastLoop

FastLoop is a CEP-based Adobe extension project for Premiere Pro and After Effects focused on music loop finding, seamless preview, music bed building, export packaging, and host-side loop commit workflows for editors.

The product is intentionally shaped as a dense desktop utility with waveform-first analysis, compact control grouping, and practical execution-oriented actions inspired by the workflow feel of Shutter Encoder, rebuilt clean-room style for loop analysis.

## Current Status

The repository already includes a working MVP foundation:

- deterministic Python analysis engine with waveform extraction, BPM/beat/bar/phrase heuristics, candidate generation, and transparent score breakdowns
- duration-aware ranking and lightweight secondary reranking
- CEP panel integration for analyze -> inspect -> select candidate
- mock mode for local UI work without Adobe
- Premiere and After Effects host payload flow for markers and candidate commit
- real local preview rendering for selected candidates
- real local export execution for intro, loop, outro, extended bed, and metadata JSON

## Workspace Layout

- `docs/`: ordered product, design, legal, architecture, analysis, and roadmap deliverables
- `panel/`: CEP panel UI in TypeScript, HTML, and CSS
- `host-premiere/`: Premiere Pro host bridge and commit helpers
- `host-aftereffects/`: After Effects host bridge and comp commit helpers
- `engine/`: Python-first deterministic analysis, preview, and export engine
- `shared/`: shared TypeScript contracts, scoring helpers, and presets
- `mock/`: standalone mock-mode runtime for panel development
- `scripts/`: smoke validations for panel, host payloads, shared contracts, and mock flow

## Local Setup

Requirements:

- Node.js 20+
- Python 3.11+

Install JavaScript dependencies:

```bash
npm install
```

Install engine dependencies:

```bash
python -m pip install -e ./engine
```

## Development Commands

Typecheck everything:

```bash
npm run typecheck
```

Build shared, panel, and mock workspaces:

```bash
npm run build:shared
npm run build:panel
npm run build:mock
```

Run panel or mock dev servers:

```bash
npm run dev:panel
npm run dev:mock
```

Run engine validation:

```bash
python engine/tests/validate_engine.py
python engine/tests/validate_ranking_modes.py
python engine/tests/validate_render_actions.py
```

Run smoke checks:

```bash
npm run smoke:shared
npm run smoke:render
npm run smoke:panel
npm run smoke:mock
npm run smoke:host
```

## Implemented Runtime Flow

1. Analyze a track from the panel.
2. Review ranked loop candidates with transparent score details.
3. Preview the selected loop as a single cycle or repeated seamless loop.
4. Export intro, loop, outro, extended bed, and metadata JSON.
5. Commit the selected candidate to Premiere Pro or After Effects through host-side marker actions.

## Notes

- CEP remains the MVP runtime path.
- The deterministic DSP pipeline remains the primary ranking foundation.
- The rerank layer is intentionally lightweight and local; it does not replace deterministic scoring.
- Generated preview/export artifacts are written under `.fastloop-output/`, which is ignored by Git.
