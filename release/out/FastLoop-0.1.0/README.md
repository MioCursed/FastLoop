# FastLoop

FastLoop is a CEP-based Adobe extension for Premiere Pro and After Effects focused on editor-facing music loop discovery, seamless preview, bed building, export packaging, and host-side commit workflows.

The interface is intentionally built as a dense desktop utility with waveform-first analysis, compact controls, and practical action grouping inspired by the workflow feel of Shutter Encoder, rebuilt clean-room style for loop work.

## Current Status

The repository already includes a working user-facing MVP foundation:

- deterministic Python analysis engine with waveform extraction, BPM/beat/bar/phrase heuristics, candidate generation, and transparent score breakdowns
- duration-aware ranking and lightweight secondary reranking
- CEP panel integration for analyze -> inspect -> select candidate
- real seamless preview rendering and local export execution
- file picker and export destination selection inside the panel
- Premiere Pro and After Effects host payload flow for markers, commit, and initial rendered-asset handoff
- mock mode for local UI work without Adobe
- packaged Windows engine runtime so end users do not need a manual Python install for the standard release path

## Install And Use

Use [INSTALL.md](./INSTALL.md) for the full setup guide.

End-user release flow:

```bash
npm run release:build
npm run release:validate
```

That produces a versioned unsigned CEP bundle under `release/out/` with the packaged Windows engine runtime included when built.

## Developer Setup

Requirements:

- Node.js 20+
- Python 3.11+

Install dependencies:

```bash
npm install
python -m pip install -e ./engine
```

Useful commands:

```bash
npm run typecheck
npm run build:shared
npm run build:panel
npm run build:mock
npm run build:engine-runtime
npm run runtime:validate
npm run smoke:render
npm run smoke:panel
npm run smoke:panel:packaged
npm run smoke:mock
npm run smoke:host
npm run docs:validate
```

## Workspace Layout

- `docs/`: ordered product, design, legal, architecture, analysis, and roadmap deliverables
- `panel/`: CEP panel UI in TypeScript, HTML, and CSS
- `host-premiere/`: Premiere Pro host bridge and import/commit helpers
- `host-aftereffects/`: After Effects host bridge and import/commit helpers
- `engine/`: deterministic analysis, preview, export, and packaged runtime entrypoints
- `shared/`: shared TypeScript contracts, scoring helpers, and presets
- `mock/`: standalone mock-mode runtime for panel development
- `release/`: release notes, checklist, and versioned distribution output
- `scripts/`: smoke validations, release scripts, and documentation checks

## Implemented Runtime Flow

1. Choose a source file from the panel file picker.
2. Analyze the track and review ranked loop candidates with score details.
3. Preview a one-cycle or repeating seamless loop locally.
4. Choose an export destination and render intro, loop, outro, extended bed, and metadata JSON.
5. Commit the selected candidate to Premiere Pro or After Effects, with rendered-asset handoff when an exported bed is available.

## Notes

- CEP remains the MVP runtime path.
- The deterministic DSP pipeline remains the primary ranking foundation.
- The rerank layer is intentionally lightweight and local; it does not replace deterministic scoring.
- If no export destination is chosen, FastLoop falls back to `.fastloop-output/`.
- Signing and a true one-click installer are still the next packaging milestone.
