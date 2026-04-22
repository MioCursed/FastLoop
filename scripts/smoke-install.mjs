import { access, mkdir, readFile, rm } from "node:fs/promises";
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
const installRoot = path.join(validationRoot, "CEP", "extensions", "FastLoop");
const logRoot = path.join(validationRoot, "logs");
const failureLogRoot = path.join(validationRoot, "logs-failure");
const registryBasePath = `HKCU:\\Software\\FastLoop\\InstallSmoke\\${version.replace(/[^A-Za-z0-9]/g, "_")}`;

await rm(validationRoot, { recursive: true, force: true });
await mkdir(logRoot, { recursive: true });
await mkdir(failureLogRoot, { recursive: true });

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
    "-RegistryBasePath",
    registryBasePath,
    "-LogDirectory",
    logRoot
  ],
  {
    cwd: workspaceRoot,
    stdio: "inherit"
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
    "-RegistryBasePath",
    registryBasePath,
    "-LogDirectory",
    logRoot
  ],
  {
    cwd: workspaceRoot,
    encoding: "utf8"
  }
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
    encoding: "utf8"
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
      readiness: readiness.trim(),
      failureExitCode: failedInstall.status
    },
    null,
    2
  )
);
