# Changelog

## 0.1.1-beta.4

- fixes CEP bundle path resolution so `MainPath`, `ScriptPath`, and host adapter loads stay inside the installed FastLoop bundle
- tightens CEP validation around manifest resource paths and host adapter source mapping
- keeps unsigned CEP readiness coverage for CSXS 11, CSXS 12, and CSXS 13

## 0.1.1-beta.3

- adds a visual installer panel flow for Windows install (`-UseInstallerPanel`) with guided scope/options
- adds host-load proof diagnostics from CEP logs (`confirmed` / `error-signals` / `no-evidence`) for PPRO/AEFT
- separates readiness into preconditions vs host-load evidence in install/readiness JSON outputs
- keeps shared CEP bundle architecture (PPRO + AEFT) and portable smoke-path fixes from prior blocks

## 0.1.1-beta.2

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
