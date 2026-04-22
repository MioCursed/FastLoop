# FastLoop Install

## End-User Install

This is the normal user path for Windows. It uses the packaged FastLoop engine runtime, so the user does not need a manual Python install for standard panel usage.

1. Download or build a release artifact with `npm run release:build`.
2. Open `release/out/FastLoop-<version>/`.
3. Copy the `FastLoop/` extension folder into your CEP extension location.
4. If your Adobe environment requires unsigned CEP extensions, enable unsigned CEP loading for local testing.
5. Open Premiere Pro or After Effects and launch the `FastLoop` panel.
6. Use `Choose Audio` to pick a track, `Choose Export Folder` to set the output path, then run analyze, preview, export, and commit.

Current install boundary:

- the release output is an unsigned CEP extension bundle plus the packaged Windows engine runtime
- signing and a true one-click installer remain the next release milestone
- host-side rendered asset handoff currently imports the exported extended mix during commit when available

Typical CEP extension folder on Windows:

- `%AppData%\Adobe\CEP\extensions\FastLoop`

FastLoop outputs:

- previews and exports go to the selected export destination when provided
- if no folder is chosen, FastLoop falls back to `.fastloop-output/`
- metadata JSON is written alongside the exported audio set

## Developer Setup

Use this path when you need to edit, rebuild, or validate the project.

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
npm run smoke:panel
npm run smoke:mock
npm run smoke:host
npm run smoke:render
npm run release:build
npm run release:validate
npm run docs:validate
```

Developer note:

- manual Python install is still required for engine development and PyInstaller rebuilds, even though the packaged end-user path avoids that dependency
