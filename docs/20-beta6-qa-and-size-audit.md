# Beta.6 QA And Size Audit

FastLoop 0.1.1-beta.7 remains a CEP-based, Windows x64, release-first extension with one shared bundle for Premiere Pro and After Effects. This QA pass verifies the beta.6 Shutter-inspired utility redesign without changing the engine, host contracts, or CEP manifest load path.

## Version And Repository State

- Package version: `0.1.1-beta.7`
- CEP manifest version: `0.1.1.7`
- Package alignment: root, panel, shared, mock, package-lock, and manifest are aligned.
- Release status: beta.7 is local until the QA cleanup and generated-artifact removals are committed.

## Functional QA

Automated smoke coverage verifies the core post-redesign flows:

- choose audio file
- analyze track
- change target duration
- change scoring mode
- select a candidate row
- preview selected loop
- export selected loop
- place markers
- commit candidate
- mock mode
- host bridge payloads
- packaged panel runtime
- release package output and install validation

The redesign preserved the existing DOM IDs and data attributes used by smoke tests and panel bindings. No broken event bindings were found in the automated coverage. Error/status surfaces remain visible through the panel status line, action status pills, and bottom progress/log dock.

## Layout QA

The beta.6 layout was reviewed against the intended Adobe panel use cases:

- large docked panel: three-column utility layout keeps source queue, waveform/candidates, inspector, and output dock visible
- medium docked panel: inspector collapses into a lower grid and candidate/output areas retain scrolling
- small floating panel: single-column fallback keeps the primary action, waveform, candidate table, inspector, and output/log sections reachable by scrolling

No new redesign was made during this pass. The CSS already includes horizontal scrolling for the candidate table, fixed-format waveform sizing, compact controls, and output/log overflow handling.

Manual visual confirmation inside real Premiere Pro and After Effects is still required before claiming live-host UI success.

## CEP Rendering QA

Verified expectations:

- `panel/dist/index.html` uses `./assets/...`
- no panel dist regression to root-absolute `/assets/...`
- `CSInterface.js` is packaged in panel dist
- manifest `MainPath` remains `./dist/index.html`
- manifest `ScriptPath` remains `./host-index.jsx`
- `host-index.jsx` loads `host-premiere/jsx/fastloop_premiere.jsx` and `host-aftereffects/jsx/fastloop_aftereffects.jsx` from inside the bundle
- release validation installs and verifies the shared Premiere Pro / After Effects bundle structure

## Size Audit

Issues found:

- Previously generated `release/out/FastLoop-*` folders were tracked in git, including installers, portable zips, and packaged runtime binaries.
- Generated smoke TypeScript output under `panel/.smoke-dist` and `mock/.smoke-dist` was tracked.
- Local generated release folders and `.fastloop-output` inflated the working tree.

Fixes made:

- `.gitignore` now ignores `release/build/`, generated release outputs except `release/out/.gitkeep`, smoke output folders, and existing build output patterns.
- Previously tracked generated release outputs and smoke outputs were removed from git tracking while leaving source files intact.
- Old tracked release outputs and smoke outputs were removed from git tracking; local generated folders can be deleted after approval, while the current prerelease output is kept for validation/publishing.
- Added `npm run size:audit` to fail if generated release or smoke artifacts become tracked again.

Remaining size note:

- Existing generated binaries remain in git history until a future history-cleanup milestone. This pass does not rewrite history.
- The current release package is about 50 MiB for the installer and 50 MiB for the portable zip. Most size is the PyInstaller runtime with NumPy/SciPy/native dependencies, which should not be removed without a separate runtime-minimization project.

## Manual Host Checklist

Premiere Pro:

1. Install `FastLoop-Windows-x64-Setup.exe` from the latest prerelease output.
2. Restart Premiere Pro.
3. Open `Window > Extensions (Legacy) > FastLoop`.
4. If needed, also check `Window > Extensions > FastLoop`.
5. Choose an audio file.
6. Analyze the track.
7. Change target duration and scoring mode.
8. Select a loop candidate.
9. Preview the selected loop.
10. Export the selected loop.
11. Place markers.
12. Commit the rendered asset/candidate to the host.
13. If anything fails, inspect CEP logs and run the packaged host-readiness helper.

After Effects:

1. Install `FastLoop-Windows-x64-Setup.exe` from the latest prerelease output.
2. Restart After Effects.
3. Open `Window > Extensions (Legacy) > FastLoop`.
4. If needed, also check `Window > Extensions > FastLoop`.
5. Choose an audio file.
6. Analyze the track.
7. Change target duration and scoring mode.
8. Select a loop candidate.
9. Preview the selected loop.
10. Export the selected loop.
11. Place markers.
12. Commit the rendered asset/candidate to the host.
13. If anything fails, inspect CEP logs and run the packaged host-readiness helper.

## Release Readiness

The repository is ready for the next prerelease after committing the beta.6 redesign, beta.7 QA documentation, version alignment, generated-artifact cleanup, and size-audit script. Do not tag or publish until the commit is made and manual Premiere Pro / After Effects host checks are completed or explicitly waived for prerelease.
