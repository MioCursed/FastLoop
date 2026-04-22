# Changelog

## 0.1.1-beta.1

- aligns the next prerelease around GitHub Releases as the primary install path
- keeps `FastLoop-Windows-x64-Setup.exe` as the primary download and `FastLoop-Windows-x64.zip` as the fallback
- adds prerelease-focused release note scaffolding and workflow-side tag/version validation
- preserves the packaged Windows runtime, release manifest, checksums, and installer-first asset set

## 0.1.0

- packaged Windows x64 engine runtime for end-user releases
- CEP panel flow with file picker, export destination, preview, export, and commit
- Premiere Pro and After Effects marker/commit workflow with initial rendered-asset handoff
- Windows x64 installer and portable release packaging for GitHub Releases
- GitHub Actions release automation scaffold with checksum and signing-ready hooks
