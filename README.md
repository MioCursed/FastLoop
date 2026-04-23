# FastLoop

FastLoop is a CEP-based Adobe extension for Premiere Pro and After Effects focused on loop discovery, seamless preview, music bed building, export packaging, and editor-oriented host commit workflows.

The interface is intentionally built as a dense desktop utility with waveform-first analysis, compact controls, and practical action grouping inspired by the workflow feel of Shutter Encoder, rebuilt clean-room style for loop work.

## Download

End users should install FastLoop from GitHub Releases:

- Recommended: `FastLoop-Windows-x64-Setup.exe`
- Alternative: `FastLoop-Windows-x64.zip`

GitHub Releases:

- https://github.com/MioCursed/FastLoop/releases

The Windows x64 installer is the primary download. The zip package is the secondary portable fallback.

## Current Status

The repository already includes a working release-first prerelease foundation:

- deterministic Python analysis engine with waveform extraction, BPM/beat/bar/phrase heuristics, candidate generation, and transparent score breakdowns
- duration-aware ranking and lightweight secondary reranking
- CEP panel integration for analyze -> inspect -> select candidate
- real seamless preview rendering and local export execution
- file picker and export destination selection inside the panel
- Premiere Pro and After Effects host payload flow for markers, commit, and initial rendered-asset handoff
- packaged Windows engine runtime so end users do not need a manual Python install for the standard release path
- release assets structured for GitHub Releases with a primary installer and secondary portable zip
- visual installer-panel path, install verification, install logs, and host-readiness diagnostics for CEP visibility issues

## Installation

Use [INSTALL.md](./INSTALL.md) for the full release-oriented install guide.

Short version:

1. Open the GitHub Releases page.
2. Download `FastLoop-Windows-x64-Setup.exe`.
3. Run the installer.
4. Open Premiere Pro or After Effects.
5. Check `Window > Extensions (Legacy) > FastLoop` on newer Adobe builds, or `Window > Extensions > FastLoop` on older builds.
6. Use the panel.

If you prefer not to run the installer, download `FastLoop-Windows-x64.zip`, extract it, and run the included install helper.

## Included In Release Assets

- CEP extension bundle for Premiere Pro and After Effects
- packaged Windows engine runtime
- install helper scripts for portable installs
- host-readiness helper for CEP visibility diagnostics
- release notes, checksums, and release manifest output
- install logs and verification summaries for troubleshooting prerelease install/load issues

## Developer Setup

Developer setup is secondary to the GitHub Releases install path.

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
npm run cep:validate
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
npm run smoke:install
npm run docs:validate
npm run release:build
npm run release:validate
```

## Workspace Layout

- `docs/`: ordered product, design, legal, architecture, analysis, and roadmap deliverables
- `panel/`: CEP panel UI in TypeScript, HTML, and CSS
- `host-premiere/`: Premiere Pro host bridge and import/commit helpers
- `host-aftereffects/`: After Effects host bridge and import/commit helpers
- `engine/`: deterministic analysis, preview, export, and packaged runtime entrypoints
- `shared/`: shared TypeScript contracts, scoring helpers, and presets
- `mock/`: standalone mock-mode runtime for panel development
- `release/`: release templates, signing notes, checklist, troubleshooting, and versioned distribution output
- `.github/workflows/`: GitHub Releases automation
- `scripts/`: smoke validations, release scripts, and documentation checks

## Notes

- CEP remains the MVP runtime path.
- The deterministic DSP pipeline remains the primary ranking foundation.
- The rerank layer is intentionally lightweight and local; it does not replace deterministic scoring.
- GitHub Releases is the main end-user installation channel.
- Current assets are installer-ready and release-ready, but still unsigned prerelease assets until signing is added.
- The unsigned prerelease install path prepares `PlayerDebugMode` for CEP 11 and CEP 12 under the current user profile.
- If FastLoop installs but does not appear, use the packaged host-readiness helper and follow `release/TROUBLESHOOTING.md`.
