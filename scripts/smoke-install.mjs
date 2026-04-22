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
await writeFile(path.join(staleConflictRoot, "CSXS", "manifest.xml"), staleManifest.replaceAll("0.1.1.2", "0.1.0.0"), "utf8");
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
