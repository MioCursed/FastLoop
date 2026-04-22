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
5. Confirm unsigned CEP support is enabled in the current-user registry for both:
   - `HKEY_CURRENT_USER\Software\Adobe\CSXS.11\PlayerDebugMode = 1`
   - `HKEY_CURRENT_USER\Software\Adobe\CSXS.12\PlayerDebugMode = 1`

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

## Built-In Readiness Check

Run the packaged helper after install:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Test-FastLoop-HostReadiness.ps1
```

The helper reports:

- whether the installed FastLoop bundle is complete
- whether `PlayerDebugMode` is enabled for CEP 11 and CEP 12
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
