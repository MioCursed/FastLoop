# Changelog

## 0.1.1-beta.7

- replaces the IExpress-style setup wrapper with an Inno Setup Windows x64 wizard
- adds English and Brazilian Portuguese installer language support, license/terms, install options, additional tasks, progress, and completion actions
- keeps the tested PowerShell CEP install helper as the authority for bundle copy, PlayerDebugMode, logs, and verification
- validates the Inno installer asset, portable fallback zip, checksums, release manifest, packaged helper scripts, and package hygiene
- documents the new setup wizard flow, logs, CurrentUser vs AllUsers behavior, and zip fallback path
- performs the post-redesign QA pass for beta.6 functionality, layout, CEP rendering, packaged runtime, install, and release artifacts
- adds repository size auditing and ignores generated release/build/smoke outputs so release assets stay in GitHub Releases instead of the repo
- removes previously tracked generated release and smoke artifacts from version control while preserving source, templates, installers, host adapters, and release scripts
- strengthens release validation around installer assets, checksums, package contents, and generated-artifact hygiene

## 0.1.1-beta.6

- redesigns the CEP panel into a dense Shutter Encoder-inspired utility layout for FastLoop loop analysis
- preserves choose, analyze, duration/scoring, candidate selection, preview, export, marker, commit, mock, and host bridge workflows
- keeps the existing architecture, CEP load paths, release packaging, and install logic unchanged

## 0.1.1-beta.5

- emits CEP-safe relative Vite assets from the panel build
- validates built panel asset paths and bundled JS/CSS existence
- packages a local `CSInterface.js` shim with the panel output

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
