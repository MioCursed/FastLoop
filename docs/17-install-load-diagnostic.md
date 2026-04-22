# 17. Install / Load Diagnostic

## Most Likely Root Causes

1. The current GitHub Release is an unsigned CEP prerelease, so Premiere Pro and After Effects may hide the panel unless `PlayerDebugMode` is enabled for the active CEP version.
2. The installer previously copied files and reported success without checking whether unsigned CEP loading prerequisites were satisfied.
3. CurrentUser-only CEP install is not always a reliable final answer because CEP searches system roots before per-user roots, so an older AllUsers FastLoop bundle can override or interfere with a newer CurrentUser install.
4. The source manifest carried stale version values, which weakened duplicate-bundle precedence and made release diagnostics harder.

## Confirmed By Repo Inspection

- `release/templates/windows/Install-FastLoop.ps1` previously installed only to `%AppData%\Adobe\CEP\extensions\FastLoop` and exited success after copy alone.
- The previous install path did not check `HKEY_CURRENT_USER\Software\Adobe\CSXS.11` or `CSXS.12` for `PlayerDebugMode`.
- `panel/CSXS/manifest.xml` was still using `0.1.0` while the release package had moved ahead.
- The repo had no post-install verifier or troubleshooting path focused on “installed but not visible”.
- The repo previously defaulted to CurrentUser CEP install without treating higher-priority AllUsers roots as a potential conflict or fallback.

## Working Conclusion

- A shared CEP bundle for Premiere Pro and After Effects remains a valid architecture and does not need to be split to diagnose this issue.
- CurrentUser-only install was a plausible blocker, but not because CEP forbids it. The stronger issue is that CurrentUser-only is not reliable enough when a stale AllUsers bundle exists or when the host environment effectively prefers the system CEP root.
- The practical fix is stronger install targeting, duplicate detection, and host-specific readiness output, not splitting the extension into separate Premiere and After Effects bundles.

## Still Requiring Live Adobe Host Confirmation

- Final visibility in a real Premiere Pro or After Effects install still depends on the target Adobe build honoring CEP and reading the current-user registry state.
- The repo can verify bundle structure, install placement, manifest paths, and registry readiness, but only a real Adobe host can prove the panel appears in the Window menu.
