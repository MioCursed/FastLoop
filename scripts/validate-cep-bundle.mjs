import { access, readFile } from "node:fs/promises";
import path from "node:path";
import "./validate-panel-dist.mjs";

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
const projectedBundleRoot = path.resolve(workspaceRoot, "__fastloop_projected_cep_bundle__");

function assertInsideProjectedBundle(label, resolvedPath) {
  if (resolvedPath !== projectedBundleRoot && !resolvedPath.startsWith(`${projectedBundleRoot}${path.sep}`)) {
    throw new Error(`${label} resolves outside bundle root: ${resolvedPath}`);
  }
}

function assertCepRelativePath(label, relativePath) {
  if (!relativePath || !relativePath.trim()) {
    throw new Error(`${label} must not be empty.`);
  }
  if ([...relativePath.matchAll(/(^|[\\/])\.\.([\\/]|$)/g)].length > 0) {
    throw new Error(`${label} must not use '..' path segments: ${relativePath}`);
  }
  if (path.isAbsolute(relativePath) || /^[A-Za-z]:[\\/]/.test(relativePath)) {
    throw new Error(`${label} must be relative to the CEP bundle root: ${relativePath}`);
  }
}

function resolveBundlePath(label, relativePath) {
  assertCepRelativePath(label, relativePath);
  const resolvedPath = path.resolve(projectedBundleRoot, relativePath);
  assertInsideProjectedBundle(label, resolvedPath);
  return resolvedPath;
}

function resolveSourcePathForBundlePath(label, relativePath) {
  assertCepRelativePath(label, relativePath);
  const normalized = relativePath.replace(/^[.][\\/]/, "").replaceAll("\\", "/");
  const segments = normalized.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const rest = segments.slice(1);

  if (firstSegment === "dist") {
    return path.join(workspaceRoot, "panel", "dist", ...rest);
  }
  if (firstSegment === "CSXS") {
    return path.join(workspaceRoot, "panel", "CSXS", ...rest);
  }
  if (firstSegment === "host-index.jsx") {
    return path.join(workspaceRoot, "panel", "host-index.jsx");
  }
  if (firstSegment === "host-premiere" || firstSegment === "host-aftereffects") {
    return path.join(workspaceRoot, firstSegment, ...rest);
  }

  throw new Error(`${label} does not map to a known release bundle source: ${relativePath}`);
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
const requiredMainPath = "./dist/index.html";
const requiredScriptPath = "./host-index.jsx";
const requiredHostScriptTargets = new Set([
  "host-premiere/jsx/fastloop_premiere.jsx",
  "host-aftereffects/jsx/fastloop_aftereffects.jsx"
]);

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
const expectedMainPath = path.join(projectedBundleRoot, "dist", "index.html");
const expectedScriptPath = path.join(projectedBundleRoot, "host-index.jsx");
const expectedScriptSourcePath = resolveSourcePathForBundlePath("ScriptPath", scriptPath);

if (mainPath !== requiredMainPath) {
  throw new Error(`MainPath must be ${requiredMainPath}, got: ${mainPath}`);
}

if (scriptPath !== requiredScriptPath) {
  throw new Error(`ScriptPath must be ${requiredScriptPath}, got: ${scriptPath}`);
}

if (resolvedMainPath !== expectedMainPath) {
  throw new Error(`MainPath must resolve to dist/index.html inside the CEP bundle, got: ${mainPath} -> ${resolvedMainPath}`);
}

if (resolvedScriptPath !== expectedScriptPath) {
  throw new Error(`ScriptPath must resolve to host-index.jsx inside the CEP bundle, got: ${scriptPath} -> ${resolvedScriptPath}`);
}

for (const [label, relativePath] of [
  ["MainPath target", mainPath],
  ["ScriptPath target", scriptPath]
]) {
  const target = resolveSourcePathForBundlePath(label, relativePath);
  try {
    await access(target);
  } catch {
    throw new Error(`${label} does not exist: ${target}`);
  }
}

const hostIndexSource = await readFile(expectedScriptSourcePath, "utf8");
const loadHostScriptTargets = Array.from(
  hostIndexSource.matchAll(/loadHostScript\(\s*["']([^"']+)["']\s*\)/g),
  (match) => match[1]
);

for (const target of loadHostScriptTargets) {
  resolveBundlePath(`loadHostScript(${target})`, target);
  const resolvedSourceTarget = resolveSourcePathForBundlePath(`loadHostScript(${target})`, target);
  try {
    await access(resolvedSourceTarget);
  } catch {
    throw new Error(`loadHostScript target source does not exist: ${target} -> ${resolvedSourceTarget}`);
  }
}

for (const requiredTarget of requiredHostScriptTargets) {
  if (!loadHostScriptTargets.includes(requiredTarget)) {
    throw new Error(`host-index.jsx must load ${requiredTarget} from inside the CEP bundle.`);
  }
}

for (const target of loadHostScriptTargets) {
  if (!requiredHostScriptTargets.has(target)) {
    throw new Error(`Unexpected host-index.jsx loadHostScript target: ${target}`);
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
