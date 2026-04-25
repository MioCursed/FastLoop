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
The setup executable is an Inno Setup wizard with language selection, welcome/about, license, destination/options, additional tasks, ready, progress, and completion pages.

## Current Status

The repository already includes a working release-first prerelease foundation:

- deterministic Python analysis engine with waveform extraction, BPM/beat/bar/phrase heuristics, candidate generation, and transparent score breakdowns
- duration-aware ranking and lightweight secondary reranking
- CEP panel integration for analyze -> inspect -> select candidate
- real seamless preview rendering and local export execution
- file picker and export destination selection inside the panel
- Premiere Pro and After Effects host payload flow for markers, commit, and initial rendered-asset handoff
- packaged Windows engine runtime so end users do not need a manual Python install for the standard release path
- release assets structured for GitHub Releases with a primary Inno Setup wizard and secondary portable zip
- install verification, install logs, and host-readiness diagnostics for CEP visibility issues

## Installation

Use [INSTALL.md](./INSTALL.md) for the full release-oriented install guide.

Short version:

1. Open the GitHub Releases page.
2. Download `FastLoop-Windows-x64-Setup.exe`.
3. Run the setup wizard and keep the default CurrentUser CEP install unless you need AllUsers.
4. Open Premiere Pro or After Effects.
5. Check `Window > Extensions (Legacy) > FastLoop` on newer Adobe builds, or `Window > Extensions > FastLoop` on older builds.
6. Use the panel.

If you prefer not to run the installer, download `FastLoop-Windows-x64.zip`, extract it, and run the included install helper.

See [docs/21-windows-installer-wizard.md](./docs/21-windows-installer-wizard.md) for the wizard page flow and option details.

## Included In Release Assets

- CEP extension bundle for Premiere Pro and After Effects
- packaged Windows engine runtime
- install helper scripts for portable installs
- host-readiness helper for CEP visibility diagnostics
- release notes, checksums, and release manifest output
- install logs and verification summaries for troubleshooting prerelease install/load issues

## CEP Visibility Investigation

FastLoop is still in prerelease, and CEP visibility inside Premiere Pro / After Effects is the highest-priority validation area.

A comparison against a working Premiere extension package, PP Organizer, highlighted three important compatibility checks that FastLoop must preserve before each new release:

1. CEP resource paths should resolve from the extension bundle root and stay inside the bundle.
2. Host-side JSX adapter paths should not escape the FastLoop bundle.
3. Unsigned CEP readiness should cover modern Adobe CEP generations, including CSXS 11, CSXS 12, and CSXS 13.

If FastLoop installs but does not appear in Premiere Pro or After Effects:

1. Restart the Adobe host completely.
2. Check both menu paths:
   - `Window > Extensions (Legacy) > FastLoop`
   - `Window > Extensions > FastLoop`
3. Run the packaged host-readiness helper:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Test-FastLoop-HostReadiness.ps1
```

4. Inspect CEP logs under `%LOCALAPPDATA%\Temp` if the helper reports ready but the panel is still hidden.
5. Check for stale or duplicate FastLoop bundles across CurrentUser and AllUsers CEP roots.

Current known engineering focus:

- validate `MainPath` and `ScriptPath` against working CEP extension patterns
- validate host adapter paths from `host-index.jsx`
- keep the shared CEP bundle model for `PPRO` and `AEFT`
- avoid splitting Premiere Pro and After Effects into separate bundles unless a real CEP blocker proves it necessary

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
- The unsigned prerelease install path prepares `PlayerDebugMode` for CEP 11, CEP 12, and CEP 13 under the current user profile.
- If FastLoop installs but does not appear, use the packaged host-readiness helper and follow `release/TROUBLESHOOTING.md`.
