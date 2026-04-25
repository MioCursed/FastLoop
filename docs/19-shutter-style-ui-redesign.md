# FastLoop Shutter-Style UI Redesign

FastLoop 0.1.1-beta.6 reorganizes the CEP panel into a compact desktop utility layout inspired by Shutter Encoder's workflow density and task-first structure. The redesign uses Shutter Encoder only as a reference for the category of interface: a dense tool with source inputs, function selection, output controls, advanced settings, progress feedback, and one clear execution area.

## What Was Adapted

- Input queue: FastLoop's track slots, selected source path, cache state, and analysis status now live in a left input column.
- Function workflow: Analyze, Loop Finder, Preview, Export, Build Bed, and Commit appear as a central mode strip with a primary action button.
- Main work area: waveform peaks, timing markers, selected loop overlay, metadata, and ranked candidates remain the center of the panel.
- Output destination: export folder, preview WAV, intro, loop, outro, extended bed, and metadata JSON paths are grouped in the bottom output dock.
- Advanced options: target duration, scoring mode, preview mode, rerank state, candidate inspection, score breakdown, and host readiness are grouped in the right inspector.
- Progress/logs: analysis, preview, export, commit, warnings, host status, and queue rows stay visible as utility feedback.

## What Was Not Copied

No Shutter Encoder source code, branding, logos, icons, copyrighted artwork, proprietary labels, or assets were used. The implementation remains FastLoop-specific and is built from the existing TypeScript/CSS panel code. Labels, visual treatment, layout details, colors, and interaction wiring are original to FastLoop.

## Why This Is Clean-Room

The redesign is based only on broad workflow ideas: dense desktop utility controls, source-to-function-to-output flow, advanced settings, and visible progress. It does not inspect or reuse the Shutter Encoder repository contents. All UI code, styling, and copy were authored inside FastLoop's own panel files and continue to use FastLoop's loop-analysis data contracts.

## Testing In Premiere Pro Or After Effects

1. Build and validate the release package with `npm run release:build` and `npm run release:validate`.
2. Install or copy the regenerated FastLoop CEP bundle using the existing release/install workflow.
3. Open Premiere Pro or After Effects and launch `Window > Extensions > FastLoop`.
4. Confirm the panel loads from `./dist/index.html` and the host script loads from `./host-index.jsx`.
5. Choose an audio file, run Analyze Track, select a candidate, preview it, export it, place markers, and commit it to the host.
6. Resize the panel as a large dock, medium dock, and smaller floating panel. The input queue, waveform, candidate table, inspector, and output/log dock should remain readable with scrolling where needed.
