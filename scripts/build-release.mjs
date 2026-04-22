import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const workspaceRoot = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
const version = packageJson.version ?? "0.1.0";
const cepManifestVersion = toCepManifestVersion(version);

const releaseRoot = path.join(workspaceRoot, "release", "out", `FastLoop-${version}`);
const portableRoot = path.join(releaseRoot, "FastLoop-Windows-x64");
const extensionRoot = path.join(portableRoot, "FastLoop");
const portableZipPath = path.join(releaseRoot, "FastLoop-Windows-x64.zip");
const installerPath = path.join(releaseRoot, "FastLoop-Windows-x64-Setup.exe");
const checksumsPath = path.join(releaseRoot, "SHA256SUMS.txt");
const releaseNotesPath = path.join(releaseRoot, "release-notes.md");
const assetListPath = path.join(releaseRoot, "asset-list.txt");
const runtimeSourceRoot = path.join(workspaceRoot, "release", "build", "runtime", "windows-x64");
const runtimeExecutable = path.join(
  runtimeSourceRoot,
  "fastloop-engine-runtime",
  "fastloop-engine-runtime.exe"
);
const installerStageRoot = path.join(workspaceRoot, "release", "build", "installer", `FastLoop-${version}`);
const templateRoot = path.join(workspaceRoot, "release", "templates", "windows");

const requiredSources = [
  path.join(workspaceRoot, "panel", "dist", "index.html"),
  path.join(workspaceRoot, "panel", "CSXS", "manifest.xml"),
  path.join(workspaceRoot, "panel", "host-index.jsx"),
  path.join(workspaceRoot, "host-premiere", "jsx", "fastloop_premiere.jsx"),
  path.join(workspaceRoot, "host-aftereffects", "jsx", "fastloop_aftereffects.jsx"),
  path.join(workspaceRoot, "INSTALL.md"),
  path.join(workspaceRoot, "README.md"),
  path.join(workspaceRoot, "CHANGELOG.md"),
  path.join(workspaceRoot, "release", "TROUBLESHOOTING.md"),
  path.join(workspaceRoot, "release", "README.md"),
  path.join(workspaceRoot, "release", "CHECKLIST.md"),
  path.join(workspaceRoot, "release", "release-notes-template.md"),
  path.join(workspaceRoot, "release", "SIGNING.md"),
  path.join(templateRoot, "FastLoop-CEPCommon.ps1"),
  path.join(templateRoot, "Install-FastLoop.ps1"),
  path.join(templateRoot, "Install-FastLoop.cmd"),
  path.join(templateRoot, "Test-FastLoop-HostReadiness.ps1")
];

for (const source of requiredSources) {
  if (!existsSync(source)) {
    throw new Error(`Release build requires existing asset: ${source}`);
  }
}

if (!existsSync(runtimeExecutable)) {
  throw new Error(
    `Release build requires the packaged runtime executable. Run npm run build:engine-runtime first. Missing: ${runtimeExecutable}`
  );
}

function runPowerShell(command) {
  execFileSync(
    "powershell",
    ["-NoProfile", "-Command", command],
    {
      cwd: workspaceRoot,
      stdio: "inherit"
    }
  );
}

function renderPortableInstallScript(template, currentVersion) {
  return template.replaceAll("__FASTLOOP_VERSION__", currentVersion);
}

function toCepManifestVersion(currentVersion) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z-]+(?:\.(\d+))?)?/.exec(currentVersion);
  if (!match) {
    throw new Error(`Unsupported package version for CEP manifest normalization: ${currentVersion}`);
  }

  const [, major, minor, patch, prereleaseNumber] = match;
  return prereleaseNumber ? `${major}.${minor}.${patch}.${prereleaseNumber}` : `${major}.${minor}.${patch}`;
}

function renderManifest(manifestSource, currentVersion) {
  return manifestSource
    .replace(/ExtensionBundleVersion="[^"]+"/, `ExtensionBundleVersion="${toCepManifestVersion(currentVersion)}"`)
    .replace(
      /<Extension Id="com\.fastloop\.panel\.main" Version="[^"]+"/,
      `<Extension Id="com.fastloop.panel.main" Version="${toCepManifestVersion(currentVersion)}"`
    );
}

function renderReleaseNotes(template, currentVersion) {
  return template.replaceAll("__VERSION__", currentVersion);
}

function createInstallerBatch() {
  return [
    "@echo off",
    "setlocal",
    'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-FastLoop.ps1" -PayloadZip "%~dp0FastLoop-Windows-x64.zip"',
    "exit /b %ERRORLEVEL%"
  ].join("\r\n");
}

function createSedFile({
  friendlyName,
  targetName,
  sourceRoot
}) {
  return [
    "[Version]",
    "Class=IEXPRESS",
    "SEDVersion=3",
    "[Options]",
    "PackagePurpose=InstallApp",
    "ShowInstallProgramWindow=1",
    "HideExtractAnimation=1",
    "UseLongFileName=1",
    "InsideCompressed=0",
    "CAB_FixedSize=0",
    "CAB_ResvCodeSigning=0",
    "RebootMode=I",
    "InstallPrompt=",
    "DisplayLicense=",
    "FinishMessage=FastLoop install command has completed. Review the console output and install log for verification details.",
    `TargetName=${targetName}`,
    `FriendlyName=${friendlyName}`,
    "AppLaunched=Install-FastLoop.cmd",
    "PostInstallCmd=<None>",
    "AdminQuietInstCmd=Install-FastLoop.cmd",
    "UserQuietInstCmd=Install-FastLoop.cmd",
    "SourceFiles=SourceFiles",
    "[Strings]",
    'FILE0="FastLoop-Windows-x64.zip"',
    'FILE1="Install-FastLoop.ps1"',
    'FILE2="Install-FastLoop.cmd"',
    'FILE3="FastLoop-CEPCommon.ps1"',
    "[SourceFiles]",
    `SourceFiles0=${sourceRoot}\\`,
    "[SourceFiles0]",
    "%FILE0%=",
    "%FILE1%=",
    "%FILE2%=",
    "%FILE3%="
  ].join("\r\n");
}

async function sha256(filePath) {
  const fileBuffer = await readFile(filePath);
  return createHash("sha256").update(fileBuffer).digest("hex");
}

await rm(releaseRoot, { recursive: true, force: true });
await rm(installerStageRoot, { recursive: true, force: true });
await mkdir(extensionRoot, { recursive: true });
await mkdir(installerStageRoot, { recursive: true });

await mkdir(path.join(extensionRoot, "CSXS"), { recursive: true });
const manifestTemplate = await readFile(path.join(workspaceRoot, "panel", "CSXS", "manifest.xml"), "utf8");
await writeFile(path.join(extensionRoot, "CSXS", "manifest.xml"), renderManifest(manifestTemplate, version), "utf8");
await cp(path.join(workspaceRoot, "panel", "dist"), path.join(extensionRoot, "dist"), { recursive: true });
await cp(path.join(workspaceRoot, "panel", "host-index.jsx"), path.join(extensionRoot, "host-index.jsx"));
await cp(path.join(workspaceRoot, "host-premiere"), path.join(extensionRoot, "host-premiere"), { recursive: true });
await cp(path.join(workspaceRoot, "host-aftereffects"), path.join(extensionRoot, "host-aftereffects"), { recursive: true });

const runtimeTargetRoot = path.join(extensionRoot, "engine-runtime", "windows-x64");
await mkdir(path.dirname(runtimeTargetRoot), { recursive: true });
runPowerShell(`Copy-Item -Path '${runtimeSourceRoot}' -Destination '${runtimeTargetRoot}' -Recurse -Force`);

const portableInstallTemplate = await readFile(path.join(templateRoot, "Install-FastLoop.ps1"), "utf8");
await writeFile(
  path.join(portableRoot, "Install-FastLoop.ps1"),
  renderPortableInstallScript(portableInstallTemplate, version),
  "utf8"
);
const commonTemplate = await readFile(path.join(templateRoot, "FastLoop-CEPCommon.ps1"), "utf8");
await writeFile(path.join(portableRoot, "FastLoop-CEPCommon.ps1"), commonTemplate, "utf8");
await cp(path.join(templateRoot, "Install-FastLoop.cmd"), path.join(portableRoot, "Install-FastLoop.cmd"));
const readinessTemplate = await readFile(path.join(templateRoot, "Test-FastLoop-HostReadiness.ps1"), "utf8");
await writeFile(
  path.join(portableRoot, "Test-FastLoop-HostReadiness.ps1"),
  renderPortableInstallScript(readinessTemplate, version),
  "utf8"
);
await cp(path.join(workspaceRoot, "INSTALL.md"), path.join(portableRoot, "INSTALL.md"));
await cp(path.join(workspaceRoot, "CHANGELOG.md"), path.join(portableRoot, "CHANGELOG.md"));
await cp(path.join(workspaceRoot, "release", "TROUBLESHOOTING.md"), path.join(portableRoot, "TROUBLESHOOTING.md"));

await cp(path.join(workspaceRoot, "INSTALL.md"), path.join(releaseRoot, "INSTALL.md"));
await cp(path.join(workspaceRoot, "README.md"), path.join(releaseRoot, "README.md"));
await cp(path.join(workspaceRoot, "CHANGELOG.md"), path.join(releaseRoot, "CHANGELOG.md"));
await cp(path.join(workspaceRoot, "release", "TROUBLESHOOTING.md"), path.join(releaseRoot, "TROUBLESHOOTING.md"));
await cp(path.join(workspaceRoot, "release", "README.md"), path.join(releaseRoot, "RELEASE.md"));
await cp(path.join(workspaceRoot, "release", "CHECKLIST.md"), path.join(releaseRoot, "CHECKLIST.md"));
await cp(path.join(workspaceRoot, "release", "SIGNING.md"), path.join(releaseRoot, "SIGNING.md"));
await cp(path.join(workspaceRoot, "release", "signing.env.example"), path.join(releaseRoot, "signing.env.example"));

runPowerShell(`Compress-Archive -Path '${portableRoot}\\*' -DestinationPath '${portableZipPath}' -Force`);

await cp(path.join(portableRoot, "Install-FastLoop.ps1"), path.join(installerStageRoot, "Install-FastLoop.ps1"));
await writeFile(path.join(installerStageRoot, "Install-FastLoop.cmd"), createInstallerBatch(), "utf8");
await cp(path.join(portableRoot, "FastLoop-CEPCommon.ps1"), path.join(installerStageRoot, "FastLoop-CEPCommon.ps1"));
await cp(portableZipPath, path.join(installerStageRoot, "FastLoop-Windows-x64.zip"));

const sedPath = path.join(installerStageRoot, "FastLoop-Windows-x64-Setup.sed");
await writeFile(
  sedPath,
  createSedFile({
    friendlyName: `FastLoop ${version} Windows x64 Setup`,
    targetName: installerPath,
    sourceRoot: installerStageRoot
  }),
  "utf8"
);

execFileSync("iexpress.exe", ["/N", sedPath], {
  cwd: workspaceRoot,
  stdio: "inherit"
});

const releaseNotesTemplate = await readFile(
  path.join(workspaceRoot, "release", "release-notes-template.md"),
  "utf8"
);
await writeFile(releaseNotesPath, `${renderReleaseNotes(releaseNotesTemplate, version)}\n`, "utf8");

const installerChecksum = await sha256(installerPath);
const portableZipChecksum = await sha256(portableZipPath);
await writeFile(
  checksumsPath,
  [
    `${installerChecksum}  FastLoop-Windows-x64-Setup.exe`,
    `${portableZipChecksum}  FastLoop-Windows-x64.zip`
  ].join("\n") + "\n",
  "utf8"
);

await writeFile(
  assetListPath,
  [
    installerPath,
    portableZipPath,
    checksumsPath,
    releaseNotesPath
  ].join("\n") + "\n",
  "utf8"
);

const installerStats = await stat(installerPath);
const portableZipStats = await stat(portableZipPath);

const releaseManifest = {
  product: "FastLoop",
  version,
  cepManifestVersion,
  channel: "prerelease",
  builtAt: new Date().toISOString(),
  primaryDownload: "FastLoop-Windows-x64-Setup.exe",
  secondaryDownload: "FastLoop-Windows-x64.zip",
  releaseRoot,
  portableRoot,
  artifacts: {
    installer: installerPath,
    portableZip: portableZipPath,
    checksums: checksumsPath,
    releaseNotes: releaseNotesPath,
    installGuide: path.join(releaseRoot, "INSTALL.md"),
    changelog: path.join(releaseRoot, "CHANGELOG.md"),
    troubleshootingGuide: path.join(releaseRoot, "TROUBLESHOOTING.md"),
    extensionBundle: extensionRoot,
    manifest: path.join(extensionRoot, "CSXS", "manifest.xml"),
    panelEntry: path.join(extensionRoot, "dist", "index.html"),
    hostIndex: path.join(extensionRoot, "host-index.jsx"),
    runtimeExecutable: path.join(
      extensionRoot,
      "engine-runtime",
      "windows-x64",
      "fastloop-engine-runtime",
      "fastloop-engine-runtime.exe"
    ),
    hostReadinessHelper: path.join(portableRoot, "Test-FastLoop-HostReadiness.ps1"),
    assetList: assetListPath
  },
  signing: {
    windowsInstallerSigned: false,
    cepBundleSigned: false
  },
  sizes: {
    installerBytes: installerStats.size,
    portableZipBytes: portableZipStats.size
  },
  notes: [
    "GitHub Releases is the intended end-user installation channel.",
    "The Windows x64 installer is the primary asset.",
    "The Windows x64 zip is the secondary portable asset.",
    "Signing hooks are prepared separately and remain the next production-release step."
  ]
};

await writeFile(
  path.join(releaseRoot, "release-manifest.json"),
  `${JSON.stringify(releaseManifest, null, 2)}\n`,
  "utf8"
);

console.log(
  JSON.stringify(
    {
      version,
      installer: installerPath,
      portableZip: portableZipPath,
      checksums: checksumsPath
    },
    null,
    2
  )
);
