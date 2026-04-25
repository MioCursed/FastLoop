# FastLoop CEP Troubleshooting

## Installed But Not Visible Under Window > Extensions

If FastLoop installs but does not appear in Premiere Pro or After Effects, check these first:

1. Restart the Adobe host after installation.
2. On newer Adobe builds, check `Window > Extensions (Legacy) > FastLoop`, not only `Window > Extensions`.
3. Confirm the bundle exists at `%AppData%\Adobe\CEP\extensions\FastLoop`.
4. Confirm these files exist inside that folder:
   - `CSXS\manifest.xml`
   - `dist\index.html`
   - `host-index.jsx`
   - `host-premiere\jsx\fastloop_premiere.jsx`
   - `host-aftereffects\jsx\fastloop_aftereffects.jsx`
5. Confirm unsigned CEP support is enabled in the current-user registry for both:
   - `HKEY_CURRENT_USER\Software\Adobe\CSXS.11\PlayerDebugMode = 1`
   - `HKEY_CURRENT_USER\Software\Adobe\CSXS.12\PlayerDebugMode = 1`

## Installed and validated but not visible

- [ ] Verify manifest `MainPath` and `ScriptPath`.
- [ ] Confirm CEP paths are root-relative within the bundle.
- [ ] Verify there is no `../` escape in manifest resource paths.
- [ ] Verify `host-index.jsx` script loads resolve to existing in-bundle files.
- [ ] Verify `PlayerDebugMode=1` for `CSXS.11`, `CSXS.12`, and `CSXS.13`.
- [ ] Check both `Window > Extensions (Legacy)` and `Window > Extensions`.

## Built-In Readiness Check

Run the packaged helper after install:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Test-FastLoop-HostReadiness.ps1
```

The helper reports:

- whether the installed FastLoop bundle is complete
- whether `PlayerDebugMode` is enabled for CEP 11 and CEP 12
- where duplicate FastLoop bundles may exist
- whether the machine is likely ready for FastLoop to appear

## CEP Log Locations

Adobe CEP documentation indicates PlugPlug and CEPHtmlEngine logs are written on Windows under:

- `%LOCALAPPDATA%\Temp`

Useful filenames include:

- `CEP*-PPRO.log`
- `CEP*-AEFT.log`
- `CEPHtmlEngine*-PPRO-*.log`
- `CEPHtmlEngine*-AEFT-*.log`

If FastLoop still does not appear, these logs are the best next place to inspect for manifest, signature, or runtime load failures.
