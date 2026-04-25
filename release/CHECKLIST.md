# Release Checklist

1. Run `npm run typecheck`.
2. Run `python -m compileall engine/fastloop_engine engine/tests`.
3. Run `npm run build:shared`.
4. Run `npm run build:panel`.
5. Run `npm run build:mock`.
6. Run `npm run build:engine-runtime`.
7. Run `npm run runtime:validate`.
8. Run `npm run smoke:render`.
9. Run `npm run smoke:panel`.
10. Run `npm run smoke:panel:packaged`.
11. Run `npm run smoke:mock`.
12. Run `npm run smoke:host`.
13. Run `npm run docs:validate`.
14. Run workflow YAML validation before publishing.
15. Run `npm run release:build`.
16. Run `npm run release:validate`.
17. Confirm `release/out/FastLoop-<version>/` contains:
   `FastLoop-Windows-x64-Setup.exe`
   `FastLoop-Windows-x64.zip`
   `SHA256SUMS.txt`
   `release-notes.md`
   `release-manifest.json`
18. Run `npm run installer:validate`.
19. Confirm a failed setup writes `%LOCALAPPDATA%\FastLoop\Logs\setup-latest.log`, `setup-latest.json`, `setup-helper-stdout.log`, and `setup-helper-stderr.log`.
20. Confirm PowerShell preflight logs are written to `setup-powershell-preflight-stdout.log` and `setup-powershell-preflight-stderr.log`.
21. Confirm the generated setup executable was smoke-tested, not only `Install-FastLoop.ps1`.
22. Confirm the portable fallback zip and `Install-FastLoop.cmd` are present in both the release zip and setup payload.
23. Publish the generated assets to GitHub Releases with tag `v<package.version>`.
24. Use release title `FastLoop v<package.version> Prerelease`.
25. Add real signing in the next production-release stage when certificate material is available.
