# FastLoop Engineering Code Review (2026-04-23)

This review is based on the repository state on branch `work` and focuses on completed blocks and current release/install logic.

## 1) Executive summary

**Overall health:** good MVP architecture with solid release-first intent, but install/load reliability is still constrained by a few correctness gaps and misleading readiness criteria.

**Biggest strengths**
- Shared CEP bundle targeting both PPRO and AEFT is correctly implemented and validated as a single bundle architecture.
- Deterministic engine path is coherent, transparent, and serializable end-to-end.
- Release pipeline enforces version/tag alignment and produces installer + zip with reproducible manifest/checksum structure.
- Installer/readiness tooling explicitly addresses CurrentUser vs AllUsers precedence and duplicate bundle conflicts.

**Biggest risks**
- Several smoke scripts are hard-coded to a developer machine path (`c:/Users/Nataniel/Downloads/FastLoop`), so local/CI confidence is overstated.
- Installer readiness can report success while Adobe still hides panel due to factors not yet probed (host-specific CEP cache/log failure modes, runtime load faults after menu registration).
- Host dispatch by `app.name` string is brittle across localized/nonstandard host names; this can silently prevent host adapter loading.
- Production release artifacts are unsigned by design; this remains a practical visibility/load risk depending on user environment and policy.

## 2) What is already good and should NOT be changed

- **Shared-bundle architecture** (`panel/CSXS/manifest.xml` + `panel/host-index.jsx` + host adapters): one bundle with both `PPRO` and `AEFT` targets is correct for current scope. Do not split by host unless a proven host-specific runtime incompatibility appears.
- **Panel/engine contract surface** (`shared/src/contracts.ts`, `shared/src/types.ts`) is explicit and sufficiently typed for current MVP.
- **Deterministic scoring transparency** (`engine/fastloop_engine/scoring.py`, `rerank.py`, `pipeline.py`, `serialize.py`) is clear and auditable.
- **Release packaging model** (`scripts/build-release.mjs`, `.github/workflows/release.yml`) keeps installer primary, zip fallback, and enforces tag/package alignment.
- **CEP install root strategy** (`release/templates/windows/FastLoop-CEPCommon.ps1`, `Install-FastLoop.ps1`) correctly models CurrentUser + AllUsers roots and conflict detection.

## 3) Critical problems

1. **Smoke/test scripts are machine-path hardcoded, invalidating portability and CI truthfulness.**
   - Files:
     - `scripts/smoke-panel.mjs`
     - `scripts/smoke-panel-packaged.mjs`
     - `scripts/smoke-host-payload.mjs`
     - `scripts/smoke-mock.mjs`
     - `panel/src/state.ts` (default fixture path)
   - Why this matters:
     - These tests only work on one developer path and can silently fail/skip in other environments, so your "green" smoke status can be misleading.
     - It increases regression risk for release/install changes because the intended validation suite is not environment-agnostic.

2. **Host adapter dispatch depends on fragile app-name string matching.**
   - File: `panel/host-index.jsx`
   - Why this matters:
     - If `app.name` differs (localization/build differences), adapter script may not load, causing panel actions to fail with host-unavailable behavior even though manifest/installation are correct.
     - This is one direct route to “installed but not effectively usable.”

3. **Installer “ready” signal is stronger than evidence collected.**
   - Files:
     - `release/templates/windows/Install-FastLoop.ps1`
     - `release/templates/windows/Test-FastLoop-HostReadiness.ps1`
     - `release/templates/windows/FastLoop-CEPCommon.ps1`
   - Why this matters:
     - Current readiness checks validate file presence, manifest host coverage, debug registry state, and higher-priority conflicts.
     - They do **not** validate host-side runtime load (CEP engine log success, ScriptPath load success, panel bootstrap success). This can report "ready" while panel still fails to appear/load.

4. **Unsigned prerelease status remains a real-world appearance blocker in some environments.**
   - Files/docs:
     - `.github/workflows/release.yml` (signing placeholder)
     - `release/SIGNING.md`
     - `INSTALL.md`, `release/TROUBLESHOOTING.md`
   - Why this matters:
     - Even with `PlayerDebugMode`, enterprise policy/host restrictions may still hide/limit behavior. This is a practical top-level risk for “installs but not visible.”

## 4) Medium-priority problems

- **Panel defaults include a personal absolute path** in `panel/src/state.ts`, which leaks local context into shipped UX assumptions and confuses first-run behavior.
- **`buildExportPlan` executes full export** in `panel/src/adobe.ts` instead of planning-only semantics. Contract name is misleading and may create unnecessary heavy operations.
- **Runtime detection in `panel/src/adobe.ts` is Windows-centric** (PowerShell dialogs, packaged exe path assumptions). Acceptable for current release target, but guardrails/messages should be explicit when non-Windows context is detected.
- **Success wording in installer** can still read optimistic when host-level visibility is unresolved; language should distinguish “bundle installed” vs “panel confirmed visible.”
- **Release outputs committed in repo (`release/out/*`)** can become stale and can mislead reviewers if not always regenerated; consider policy to keep only source/templates in VCS.

## 5) Low-priority cleanup

- Duplicate doc phrasing around Extensions vs Extensions (Legacy) can be tightened to one canonical phrasing.
- `readyForHosts` and host readiness report naming could better separate “preconditions met” from “confirmed load.”
- Minor consistency cleanup in generated metadata versioning (`metadata.version = "1.0.0"`) vs product version semantics.

## 6) Install/load diagnosis

### Most likely remaining reasons FastLoop may still not appear

1. **Higher-priority stale AllUsers bundle still wins host scan order** despite CurrentUser install success.
2. **Unsigned CEP acceptance still blocked by environment policy** even with `PlayerDebugMode=1`.
3. **Host restart/cache conditions**: host was not fully restarted, or cached CEP state/logged load errors persist.
4. **Host script dispatch mismatch via `app.name`** prevents adapter init in some host naming contexts.
5. **Panel loads but fails early in runtime bootstrap** (Node/runtime path assumptions) and thus appears missing/nonfunctional to users.

### Is shared CEP bundle architecture still the right choice?

**Yes.** The current shared bundle targeting both `PPRO` and `AEFT` is correct and appropriate for this project stage.

### Are separate Premiere/After folders necessary?

**No (not as separate CEP bundles).** Keeping host-specific JSX in separate subfolders under one shared bundle is already a good separation pattern. Separate top-level bundles are not required by current evidence.

## 7) Recommended fix order

1. **Fix test portability immediately** (remove hardcoded workspace paths, derive from `process.cwd()`/repo root).
2. **Harden host dispatch in `host-index.jsx`** (match by stable host IDs where possible, add clear fallback logging/error markers).
3. **Split readiness semantics** into:
   - install preconditions met
   - host load evidence observed (from CEP logs/signals)
4. **Add one high-value host-load diagnostic pass** in readiness helper to parse recent CEP logs for FastLoop manifest/script load errors.
5. **Tighten first-run defaults and messages** (`panel/src/state.ts`, installer/readiness wording) to remove misleading local assumptions.
6. **Advance signing milestone** to reduce real-world panel visibility variance.

## 8) Next single best milestone

**Milestone: “Host Load Proof” diagnostics (install-ready -> load-verified).**

Implement one focused milestone that augments existing install/readiness tooling to gather and summarize **actual CEP load evidence** from host logs for PPRO/AEFT (manifest discovered, ScriptPath executed, runtime errors surfaced). This is highest leverage because your core unresolved problem is no longer file-copy/install mechanics—it is the gap between “installed” and “visible/loaded.”
