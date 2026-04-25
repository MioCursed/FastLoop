import { access, readFile } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = path.resolve(process.cwd(), process.cwd().endsWith(`${path.sep}panel`) ? ".." : ".");
const distRoot = path.join(workspaceRoot, "panel", "dist");
const indexPath = path.join(distRoot, "index.html");

function uniqueMatches(source, pattern) {
  return [...new Set(Array.from(source.matchAll(pattern), (match) => match[1]))];
}

async function assertExists(label, relativePath) {
  const normalized = relativePath.replace(/^\.\//, "");
  const resolved = path.resolve(distRoot, normalized);
  if (resolved !== distRoot && !resolved.startsWith(`${distRoot}${path.sep}`)) {
    throw new Error(`${label} resolves outside panel/dist: ${relativePath}`);
  }
  await access(resolved);
  return resolved;
}

async function assertModuleAssetIsSelfContained(relativePath) {
  const resolved = await assertExists("script asset", relativePath);
  const source = await readFile(resolved, "utf8");
  if (/(^|[;\n])\s*import\s*(?:[\w*{]|\()/m.test(source) || /(^|[;\n])\s*export\s+/m.test(source)) {
    throw new Error(
      `CEP module asset must be self-contained and must not import child modules from local files: ${relativePath}`
    );
  }
  return resolved;
}

const html = await readFile(indexPath, "utf8");

for (const forbidden of ['src="/assets/', 'href="/assets/']) {
  if (html.includes(forbidden)) {
    throw new Error(`panel/dist/index.html contains root-absolute asset path: ${forbidden}`);
  }
}

const scriptAssets = uniqueMatches(html, /<script\b[^>]*\bsrc="([^"]*assets\/[^"]+\.js)"[^>]*>/g);
const cssAssets = uniqueMatches(html, /<link\b[^>]*\bhref="([^"]*assets\/[^"]+\.css)"[^>]*>/g);

if (scriptAssets.length === 0) {
  throw new Error("panel/dist/index.html does not reference a bundled script asset.");
}

if (cssAssets.length === 0) {
  throw new Error("panel/dist/index.html does not reference a bundled CSS asset.");
}

for (const [label, assets] of [
  ["script asset", scriptAssets],
  ["CSS asset", cssAssets]
]) {
  for (const asset of assets) {
    if (!asset.startsWith("./assets/")) {
      throw new Error(`CEP asset path must be relative and start with ./assets/: ${asset}`);
    }
    if (label === "script asset") {
      await assertModuleAssetIsSelfContained(asset);
    } else {
      await assertExists(label, asset);
    }
  }
}

await assertExists("CSInterface shim", "./CSInterface.js");

console.log(
  JSON.stringify(
    {
      panelDist: distRoot,
      scriptAssets,
      cssAssets,
      csInterface: "./CSInterface.js",
      moduleAssetsSelfContained: true,
      cepSafeRelativeAssets: true
    },
    null,
    2
  )
);
