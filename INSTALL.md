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
3. Run the Inno Setup wizard.
4. Accept the FastLoop prerelease terms after reviewing them.
5. Keep the default CurrentUser CEP install unless you specifically need AllUsers.
6. Leave unsigned CEP prerelease support enabled for this prerelease build.
7. Let the installer complete its verification step.
8. Open Premiere Pro or After Effects.
9. Open `Window > Extensions (Legacy) > FastLoop` on newer Adobe builds, or `Window > Extensions > FastLoop` on older builds.
10. Choose audio, analyze, preview, export, and commit.

The wizard includes:

- language selection for English or Brazilian Portuguese
- welcome/about page
- license/terms page
- destination/options page for installer support files
- additional FastLoop tasks
- ready-to-install page
- installing progress page
- completion page with readiness, guide, and logs actions

FastLoop itself is installed as a CEP extension. The destination folder stores installer support files and documentation; the PowerShell helper installs the actual CEP bundle into the Adobe CEP roots.

Useful task options:

- `Run FastLoop readiness check now` runs the packaged host-readiness helper after setup.
- `Open FastLoop install guide` opens this guide from the installed support files.
- `Open FastLoop logs folder` opens `%LOCALAPPDATA%\FastLoop\Logs`.
- `Enable PlayerDebugMode for CEP CSXS.11, CSXS.12, and CSXS.13` allows the unsigned prerelease CEP panel to load.
- `Prefer AllUsers CEP root when administrator permissions are available` attempts a system CEP install when the setup process has admin rights.

The installer fails visibly if the install helper or verification fails. It writes logs and JSON summaries under:

- `%LOCALAPPDATA%\FastLoop\Logs`

### Open FastLoop

After installing, restart Premiere Pro or After Effects and use one of these menu paths:

- `Window > Extensions (Legacy) > FastLoop`
- `Window > Extensions > FastLoop`

FastLoop is not a standalone desktop app, so the installer does not add a fake launch shortcut.

### Portable/Fallback Path

1. Download `FastLoop-Windows-x64.zip`.
2. Extract the archive.
3. Run `Install-FastLoop.cmd`.
4. Open Premiere Pro or After Effects and launch `FastLoop`.

The zip package is a fallback path. The installer is the primary user-facing method.

Advanced installer flags:

- `-PreferAllUsers` to prioritize system-wide CEP roots when you have permissions.
- `-AllowRunningHosts` to bypass the safety stop if Premiere/After Effects are currently running (not recommended).
- `-UseInstallerPanel` to force the visual installer panel when running `Install-FastLoop.ps1` directly.

### Requirements

- Windows x64
- Adobe Premiere Pro or Adobe After Effects with CEP panel support

### Notes

- the packaged Windows runtime is included, so the normal release path does not require a manual Python install
- the current unsigned prerelease install path enables `PlayerDebugMode=1` for `CSXS.11`, `CSXS.12`, and `CSXS.13` under `HKEY_CURRENT_USER\Software\Adobe`
- exported previews and renders go to the selected export destination when provided
- if no output folder is chosen in the panel, FastLoop falls back to `.fastloop-output/`
- the current installer and zip are usable prerelease assets

### Installed But Not Visible

If FastLoop installs but does not appear:

1. Fully quit Premiere Pro or After Effects and reopen it.
2. Check `Window > Extensions (Legacy) > FastLoop` first on newer Adobe builds.
3. Confirm whether FastLoop installed only to CurrentUser or also to AllUsers CEP roots:
   - `%AppData%\Adobe\CEP\extensions\FastLoop`
   - `%ProgramFiles(x86)%\Common Files\Adobe\CEP\extensions\FastLoop`
   - `%ProgramFiles%\Common Files\Adobe\CEP\extensions\FastLoop`
3. Run the packaged readiness helper:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Test-FastLoop-HostReadiness.ps1
```

4. Confirm the readiness report marks Premiere and/or After Effects as likely ready.
   - Newer reports also split `preconditionsReady` vs `hostLoadEvidenceConfirmed`.
5. Confirm `manifest.xml` exists in the installed CEP root.
6. Confirm `PlayerDebugMode` is set to `1` under:
   - `HKEY_CURRENT_USER\Software\Adobe\CSXS.11`
   - `HKEY_CURRENT_USER\Software\Adobe\CSXS.12`
   - `HKEY_CURRENT_USER\Software\Adobe\CSXS.13`
7. If FastLoop exists only in the CurrentUser CEP root, try an AllUsers install if you have permission.
8. If the panel is still missing, inspect Adobe CEP logs under `%LOCALAPPDATA%\Temp`.
9. Re-run install with `-PreferAllUsers` if your environment consistently loads CEP from system roots first.

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
