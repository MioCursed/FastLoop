import { access, mkdir, readFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const workspaceRoot = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
const version = packageJson.version ?? "0.1.0";
const releaseRoot = path.join(workspaceRoot, "release", "out", `FastLoop-${version}`);
const manifestPath = path.join(releaseRoot, "release-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

for (const filePath of [
  manifest.artifacts.installer,
  manifest.artifacts.portableZip,
  manifest.artifacts.checksums,
  manifest.artifacts.releaseNotes,
  manifest.artifacts.installGuide,
  manifest.artifacts.changelog,
  manifest.artifacts.troubleshootingGuide,
  manifest.artifacts.hostReadinessHelper,
  manifest.artifacts.runtimeExecutable
]) {
  await access(filePath);
}

const validationRoot = path.join(workspaceRoot, "release", "build", "validation", `FastLoop-${version}`);
const installerExtractRoot = path.join(validationRoot, "installer-extract");
const portableExtractRoot = path.join(validationRoot, "portable-extract");
await rm(validationRoot, { recursive: true, force: true });
await mkdir(installerExtractRoot, { recursive: true });
await mkdir(portableExtractRoot, { recursive: true });

execFileSync(
  manifest.artifacts.installer,
  ["/Q", `/T:${installerExtractRoot}`, "/C"],
  {
    cwd: workspaceRoot,
    stdio: "inherit"
  }
);

execFileSync(
  "powershell",
  [
    "-NoProfile",
    "-Command",
    `Expand-Archive -Path '${manifest.artifacts.portableZip}' -DestinationPath '${portableExtractRoot}' -Force`
  ],
  {
    cwd: workspaceRoot,
    stdio: "inherit"
  }
);

for (const filePath of [
  path.join(installerExtractRoot, "Install-FastLoop.ps1"),
  path.join(installerExtractRoot, "Install-FastLoop.cmd"),
  path.join(installerExtractRoot, "FastLoop-CEPCommon.ps1"),
  path.join(installerExtractRoot, "FastLoop-Windows-x64.zip"),
  path.join(portableExtractRoot, "FastLoop", "CSXS", "manifest.xml"),
  path.join(portableExtractRoot, "Install-FastLoop.ps1"),
  path.join(portableExtractRoot, "FastLoop-CEPCommon.ps1"),
  path.join(portableExtractRoot, "Install-FastLoop.cmd"),
  path.join(portableExtractRoot, "Test-FastLoop-HostReadiness.ps1"),
  path.join(portableExtractRoot, "FastLoop", "engine-runtime", "windows-x64", "fastloop-engine-runtime", "fastloop-engine-runtime.exe")
]) {
  await access(filePath);
}

if (path.basename(manifest.artifacts.installer) !== "FastLoop-Windows-x64-Setup.exe") {
  throw new Error("Installer asset name does not match the documented release asset name.");
}

if (path.basename(manifest.artifacts.portableZip) !== "FastLoop-Windows-x64.zip") {
  throw new Error("Portable zip asset name does not match the documented release asset name.");
}

const installSmokeRoot = path.join(validationRoot, "installed-fastloop", "FastLoop");
const installLogRoot = path.join(validationRoot, "install-logs");
const registryBasePath = `HKCU:\\Software\\FastLoop\\ReleaseValidation\\${version.replace(/[^A-Za-z0-9]/g, "_")}`;
await mkdir(installLogRoot, { recursive: true });

execFileSync(
  "powershell",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(portableExtractRoot, "Install-FastLoop.ps1"),
    "-BundleDirectory",
    path.join(portableExtractRoot, "FastLoop"),
    "-InstallRoot",
    installSmokeRoot,
    "-RegistryBasePath",
    registryBasePath,
    "-LogDirectory",
    installLogRoot
  ],
  {
    cwd: workspaceRoot,
    stdio: "inherit"
  }
);

for (const filePath of [
  path.join(installSmokeRoot, "CSXS", "manifest.xml"),
  path.join(installSmokeRoot, "dist", "index.html"),
  path.join(installSmokeRoot, "install-verification.json"),
  path.join(installLogRoot, "install-latest.json"),
  path.join(installLogRoot, "install-latest.log")
]) {
  await access(filePath);
}

console.log(
  JSON.stringify(
    {
      version,
      releaseRoot,
      installer: manifest.artifacts.installer,
      portableZip: manifest.artifacts.portableZip,
      portableManifest: path.join(portableExtractRoot, "FastLoop", "CSXS", "manifest.xml"),
      installSmokeRoot
    },
    null,
    2
  )
);
