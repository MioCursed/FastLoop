import { access, readFile } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = process.cwd();

const requiredFiles = [
  "README.md",
  "INSTALL.md",
  "CHANGELOG.md",
  "release/TROUBLESHOOTING.md",
  "release/README.md",
  "release/CHECKLIST.md",
  "release/release-notes-template.md",
  "release/SIGNING.md",
  "release/signing.env.example",
  ".github/workflows/release.yml",
  "scripts/build-release.mjs",
  "scripts/validate-installer-wrapper.mjs",
  "scripts/build-engine-runtime.mjs"
];

for (const relativePath of requiredFiles) {
  await access(path.join(workspaceRoot, relativePath));
}

const [readme, installGuide] = await Promise.all([
  readFile(path.join(workspaceRoot, "README.md"), "utf8"),
  readFile(path.join(workspaceRoot, "INSTALL.md"), "utf8")
]);

const readmeExpectations = [
  "Current Status",
  "GitHub Releases",
  "FastLoop-Windows-x64-Setup.exe",
  "FastLoop-Windows-x64.zip",
  "installer",
  "INSTALL.md",
  "Extensions (Legacy)",
  "Developer Setup"
];

const installExpectations = [
  "End-User Install",
  "Developer Setup",
  "GitHub Releases",
  "FastLoop-Windows-x64-Setup.exe",
  "FastLoop-Windows-x64.zip",
  "Extensions (Legacy)",
  "PlayerDebugMode",
  "Installer Fails With PowerShell / Exit Code -196608",
  "setup-latest.log",
  "setup-helper-stderr.log",
  "manual Python install",
  "fallback",
  "Developer Setup"
];

for (const expected of readmeExpectations) {
  if (!readme.includes(expected)) {
    throw new Error(`README.md is missing expected text: ${expected}`);
  }
}

for (const expected of installExpectations) {
  if (!installGuide.includes(expected)) {
    throw new Error(`INSTALL.md is missing expected text: ${expected}`);
  }
}

console.log(
  JSON.stringify(
    {
      requiredFiles: requiredFiles.length,
      readmeChecks: readmeExpectations.length,
      installChecks: installExpectations.length
    },
    null,
    2
  )
);
