import { access, readFile } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
const version = packageJson.version ?? "0.1.0";
const releaseRoot = path.join(workspaceRoot, "release", "out", `FastLoop-${version}`);
const manifestPath = path.join(releaseRoot, "release-manifest.json");
const zipPath = path.join(releaseRoot, `FastLoop-${version}-unsigned.zip`);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

for (const filePath of [
  zipPath,
  manifest.artifacts.manifest,
  manifest.artifacts.panelEntry,
  manifest.artifacts.hostIndex,
  manifest.artifacts.installGuide,
  manifest.artifacts.releaseGuide
]) {
  await access(filePath);
}

if (manifest.artifacts.packagedRuntime) {
  await access(manifest.artifacts.packagedRuntime);
}

console.log(
  JSON.stringify(
    {
      version,
      releaseRoot,
      zipPath,
      panelEntry: manifest.artifacts.panelEntry
    },
    null,
    2
  )
);
