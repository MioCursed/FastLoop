# FastLoop CEP Troubleshooting

## Installed But Not Visible Under Window > Extensions

If FastLoop installs but does not appear in Premiere Pro or After Effects, check these first:

1. Restart the Adobe host after installation.
2. On newer Adobe builds, check `Window > Extensions (Legacy) > FastLoop`, not only `Window > Extensions`.
3. Confirm where FastLoop was installed:
   - CurrentUser root: `%AppData%\Adobe\CEP\extensions\FastLoop`
   - AllUsers roots:
     - `%ProgramFiles(x86)%\Common Files\Adobe\CEP\extensions\FastLoop`
     - `%ProgramFiles%\Common Files\Adobe\CEP\extensions\FastLoop`
4. Confirm these files exist inside that folder:
   - `CSXS\manifest.xml`
   - `dist\index.html`
   - `host-index.jsx`
   - `host-premiere\jsx\fastloop_premiere.jsx`
   - `host-aftereffects\jsx\fastloop_aftereffects.jsx`
5. Confirm unsigned CEP support is enabled in the current-user registry for all required CEP versions:
   - `HKEY_CURRENT_USER\Software\Adobe\CSXS.11\PlayerDebugMode = 1`
   - `HKEY_CURRENT_USER\Software\Adobe\CSXS.12\PlayerDebugMode = 1`
   - `HKEY_CURRENT_USER\Software\Adobe\CSXS.13\PlayerDebugMode = 1`

## Setup Wizard Failure

`FastLoop-Windows-x64-Setup.exe` is an Inno Setup wizard. During the installing
page it calls the packaged `Install-FastLoop.ps1` helper and waits for that
helper to finish verification. If the helper exits nonzero, the wizard reports
failure instead of showing a fake success page.

Check these logs first:

- Inno Setup log: `%TEMP%\Setup Log*.txt`
- FastLoop setup wrapper log: `%LOCALAPPDATA%\FastLoop\Logs\setup-latest.log`
- FastLoop setup wrapper summary: `%LOCALAPPDATA%\FastLoop\Logs\setup-latest.json`
- Helper stdout capture: `%LOCALAPPDATA%\FastLoop\Logs\setup-helper-stdout.log`
- Helper stderr capture: `%LOCALAPPDATA%\FastLoop\Logs\setup-helper-stderr.log`
- FastLoop install log: `%LOCALAPPDATA%\FastLoop\Logs\install-latest.log`
- FastLoop install summary: `%LOCALAPPDATA%\FastLoop\Logs\install-latest.json`
- Readiness summary: `%LOCALAPPDATA%\FastLoop\Logs\host-readiness-latest.json`

## Setup fails before FastLoop appears

If the setup wizard fails before FastLoop appears in Adobe, treat it as an installer/helper problem first.

1. Close Premiere Pro and After Effects.
2. Open `%LOCALAPPDATA%\FastLoop\Logs\setup-latest.log`.
3. Check `%LOCALAPPDATA%\FastLoop\Logs\setup-latest.json` for the failure category and raw exit code.
4. If present, check `%LOCALAPPDATA%\FastLoop\Logs\install-latest.log` and `install-latest.json`.
5. If the failure mentions permissions or AllUsers/system CEP roots, rerun setup as administrator only if your environment requires system CEP roots.
6. If setup still fails, extract `FastLoop-Windows-x64.zip` and run `Install-FastLoop.cmd`.

The setup wrapper attempts to copy a recovery zip to:

- `%LOCALAPPDATA%\FastLoop\Recovery\FastLoop-Windows-x64.zip`

After a fallback install, restart the Adobe host and check both menu paths:

- `Window > Extensions (Legacy) > FastLoop`
- `Window > Extensions > FastLoop`

## Installed and validated but not visible

If the installer reports success but Premiere Pro still does not show FastLoop, treat it as a CEP load problem first.

- [ ] Verify manifest `MainPath` is exactly `./dist/index.html`.
- [ ] Verify manifest `ScriptPath` is exactly `./host-index.jsx`.
- [ ] Confirm both manifest paths resolve from the FastLoop bundle root and do not use `../`.
- [ ] Verify `host-index.jsx` loads `host-premiere\jsx\fastloop_premiere.jsx` and `host-aftereffects\jsx\fastloop_aftereffects.jsx` from inside the same FastLoop bundle.
- [ ] Verify `PlayerDebugMode=1` for `CSXS.11`, `CSXS.12`, and `CSXS.13`; newer Adobe builds such as Premiere Pro 2026 may require the `CSXS.13` key.
- [ ] Check both `Window > Extensions (Legacy) > FastLoop` and `Window > Extensions > FastLoop`.
- [ ] Inspect CEP logs under `%LOCALAPPDATA%\Temp` for manifest, signature, or script-load errors.

## CurrentUser vs AllUsers CEP Roots

Adobe CEP documentation indicates the host searches extension roots in this order:

1. product extension folder
2. system extension folder
3. per-user extension folder

That means a stale FastLoop bundle in an AllUsers/system CEP root can override or interfere with a newer CurrentUser install.

FastLoop now:

- installs to the CurrentUser CEP root by default
- attempts AllUsers installs in `Auto` mode when the process can write there
- reports duplicate or stale FastLoop bundles in higher-priority roots
- reports whether the final install is ready separately for Premiere Pro and After Effects

If CurrentUser install succeeds but FastLoop still does not appear, the next thing to check is whether an older FastLoop bundle exists under either AllUsers CEP root.

If your environment consistently favors system CEP roots, reinstall with `-PreferAllUsers`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-FastLoop.ps1 -PreferAllUsers
```

The old portable visual panel remains available for fallback script installs,
but the release installer is now the Inno Setup wizard.

## Built-In Readiness Check

Run the packaged helper after install:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Test-FastLoop-HostReadiness.ps1
```

The helper reports:

- whether the installed FastLoop bundle is complete
- whether `PlayerDebugMode` is enabled for CEP 11, CEP 12, and CEP 13
- whether FastLoop was found in CurrentUser and/or AllUsers CEP roots
- where duplicate FastLoop bundles may exist
- whether Premiere Pro is likely ready
- whether After Effects is likely ready

## Premiere Pro Checklist

1. Restart Premiere Pro.
2. Check `Window > Extensions (Legacy) > FastLoop`.
3. If not visible there, check `Window > Extensions > FastLoop`.
4. Run `Test-FastLoop-HostReadiness.ps1` and confirm:
   - `CoveredByManifest` is true for `PPRO`
   - `LikelyReady` is true for Premiere
   - there is no `higherPriorityConflicts` entry from an older AllUsers FastLoop bundle

## After Effects Checklist

1. Restart After Effects.
2. Check `Window > Extensions (Legacy) > FastLoop`.
3. If not visible there, check `Window > Extensions > FastLoop`.
4. Run `Test-FastLoop-HostReadiness.ps1` and confirm:
   - `CoveredByManifest` is true for `AEFT`
   - `LikelyReady` is true for After Effects
   - there is no `higherPriorityConflicts` entry from an older AllUsers FastLoop bundle

## CEP Log Locations

Adobe CEP documentation indicates PlugPlug and CEPHtmlEngine logs are written on Windows under:

- `%LOCALAPPDATA%\Temp`

Useful filenames include:

- `CEP*-PPRO.log`
- `CEP*-AEFT.log`
- `CEPHtmlEngine*-PPRO-*.log`
- `CEPHtmlEngine*-AEFT-*.log`

If FastLoop still does not appear, these logs are the best next place to inspect for manifest, signature, or runtime load failures.
