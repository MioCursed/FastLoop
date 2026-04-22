# 17. Install / Load Diagnostic

## Most Likely Root Causes

1. The current GitHub Release is an unsigned CEP prerelease, so Premiere Pro and After Effects may hide the panel unless `PlayerDebugMode` is enabled for the active CEP version.
2. The installer previously copied files and reported success without checking whether unsigned CEP loading prerequisites were satisfied.
3. The release bundle previously depended on a single install target and did not produce a post-install readiness report.
4. The source manifest carried stale version values, which weakened duplicate-bundle precedence and made release diagnostics harder.

## Confirmed By Repo Inspection

- `release/templates/windows/Install-FastLoop.ps1` previously installed only to `%AppData%\Adobe\CEP\extensions\FastLoop` and exited success after copy alone.
- The previous install path did not check `HKEY_CURRENT_USER\Software\Adobe\CSXS.11` or `CSXS.12` for `PlayerDebugMode`.
- `panel/CSXS/manifest.xml` was still using `0.1.0` while the release package had moved ahead.
- The repo had no post-install verifier or troubleshooting path focused on “installed but not visible”.

## Still Requiring Live Adobe Host Confirmation

- Final visibility in a real Premiere Pro or After Effects install still depends on the target Adobe build honoring CEP and reading the current-user registry state.
- The repo can verify bundle structure, install placement, manifest paths, and registry readiness, but only a real Adobe host can prove the panel appears in the Window menu.
