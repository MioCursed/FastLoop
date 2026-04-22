# FastLoop Install

## End-User Install

FastLoop should be installed from GitHub Releases.

Releases page:

- https://github.com/MioCursed/FastLoop/releases

Downloads:

- Recommended: `FastLoop-Windows-x64-Setup.exe`
- Alternative: `FastLoop-Windows-x64.zip`

### Recommended Install Path

1. Open GitHub Releases.
2. Download `FastLoop-Windows-x64-Setup.exe`.
3. Run the installer.
4. Open Premiere Pro or After Effects.
5. Launch the `FastLoop` panel.
6. Choose audio, analyze, preview, export, and commit.

### Portable/Fallback Path

1. Download `FastLoop-Windows-x64.zip`.
2. Extract the archive.
3. Run `Install-FastLoop.cmd`.
4. Open Premiere Pro or After Effects and launch `FastLoop`.

The zip package is a fallback path. The installer is the primary user-facing method.

### Requirements

- Windows x64
- Adobe Premiere Pro or Adobe After Effects with CEP panel support

### Notes

- the packaged Windows runtime is included, so the normal release path does not require a manual Python install
- exported previews and renders go to the selected export destination when provided
- if no output folder is chosen in the panel, FastLoop falls back to `.fastloop-output/`
- the current installer and zip are usable prerelease assets

### Advanced / Fallback CEP Path

Manual CEP folder copy is no longer the main install story. Keep it only as an advanced fallback if the installer or portable helper cannot be used.

Typical fallback CEP location on Windows:

- `%AppData%\Adobe\CEP\extensions\FastLoop`

## Developer Setup

Developer setup is secondary to the release install path.

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
npm run smoke:panel:packaged
npm run smoke:mock
npm run smoke:host
npm run smoke:render
npm run docs:validate
npm run release:build
npm run release:validate
```

Developer note:

- a manual Python install is still required for engine development and PyInstaller rebuilds, even though the packaged end-user path avoids that dependency
