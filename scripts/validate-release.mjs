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
  path.join(installerExtractRoot, "FastLoop-Windows-x64.zip"),
  path.join(portableExtractRoot, "FastLoop", "CSXS", "manifest.xml"),
  path.join(portableExtractRoot, "Install-FastLoop.ps1"),
  path.join(portableExtractRoot, "Install-FastLoop.cmd"),
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

console.log(
  JSON.stringify(
    {
      version,
      releaseRoot,
      installer: manifest.artifacts.installer,
      portableZip: manifest.artifacts.portableZip,
      portableManifest: path.join(portableExtractRoot, "FastLoop", "CSXS", "manifest.xml")
    },
    null,
    2
  )
);
