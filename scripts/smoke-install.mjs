import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";

const workspaceRoot = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
const version = packageJson.version ?? "0.0.0";
const releaseRoot = path.join(workspaceRoot, "release", "out", `FastLoop-${version}`);
const portableRoot = path.join(releaseRoot, "FastLoop-Windows-x64");
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
const registryBasePath = `HKCU:\\Software\\FastLoop\\InstallSmoke\\${version.replace(/[^A-Za-z0-9]/g, "_")}`;
const envOverrides = {
  ...process.env,
  FASTLOOP_CEP_PER_USER_ROOT: currentUserRoot,
  FASTLOOP_CEP_SYSTEM_ROOTS: `${systemRootA};${systemRootB}`
};

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

await rm(validationRoot, { recursive: true, force: true });
await mkdir(logRoot, { recursive: true });
await mkdir(failureLogRoot, { recursive: true });
await mkdir(allUsersLogRoot, { recursive: true });
await mkdir(conflictLogRoot, { recursive: true });

for (const filePath of [installScript, readinessScript, path.join(portableRoot, "FastLoop", "CSXS", "manifest.xml")]) {
  await access(filePath);
}

execFileSync(
  "powershell",
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

const readiness = execFileSync(
  "powershell",
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

execFileSync(
  "powershell",
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
  "powershell",
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
  "powershell",
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

console.log(
  JSON.stringify(
    {
      version,
      installRoot,
      allUsersInstallRoot,
      readiness: readiness.trim(),
      conflictExitCode: conflictReadiness.status,
      failureExitCode: failedInstall.status
    },
    null,
    2
  )
);
