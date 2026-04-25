import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";

const workspaceRoot = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
const version = packageJson.version ?? "0.0.0";
const releaseRoot = path.join(workspaceRoot, "release", "out", `FastLoop-${version}`);
const portableRoot = path.join(releaseRoot, "FastLoop-Windows-x64");
const installerExe = path.join(releaseRoot, "FastLoop-Windows-x64-Setup.exe");
const installScript = path.join(portableRoot, "Install-FastLoop.ps1");
const readinessScript = path.join(portableRoot, "Test-FastLoop-HostReadiness.ps1");
const validationRoot = path.join(workspaceRoot, "release", "build", "install-smoke", `FastLoop-${version}`);
const currentUserRoot = path.join(validationRoot, "current-user", "CEP", "extensions");
const systemRootA = path.join(validationRoot, "all-users-a", "Common Files", "Adobe", "CEP", "extensions");
const systemRootB = path.join(validationRoot, "all-users-b", "Common Files", "Adobe", "CEP", "extensions");
const installRoot = path.join(currentUserRoot, "FastLoop");
const allUsersInstallRoot = path.join(systemRootA, "FastLoop");
const logRoot = path.join(validationRoot, "logs");
const failureLogRoot = path.join(validationRoot, "logs-failure");
const allUsersLogRoot = path.join(validationRoot, "logs-allusers");
const conflictLogRoot = path.join(validationRoot, "logs-conflict");
const missingPayloadLogRoot = path.join(validationRoot, "logs-missing-payload");
const missingHelperLogRoot = path.join(validationRoot, "logs-missing-helper");
const registryFailureLogRoot = path.join(validationRoot, "logs-registry-failure");
const blockedLogRootParent = path.join(validationRoot, "logs-blocked-file");
const allUsersSkippedLogRoot = path.join(validationRoot, "logs-allusers-skipped");
const registryBasePath = `HKCU:\\Software\\FastLoop\\InstallSmoke\\${version.replace(/[^A-Za-z0-9]/g, "_")}\\${Date.now()}`;
const envOverrides = {
  ...process.env,
  FASTLOOP_CEP_PER_USER_ROOT: currentUserRoot,
  FASTLOOP_CEP_SYSTEM_ROOTS: `${systemRootA};${systemRootB}`,
  FASTLOOP_MOCK_CEP_REGISTRY: "1"
};

const envWithRealRegistry = { ...envOverrides };
delete envWithRealRegistry.FASTLOOP_MOCK_CEP_REGISTRY;

const parseJsonReport = async (filePath) => {
  const content = await readFile(filePath, "utf8");
  const normalizedContent = content.replace(/^\uFEFF/, "");
  try {
    return JSON.parse(normalizedContent);
  } catch (error) {
    throw new Error(`Invalid JSON report at ${filePath}: ${error.message}`);
  }
};

const assertField = (condition, filePath, fieldPath, message) => {
  if (!condition) {
    throw new Error(`Assertion failed for ${filePath} at "${fieldPath}": ${message}`);
  }
};

const toStaleManifestVersion = (manifestVersion) => {
  if (typeof manifestVersion !== "string" || manifestVersion.trim() === "") {
    return "0.0.0.0";
  }

  const segments = manifestVersion.split(".").map((segment) => Number.parseInt(segment, 10));
  if (segments.some((segment) => Number.isNaN(segment))) {
    return "0.0.0.0";
  }

  const staleSegments = [...segments];
  for (let index = staleSegments.length - 1; index >= 0; index -= 1) {
    if (staleSegments[index] > 0) {
      staleSegments[index] -= 1;
      return staleSegments.join(".");
    }
  }

  return `${manifestVersion}.0`;
};

const normalizePathForCompare = (value) => String(value ?? "").replaceAll("\\", "/").toLowerCase();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await rm(validationRoot, { recursive: true, force: true });
await mkdir(logRoot, { recursive: true });
await mkdir(failureLogRoot, { recursive: true });
await mkdir(allUsersLogRoot, { recursive: true });
await mkdir(conflictLogRoot, { recursive: true });
await mkdir(missingPayloadLogRoot, { recursive: true });
await mkdir(missingHelperLogRoot, { recursive: true });
await mkdir(registryFailureLogRoot, { recursive: true });
await mkdir(allUsersSkippedLogRoot, { recursive: true });

for (const filePath of [installerExe, installScript, readinessScript, path.join(portableRoot, "FastLoop", "CSXS", "manifest.xml")]) {
  await access(filePath);
}

execFileSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    installScript,
    "-BundleDirectory",
    path.join(portableRoot, "FastLoop"),
    "-InstallRoot",
    installRoot,
    "-InstallScope",
    "Auto",
    "-RegistryBasePath",
    registryBasePath,
    "-LogDirectory",
    logRoot
  ],
  {
    cwd: workspaceRoot,
    stdio: "inherit",
    env: envOverrides
  }
);

for (const filePath of [
  path.join(installRoot, "CSXS", "manifest.xml"),
  path.join(installRoot, "dist", "index.html"),
  path.join(installRoot, "host-index.jsx"),
  path.join(installRoot, "install-verification.json"),
  path.join(logRoot, "install-latest.json"),
  path.join(logRoot, "install-latest.log")
]) {
  await access(filePath);
}

const installReportPath = path.join(logRoot, "install-latest.json");
const installReport = await parseJsonReport(installReportPath);
const installedRegistryVersions = Array.isArray(installReport.registryAfter)
  ? installReport.registryAfter.map((entry) => String(entry?.CsxsVersion ?? ""))
  : [];
for (const csxsVersion of ["11", "12", "13"]) {
  assertField(
    installedRegistryVersions.includes(csxsVersion),
    installReportPath,
    `registryAfter[CsxsVersion=${csxsVersion}]`,
    "Expected installer readiness logs to include this CEP PlayerDebugMode generation."
  );
}

const blockedSystemRootA = path.join(validationRoot, "blocked-system-a");
const blockedSystemRootB = path.join(validationRoot, "blocked-system-b");
await writeFile(blockedSystemRootA, "not a directory", "utf8");
await writeFile(blockedSystemRootB, "not a directory", "utf8");
const allUsersSkippedRoot = path.join(validationRoot, "current-user-skipped", "CEP", "extensions");
execFileSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    installScript,
    "-BundleDirectory",
    path.join(portableRoot, "FastLoop"),
    "-InstallScope",
    "Auto",
    "-RegistryBasePath",
    `${registryBasePath}\\AllUsersSkipped`,
    "-LogDirectory",
    allUsersSkippedLogRoot
  ],
  {
    cwd: workspaceRoot,
    stdio: "inherit",
    env: {
      ...envOverrides,
      FASTLOOP_CEP_PER_USER_ROOT: allUsersSkippedRoot,
      FASTLOOP_CEP_SYSTEM_ROOTS: `${blockedSystemRootA};${blockedSystemRootB}`
    }
  }
);

const allUsersSkippedReportPath = path.join(allUsersSkippedLogRoot, "install-latest.json");
await access(allUsersSkippedReportPath);
const allUsersSkippedReport = await parseJsonReport(allUsersSkippedReportPath);
assertField(
  allUsersSkippedReport.readiness?.currentUserInstalled === true,
  allUsersSkippedReportPath,
  "readiness.currentUserInstalled",
  "Expected CurrentUser install to succeed when optional AllUsers roots are not writable."
);
assertField(
  Array.isArray(allUsersSkippedReport.installAttempts) &&
    allUsersSkippedReport.installAttempts.some((entry) => entry?.Scope === "AllUsers" && entry?.Writable === false),
  allUsersSkippedReportPath,
  "installAttempts[Scope=AllUsers].Writable",
  "Expected smoke coverage for skipped non-writable AllUsers roots."
);

await delay(1500);
const readiness = execFileSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    readinessScript,
    "-InstallRoot",
    installRoot,
    "-InstallScope",
    "Auto",
    "-RegistryBasePath",
    registryBasePath,
    "-LogDirectory",
    logRoot
  ],
  {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: envOverrides
  }
);

const readinessReportPath = path.join(logRoot, "host-readiness-latest.json");
await access(readinessReportPath);
const readinessReport = await parseJsonReport(readinessReportPath);
const healthyHostReadiness = Array.isArray(readinessReport.hostReadiness) ? readinessReport.hostReadiness : [];
const healthyPpro = healthyHostReadiness.find((entry) => entry?.HostName === "PPRO");
const healthyAeft = healthyHostReadiness.find((entry) => entry?.HostName === "AEFT");
const readinessRegistryVersions = Array.isArray(readinessReport.registryState)
  ? readinessReport.registryState.map((entry) => String(entry?.CsxsVersion ?? ""))
  : [];

assertField(
  Boolean(healthyPpro),
  readinessReportPath,
  "hostReadiness[HostName=PPRO]",
  "Missing host readiness entry for PPRO."
);
assertField(
  Boolean(healthyAeft),
  readinessReportPath,
  "hostReadiness[HostName=AEFT]",
  "Missing host readiness entry for AEFT."
);
assertField(
  healthyPpro?.CoveredByManifest === true,
  readinessReportPath,
  "hostReadiness[HostName=PPRO].CoveredByManifest",
  `Expected true, received ${String(healthyPpro?.CoveredByManifest)}.`
);
assertField(
  healthyAeft?.CoveredByManifest === true,
  readinessReportPath,
  "hostReadiness[HostName=AEFT].CoveredByManifest",
  `Expected true, received ${String(healthyAeft?.CoveredByManifest)}.`
);
assertField(
  Array.isArray(readinessReport.higherPriorityConflicts),
  readinessReportPath,
  "higherPriorityConflicts",
  "Expected an array."
);
assertField(
  readinessReport.higherPriorityConflicts.length === 0,
  readinessReportPath,
  "higherPriorityConflicts",
  `Expected empty array in healthy scenario, found ${readinessReport.higherPriorityConflicts.length} entr${readinessReport.higherPriorityConflicts.length === 1 ? "y" : "ies"}.`
);
for (const csxsVersion of ["11", "12", "13"]) {
  assertField(
    readinessRegistryVersions.includes(csxsVersion),
    readinessReportPath,
    `registryState[CsxsVersion=${csxsVersion}]`,
    "Expected readiness report to include this CEP PlayerDebugMode generation."
  );
}

execFileSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    installScript,
    "-BundleDirectory",
    path.join(portableRoot, "FastLoop"),
    "-InstallScope",
    "AllUsers",
    "-RegistryBasePath",
    `${registryBasePath}\\AllUsers`,
    "-LogDirectory",
    allUsersLogRoot
  ],
  {
    cwd: workspaceRoot,
    stdio: "inherit",
    env: envOverrides
  }
);

await access(path.join(allUsersLogRoot, "install-latest.json"));
for (const filePath of [
  path.join(allUsersInstallRoot, "CSXS", "manifest.xml"),
  path.join(allUsersInstallRoot, "install-verification.json")
]) {
  await access(filePath);
}

const staleConflictRoot = path.join(systemRootB, "FastLoop");
await mkdir(path.join(staleConflictRoot, "CSXS"), { recursive: true });
await mkdir(path.join(staleConflictRoot, "dist"), { recursive: true });
await mkdir(path.join(staleConflictRoot, "host-premiere", "jsx"), { recursive: true });
await mkdir(path.join(staleConflictRoot, "host-aftereffects", "jsx"), { recursive: true });
await mkdir(path.join(staleConflictRoot, "engine-runtime", "windows-x64", "fastloop-engine-runtime"), {
  recursive: true
});
const staleManifest = await readFile(path.join(portableRoot, "FastLoop", "CSXS", "manifest.xml"), "utf8");
const manifestVersionMatch = staleManifest.match(/ExtensionBundleVersion="([^"]+)"/);
assertField(
  Boolean(manifestVersionMatch?.[1]),
  path.join(portableRoot, "FastLoop", "CSXS", "manifest.xml"),
  "ExtensionBundleVersion",
  "Unable to determine manifest version for stale conflict fixture."
);
const staleVersion = toStaleManifestVersion(manifestVersionMatch[1]);
await writeFile(
  path.join(staleConflictRoot, "CSXS", "manifest.xml"),
  staleManifest.replace(/ExtensionBundleVersion="[^"]+"/, `ExtensionBundleVersion="${staleVersion}"`),
  "utf8"
);
await writeFile(path.join(staleConflictRoot, "dist", "index.html"), "<html></html>", "utf8");
await writeFile(path.join(staleConflictRoot, "host-index.jsx"), "// stale", "utf8");
await writeFile(path.join(staleConflictRoot, "host-premiere", "jsx", "fastloop_premiere.jsx"), "// stale", "utf8");
await writeFile(path.join(staleConflictRoot, "host-aftereffects", "jsx", "fastloop_aftereffects.jsx"), "// stale", "utf8");
await writeFile(
  path.join(staleConflictRoot, "engine-runtime", "windows-x64", "fastloop-engine-runtime", "fastloop-engine-runtime.exe"),
  "stale",
  "utf8"
);

const conflictReadiness = spawnSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    readinessScript,
    "-InstallScope",
    "CurrentUser",
    "-RegistryBasePath",
    registryBasePath,
    "-LogDirectory",
    conflictLogRoot
  ],
  {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: envOverrides
  }
);

if (conflictReadiness.status === 0) {
  throw new Error("Readiness smoke expected a failure when a stale AllUsers duplicate exists.");
}

await access(path.join(conflictLogRoot, "host-readiness-latest.json"));
const conflictReportPath = path.join(conflictLogRoot, "host-readiness-latest.json");
const conflictReport = await parseJsonReport(conflictReportPath);
assertField(conflictReport.ready === false, conflictReportPath, "ready", "Expected false when stale conflict exists.");
assertField(
  Array.isArray(conflictReport.higherPriorityConflicts),
  conflictReportPath,
  "higherPriorityConflicts",
  "Expected an array explaining conflict cause."
);
assertField(
  conflictReport.higherPriorityConflicts.length > 0,
  conflictReportPath,
  "higherPriorityConflicts",
  "Expected at least one conflict entry explaining stale AllUsers duplicate."
);
const staleConflictEntry = conflictReport.higherPriorityConflicts.find(
  (entry) =>
    entry?.Scope === "AllUsers" &&
    normalizePathForCompare(entry?.BundleRoot) === normalizePathForCompare(staleConflictRoot)
);
assertField(
  Boolean(staleConflictEntry),
  conflictReportPath,
  "higherPriorityConflicts[BundleRoot=staleConflictRoot]",
  "Expected stale AllUsers conflict entry matching the stale fixture bundle root."
);
assertField(
  Boolean(staleConflictEntry?.BundleRoot),
  conflictReportPath,
  "higherPriorityConflicts[BundleRoot=staleConflictRoot].BundleRoot",
  "Expected conflict entry to include BundleRoot cause detail."
);
assertField(
  staleConflictEntry?.ExtensionBundleVersion !== manifestVersionMatch[1],
  conflictReportPath,
  "higherPriorityConflicts[BundleRoot=staleConflictRoot].ExtensionBundleVersion",
  `Expected stale conflict version different from ${String(manifestVersionMatch[1])}, received ${String(staleConflictEntry?.ExtensionBundleVersion)}.`
);
const conflictPpro = (Array.isArray(conflictReport.hostReadiness) ? conflictReport.hostReadiness : []).find(
  (entry) => entry?.HostName === "PPRO"
);
const conflictAeft = (Array.isArray(conflictReport.hostReadiness) ? conflictReport.hostReadiness : []).find(
  (entry) => entry?.HostName === "AEFT"
);
assertField(
  Boolean(conflictPpro),
  conflictReportPath,
  "hostReadiness[HostName=PPRO]",
  "Missing host readiness entry for PPRO in conflict scenario."
);
assertField(
  Boolean(conflictAeft),
  conflictReportPath,
  "hostReadiness[HostName=AEFT]",
  "Missing host readiness entry for AEFT in conflict scenario."
);

const failedInstall = spawnSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    installScript,
    "-BundleDirectory",
    path.join(validationRoot, "missing-bundle"),
    "-InstallRoot",
    path.join(validationRoot, "broken-install", "FastLoop"),
    "-RegistryBasePath",
    `${registryBasePath}\\Failure`,
    "-LogDirectory",
    failureLogRoot
  ],
  {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: envOverrides
  }
);

if (failedInstall.status === 0) {
  throw new Error("Install smoke expected a failure when the bundle directory is missing.");
}

await access(path.join(failureLogRoot, "install-latest.json"));
await access(path.join(failureLogRoot, "install-latest.log"));
const failedInstallReportPath = path.join(failureLogRoot, "install-latest.json");
const failedInstallReport = await parseJsonReport(failedInstallReportPath);
assertField(
  failedInstallReport.category === "verification-failed" || failedInstallReport.category === "unknown-install-helper-failure",
  failedInstallReportPath,
  "category",
  "Expected readable failure category when helper rejects a missing bundle directory."
);

const missingPayloadInstall = spawnSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    installScript,
    "-PayloadZip",
    path.join(validationRoot, "missing", "FastLoop-Windows-x64.zip"),
    "-InstallRoot",
    path.join(validationRoot, "missing-payload-install", "FastLoop"),
    "-RegistryBasePath",
    `${registryBasePath}\\MissingPayload`,
    "-LogDirectory",
    missingPayloadLogRoot
  ],
  {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: envWithRealRegistry
  }
);

if (missingPayloadInstall.status === 0) {
  throw new Error("Install smoke expected a failure when the setup wrapper cannot find the payload zip.");
}

const missingPayloadReportPath = path.join(missingPayloadLogRoot, "install-latest.json");
await access(missingPayloadReportPath);
const missingPayloadReport = await parseJsonReport(missingPayloadReportPath);
assertField(
  missingPayloadReport.category === "missing-payload",
  missingPayloadReportPath,
  "category",
  `Expected missing-payload category, received ${String(missingPayloadReport.category)}.`
);

const missingHelperRoot = path.join(validationRoot, "missing-helper-payload");
await mkdir(missingHelperRoot, { recursive: true });
await cp(installScript, path.join(missingHelperRoot, "Install-FastLoop.ps1"));
const missingHelperInstall = spawnSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(missingHelperRoot, "Install-FastLoop.ps1"),
    "-BundleDirectory",
    path.join(portableRoot, "FastLoop"),
    "-InstallRoot",
    path.join(validationRoot, "missing-helper-install", "FastLoop"),
    "-RegistryBasePath",
    `${registryBasePath}\\MissingHelper`,
    "-LogDirectory",
    missingHelperLogRoot
  ],
  {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: envOverrides
  }
);

if (missingHelperInstall.status === 0) {
  throw new Error("Install smoke expected a failure when the helper support script is missing.");
}

const missingHelperReportPath = path.join(missingHelperLogRoot, "install-latest.json");
await access(missingHelperReportPath);
const missingHelperReport = await parseJsonReport(missingHelperReportPath);
assertField(
  missingHelperReport.category === "helper-bootstrap-failed",
  missingHelperReportPath,
  "category",
  `Expected helper-bootstrap-failed category, received ${String(missingHelperReport.category)}.`
);

const registryFailureInstall = spawnSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    installScript,
    "-BundleDirectory",
    path.join(portableRoot, "FastLoop"),
    "-InstallRoot",
    path.join(validationRoot, "registry-failure-install", "FastLoop"),
    "-RegistryBasePath",
    "ZNOTREG:\\Software\\FastLoop",
    "-LogDirectory",
    registryFailureLogRoot
  ],
  {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: envOverrides
  }
);

if (registryFailureInstall.status === 0) {
  throw new Error("Install smoke expected a failure when registry writes cannot be performed.");
}

const registryFailureReportPath = path.join(registryFailureLogRoot, "install-latest.json");
await access(registryFailureReportPath);
const registryFailureReport = await parseJsonReport(registryFailureReportPath);
assertField(
  registryFailureReport.category === "registry-failed",
  registryFailureReportPath,
  "category",
  `Expected registry-failed category, received ${String(registryFailureReport.category)}.`
);

await writeFile(blockedLogRootParent, "not a directory", "utf8");
const blockedLogInstall = spawnSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    installScript,
    "-BundleDirectory",
    path.join(portableRoot, "FastLoop"),
    "-InstallRoot",
    path.join(validationRoot, "blocked-log-install", "FastLoop"),
    "-RegistryBasePath",
    `${registryBasePath}\\BlockedLog`,
    "-LogDirectory",
    path.join(blockedLogRootParent, "child")
  ],
  {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: envOverrides
  }
);

if (blockedLogInstall.status === 0) {
  throw new Error("Install smoke expected a failure when the log directory cannot be created.");
}

const invalidPathLogRoot = path.join(validationRoot, "logs-invalid-paths");
const invalidPathBundle = path.join(validationRoot, "invalid-path-bundle", "FastLoop");
await mkdir(invalidPathLogRoot, { recursive: true });
await cp(path.join(portableRoot, "FastLoop"), invalidPathBundle, { recursive: true });
const invalidPathManifestPath = path.join(invalidPathBundle, "CSXS", "manifest.xml");
const invalidPathManifest = await readFile(invalidPathManifestPath, "utf8");
await writeFile(
  invalidPathManifestPath,
  invalidPathManifest
    .replace("<MainPath>./dist/index.html</MainPath>", "<MainPath>../dist/index.html</MainPath>")
    .replace("<ScriptPath>./host-index.jsx</ScriptPath>", "<ScriptPath>../host-index.jsx</ScriptPath>"),
  "utf8"
);

const invalidPathInstall = spawnSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    installScript,
    "-BundleDirectory",
    invalidPathBundle,
    "-InstallRoot",
    path.join(validationRoot, "invalid-path-install", "FastLoop"),
    "-RegistryBasePath",
    `${registryBasePath}\\InvalidPaths`,
    "-LogDirectory",
    invalidPathLogRoot
  ],
  {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: envOverrides
  }
);

if (invalidPathInstall.status === 0) {
  throw new Error("Install smoke expected a failure when manifest resource paths escape the bundle.");
}

const invalidPathReportPath = path.join(invalidPathLogRoot, "install-latest.json");
await access(invalidPathReportPath);
const invalidPathReport = await parseJsonReport(invalidPathReportPath);
assertField(
  String(invalidPathReport.error ?? "").includes("MainPath") ||
    String(invalidPathReport.error ?? "").includes("ScriptPath"),
  invalidPathReportPath,
  "error",
  "Expected invalid manifest resource paths to be reported as validation errors."
);

const setupExeRoot = path.join(validationRoot, "setup-exe");
const setupExeSupportDir = path.join(setupExeRoot, "support files");
const setupExeInnoLog = path.join(setupExeRoot, "inno-setup.log");
const setupExeCurrentUserRoot = path.join(setupExeRoot, "current-user", "CEP", "extensions");
const setupExeSystemRoot = path.join(setupExeRoot, "all-users", "Common Files", "Adobe", "CEP", "extensions");
await mkdir(setupExeRoot, { recursive: true });

const setupExeInstall = spawnSync(
  installerExe,
  [
    "/VERYSILENT",
    "/SUPPRESSMSGBOXES",
    "/NORESTART",
    `/DIR=${setupExeSupportDir}`,
    `/LOG=${setupExeInnoLog}`,
    "/TASKS=unsigned"
  ],
  {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      FASTLOOP_CEP_PER_USER_ROOT: setupExeCurrentUserRoot,
      FASTLOOP_CEP_SYSTEM_ROOTS: setupExeSystemRoot,
      FASTLOOP_MOCK_CEP_REGISTRY: "1"
    }
  }
);

const localAppData = process.env.LOCALAPPDATA;
assertField(Boolean(localAppData), "process.env", "LOCALAPPDATA", "Expected LOCALAPPDATA to locate setup wrapper logs.");
const realSetupLogRoot = path.join(localAppData, "FastLoop", "Logs");
const realRecoveryZip = path.join(localAppData, "FastLoop", "Recovery", "FastLoop-Windows-x64.zip");
const realSetupLogPath = path.join(realSetupLogRoot, "setup-latest.log");
const realSetupSummaryPath = path.join(realSetupLogRoot, "setup-latest.json");
const realSetupStdoutPath = path.join(realSetupLogRoot, "setup-helper-stdout.log");
const realSetupStderrPath = path.join(realSetupLogRoot, "setup-helper-stderr.log");

if (setupExeInstall.status !== 0) {
  const setupLogSnippet = await readFile(realSetupLogPath, "utf8").catch(() => "");
  throw new Error(
    `Generated installer EXE smoke failed with exit ${setupExeInstall.status}. ` +
      `stdout=${setupExeInstall.stdout} stderr=${setupExeInstall.stderr} setupLog=${setupLogSnippet.slice(0, 2000)}`
  );
}

for (const filePath of [
  setupExeInnoLog,
  realSetupLogPath,
  realSetupSummaryPath,
  realSetupStdoutPath,
  realSetupStderrPath,
  realRecoveryZip
]) {
  await access(filePath);
}

const setupExeSummary = await parseJsonReport(realSetupSummaryPath);
assertField(setupExeSummary.stage === "succeeded", realSetupSummaryPath, "stage", `Expected generated installer EXE smoke to finish successfully, got ${String(setupExeSummary.stage)}.`);
assertField(setupExeSummary.category === "success", realSetupSummaryPath, "category", `Expected generated installer EXE smoke success category, got ${String(setupExeSummary.category)}.`);
assertField(setupExeSummary.powershellPreflightSucceeded === true, realSetupSummaryPath, "powershellPreflightSucceeded", "Expected PowerShell preflight to pass.");
assertField(setupExeSummary.payloadZipExists === true, realSetupSummaryPath, "payloadZipExists", "Expected setup wrapper to find payload zip.");
assertField(setupExeSummary.installHelperExists === true, realSetupSummaryPath, "installHelperExists", "Expected setup wrapper to find Install-FastLoop.ps1.");
assertField(setupExeSummary.commonHelperExists === true, realSetupSummaryPath, "commonHelperExists", "Expected setup wrapper to find FastLoop-CEPCommon.ps1.");
assertField(setupExeSummary.readinessHelperExists === true, realSetupSummaryPath, "readinessHelperExists", "Expected setup wrapper to find readiness helper.");

const setupExeInstallReportPath = path.join(realSetupLogRoot, "install-latest.json");
await access(setupExeInstallReportPath);
const setupExeInstallReport = await parseJsonReport(setupExeInstallReportPath);
const setupExeInstallTargets = Array.isArray(setupExeInstallReport.installTargets) ? setupExeInstallReport.installTargets : [];
assertField(setupExeInstallTargets.length > 0, setupExeInstallReportPath, "installTargets", "Expected generated installer EXE to report at least one installed target.");
const setupExeInstalledRoot = setupExeInstallTargets[0]?.TargetRoot;
assertField(Boolean(setupExeInstalledRoot), setupExeInstallReportPath, "installTargets[0].TargetRoot", "Expected generated installer EXE to report installed target root.");

for (const filePath of [
  path.join(setupExeInstalledRoot, "CSXS", "manifest.xml"),
  path.join(setupExeInstalledRoot, "dist", "index.html"),
  path.join(setupExeInstalledRoot, "host-index.jsx"),
  path.join(setupExeInstalledRoot, "install-verification.json")
]) {
  await access(filePath);
}

const setupLogText = await readFile(realSetupLogPath, "utf8");
assertField(!/\{[01]\}|%s|\b(undefined|null)\b/i.test(setupLogText), realSetupLogPath, "content", "Setup wrapper log contains unresolved placeholder text.");

console.log(
  JSON.stringify(
    {
      version,
      installRoot,
      allUsersInstallRoot,
      readiness: readiness.trim(),
      conflictExitCode: conflictReadiness.status,
      failureExitCode: failedInstall.status,
      missingPayloadExitCode: missingPayloadInstall.status,
      missingHelperExitCode: missingHelperInstall.status,
      registryFailureExitCode: registryFailureInstall.status,
      blockedLogExitCode: blockedLogInstall.status,
      invalidPathExitCode: invalidPathInstall.status,
      setupExeExitCode: setupExeInstall.status,
      setupExeSupportDir,
      setupExeInnoLog,
      setupExeLog: realSetupLogPath,
      setupExeRecoveryZip: realRecoveryZip
    },
    null,
    2
  )
);
