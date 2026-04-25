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
const bundleRoot = path.resolve(workspaceRoot, "panel");

function assertInsideBundle(label, resolvedPath) {
  if (resolvedPath !== bundleRoot && !resolvedPath.startsWith(`${bundleRoot}${path.sep}`)) {
    throw new Error(`${label} resolves outside bundle root: ${resolvedPath}`);
  }
}

function resolveBundlePath(label, relativePath) {
  const resolvedPath = path.resolve(bundleRoot, relativePath);
  assertInsideBundle(label, resolvedPath);
  return resolvedPath;
}

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

const csxsRuntimeVersion = readAttribute(
  manifestXml,
  /<RequiredRuntime Name="CSXS" Version="([^"]+)"\s*\/>/,
  "RequiredRuntime CSXS Version"
);
const allowedRuntimeVersions = new Set(["11.0", "[11.0,99.9]"]);
if (!allowedRuntimeVersions.has(csxsRuntimeVersion)) {
  throw new Error(
    `Manifest CSXS runtime version must match final policy (${Array.from(allowedRuntimeVersions).join(" or ")}), got ${csxsRuntimeVersion}.`
  );
}

for (const relativePath of [
  path.join("panel", "dist", "index.html"),
  path.join("panel", "host-index.jsx"),
  path.join("host-premiere", "jsx", "fastloop_premiere.jsx"),
  path.join("host-aftereffects", "jsx", "fastloop_aftereffects.jsx")
]) {
  await access(path.join(workspaceRoot, relativePath));
}

const resolvedMainPath = resolveBundlePath("MainPath", mainPath);
const resolvedScriptPath = resolveBundlePath("ScriptPath", scriptPath);
const expectedMainPath = path.join(bundleRoot, "dist", "index.html");
const expectedScriptPath = path.join(bundleRoot, "host-index.jsx");

if (resolvedMainPath !== expectedMainPath) {
  throw new Error(`MainPath must resolve to panel/dist/index.html, got: ${mainPath} -> ${resolvedMainPath}`);
}

if (resolvedScriptPath !== expectedScriptPath) {
  throw new Error(`ScriptPath must resolve to panel/host-index.jsx, got: ${scriptPath} -> ${resolvedScriptPath}`);
}

for (const [label, target] of [
  ["MainPath target", resolvedMainPath],
  ["ScriptPath target", resolvedScriptPath]
]) {
  try {
    await access(target);
  } catch {
    throw new Error(`${label} does not exist: ${target}`);
  }
}

const hostIndexSource = await readFile(expectedScriptPath, "utf8");
const loadHostScriptTargets = Array.from(
  hostIndexSource.matchAll(/loadHostScript\(\s*["']([^"']+)["']\s*\)/g),
  (match) => match[1]
);

for (const target of loadHostScriptTargets) {
  const resolvedTarget = resolveBundlePath(`loadHostScript(${target})`, target);
  try {
    await access(resolvedTarget);
  } catch {
    throw new Error(`loadHostScript target does not exist: ${target} -> ${resolvedTarget}`);
  }
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
      resolvedMainPath,
      scriptPath,
      resolvedScriptPath,
      csxsRuntimeVersion,
      loadHostScriptTargets,
      menuLabel
    },
    null,
    2
  )
);
