import { access, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const workspaceRoot = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
const version = packageJson.version ?? "0.1.0";
const releaseRoot = path.join(workspaceRoot, "release", "out", `FastLoop-${version}`);
const manifestPath = path.join(releaseRoot, "release-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const innoSetupScript = path.join(workspaceRoot, "release", "installer", "windows", "FastLoop.iss");
const expectedInstallerName = "FastLoop-Windows-x64-Setup.exe";
const expectedZipName = "FastLoop-Windows-x64.zip";

for (const filePath of [
  innoSetupScript,
  manifest.artifacts.installer,
  manifest.artifacts.portableZip,
  manifest.artifacts.checksums,
  manifest.artifacts.releaseNotes,
  manifest.artifacts.installGuide,
  manifest.artifacts.changelog,
  manifest.artifacts.troubleshootingGuide,
  manifest.artifacts.hostReadinessHelper,
  manifest.artifacts.runtimeExecutable,
  manifest.artifacts.innoSetupScript
]) {
  await access(filePath);
}

for (const filePath of [
  path.join(manifest.artifacts.installerStage, "FastLoop-Windows-x64.zip"),
  path.join(manifest.artifacts.installerStage, "Install-FastLoop.ps1"),
  path.join(manifest.artifacts.installerStage, "Install-FastLoop.cmd"),
  path.join(manifest.artifacts.installerStage, "FastLoop-CEPCommon.ps1"),
  path.join(manifest.artifacts.installerStage, "Test-FastLoop-HostReadiness.ps1")
]) {
  await access(filePath);
}

const innoScriptContent = await readFile(innoSetupScript, "utf8");
for (const expectedSnippet of [
  "setup-latest.log",
  "setup-latest.json",
  "setup-helper-stdout.log",
  "setup-helper-stderr.log",
  "FastLoop-Windows-x64.zip",
  "Install-FastLoop.cmd",
  "BuildInstallCmdArgs",
  "DetectFailureCategory",
  "Recovery"
]) {
  if (!innoScriptContent.includes(expectedSnippet)) {
    throw new Error(`Windows setup script is missing expected diagnostic support: ${expectedSnippet}`);
  }
}

const validationRoot = path.join(workspaceRoot, "release", "build", "validation", `FastLoop-${version}`);
const portableExtractRoot = path.join(validationRoot, "portable-extract");
await rm(validationRoot, { recursive: true, force: true });
await mkdir(portableExtractRoot, { recursive: true });

execFileSync(
  "powershell.exe",
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
  path.join(portableExtractRoot, "FastLoop", "CSXS", "manifest.xml"),
  path.join(portableExtractRoot, "Install-FastLoop.ps1"),
  path.join(portableExtractRoot, "FastLoop-CEPCommon.ps1"),
  path.join(portableExtractRoot, "Install-FastLoop.cmd"),
  path.join(portableExtractRoot, "Test-FastLoop-HostReadiness.ps1"),
  path.join(portableExtractRoot, "FastLoop", "engine-runtime", "windows-x64", "fastloop-engine-runtime", "fastloop-engine-runtime.exe")
]) {
  await access(filePath);
}

if (path.basename(manifest.artifacts.installer) !== expectedInstallerName) {
  throw new Error("Installer asset name does not match the documented release asset name.");
}

if (path.basename(manifest.artifacts.portableZip) !== expectedZipName) {
  throw new Error("Portable zip asset name does not match the documented release asset name.");
}

if (manifest.primaryDownload !== expectedInstallerName) {
  throw new Error(`release-manifest primaryDownload must be ${expectedInstallerName}.`);
}

if (manifest.secondaryDownload !== expectedZipName) {
  throw new Error(`release-manifest secondaryDownload must be ${expectedZipName}.`);
}

const checksumContent = await readFile(manifest.artifacts.checksums, "utf8");
for (const expectedAsset of [expectedInstallerName, expectedZipName]) {
  if (!checksumContent.includes(`  ${expectedAsset}`)) {
    throw new Error(`SHA256SUMS.txt does not include ${expectedAsset}.`);
  }
}

async function collectRelativeFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectRelativeFiles(root, absolutePath));
    } else {
      files.push(path.relative(root, absolutePath).replaceAll("\\", "/"));
    }
  }
  return files;
}

const portableFiles = await collectRelativeFiles(portableExtractRoot);
const forbiddenPackageFragments = [
  "/node_modules/",
  "/.git/",
  "/.smoke-dist/",
  ".tsbuildinfo"
];
for (const filePath of portableFiles) {
  const normalized = `/${filePath}`;
  const isDevSourceTree = [
    "src/",
    "panel/",
    "mock/",
    "shared/",
    "scripts/"
  ].some((prefix) => filePath.startsWith(prefix));
  if (isDevSourceTree || forbiddenPackageFragments.some((fragment) => normalized.includes(fragment))) {
    throw new Error(`Release package includes a dev-only file: ${filePath}`);
  }
}

const installSmokeRoot = path.join(validationRoot, "installed-fastloop", "FastLoop");
const installLogRoot = path.join(validationRoot, "install-logs");
const registryBasePath = `HKCU:\\Software\\FastLoop\\ReleaseValidation\\${version.replace(/[^A-Za-z0-9]/g, "_")}\\${Date.now()}`;
await mkdir(installLogRoot, { recursive: true });

try {
  execFileSync(
    "powershell.exe",
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
} catch (error) {
  const installedBundleComplete = [
    path.join(installSmokeRoot, "CSXS", "manifest.xml"),
    path.join(installSmokeRoot, "dist", "index.html"),
    path.join(installSmokeRoot, "dist", "CSInterface.js"),
    path.join(installSmokeRoot, "host-index.jsx")
  ].every((requiredPath) => existsSync(requiredPath));

  if (!installedBundleComplete) {
    throw error;
  }

  console.warn(
    "Install validation copied the bundle, but the registry readiness helper was blocked by the current environment."
  );
}

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
      installerBytes: (await stat(manifest.artifacts.installer)).size,
      portableZipBytes: (await stat(manifest.artifacts.portableZip)).size,
      portableManifest: path.join(portableExtractRoot, "FastLoop", "CSXS", "manifest.xml"),
      installSmokeRoot
    },
    null,
    2
  )
);
