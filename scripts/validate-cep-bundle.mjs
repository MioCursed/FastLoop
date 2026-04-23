import { access, readFile } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));

function toCepManifestVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z-]+(?:\.(\d+))?)?/.exec(version);
  if (!match) {
    throw new Error(`Unsupported package version for CEP manifest normalization: ${version}`);
  }

  const [, major, minor, patch, prereleaseNumber] = match;
  return prereleaseNumber ? `${major}.${minor}.${patch}.${prereleaseNumber}` : `${major}.${minor}.${patch}`;
}

function readAttribute(source, pattern, label) {
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Unable to locate ${label} in panel/CSXS/manifest.xml`);
  }

  return match[1];
}

const manifestPath = path.join(workspaceRoot, "panel", "CSXS", "manifest.xml");
const manifestXml = await readFile(manifestPath, "utf8");
const normalizedVersion = toCepManifestVersion(packageJson.version ?? "0.0.0");

const extensionBundleId = readAttribute(manifestXml, /ExtensionBundleId="([^"]+)"/, "ExtensionBundleId");
const extensionBundleVersion = readAttribute(
  manifestXml,
  /ExtensionBundleVersion="([^"]+)"/,
  "ExtensionBundleVersion"
);
const extensionVersion = readAttribute(
  manifestXml,
  /<Extension Id="com\.fastloop\.panel\.main" Version="([^"]+)"/,
  "Extension version"
);
const mainPath = readAttribute(manifestXml, /<MainPath>([^<]+)<\/MainPath>/, "MainPath");
const scriptPath = readAttribute(manifestXml, /<ScriptPath>([^<]+)<\/ScriptPath>/, "ScriptPath");
const menuLabel = readAttribute(manifestXml, /<Menu>([^<]+)<\/Menu>/, "Menu");

if (extensionBundleId !== "com.fastloop.panel") {
  throw new Error(`Unexpected ExtensionBundleId: ${extensionBundleId}`);
}

if (extensionBundleVersion !== normalizedVersion) {
  throw new Error(
    `Manifest bundle version ${extensionBundleVersion} does not match normalized package version ${normalizedVersion}.`
  );
}

if (extensionVersion !== normalizedVersion) {
  throw new Error(
    `Manifest extension version ${extensionVersion} does not match normalized package version ${normalizedVersion}.`
  );
}

for (const hostName of ["PPRO", "AEFT"]) {
  if (!manifestXml.includes(`Host Name="${hostName}"`)) {
    throw new Error(`Manifest is missing host target ${hostName}.`);
  }
}

if (!manifestXml.includes('<RequiredRuntime Name="CSXS" Version="[11.0,99.9]" />')) {
  throw new Error("Manifest no longer declares the expected CEP runtime range (11.0+).");
}

for (const relativePath of [
  path.join("panel", "dist", "index.html"),
  path.join("panel", "host-index.jsx"),
  path.join("host-premiere", "jsx", "fastloop_premiere.jsx"),
  path.join("host-aftereffects", "jsx", "fastloop_aftereffects.jsx")
]) {
  await access(path.join(workspaceRoot, relativePath));
}

if (mainPath !== "../dist/index.html") {
  throw new Error(`Unexpected MainPath: ${mainPath}`);
}

if (scriptPath !== "../host-index.jsx") {
  throw new Error(`Unexpected ScriptPath: ${scriptPath}`);
}

if (menuLabel !== "FastLoop") {
  throw new Error(`Unexpected CEP menu label: ${menuLabel}`);
}

console.log(
  JSON.stringify(
    {
      packageVersion: packageJson.version,
      normalizedManifestVersion: normalizedVersion,
      extensionBundleId,
      mainPath,
      scriptPath,
      menuLabel
    },
    null,
    2
  )
);
