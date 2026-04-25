import { execFileSync } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const packageJson = JSON.parse(
  await import("node:fs/promises").then(({ readFile }) =>
    readFile(path.join(workspaceRoot, "package.json"), "utf8")
  )
);
const version = packageJson.version ?? "0.0.0";

function gitLines(args) {
  try {
    const stdout = execFileSync("git", args, { cwd: workspaceRoot, encoding: "utf8" }).trim();
    return { lines: stdout ? stdout.split(/\r?\n/) : [], unavailable: false };
  } catch (error) {
    return { lines: [], unavailable: true, error: error.message };
  }
}

async function pathSize(target) {
  const item = await stat(target);
  if (!item.isDirectory()) {
    return item.size;
  }

  let total = 0;
  for (const entry of await readdir(target, { withFileTypes: true })) {
    total += await pathSize(path.join(target, entry.name));
  }
  return total;
}

function formatMiB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

const trackedGeneratedResult = gitLines([
  "ls-files",
  "release/out/FastLoop-*",
  "release/build",
  "panel/.smoke-dist",
  "mock/.smoke-dist",
  ".fastloop-output"
]);
const trackedGenerated = trackedGeneratedResult.lines;

if (trackedGenerated.length > 0) {
  throw new Error(
    `Generated artifacts are tracked and should be removed from git:\n${trackedGenerated
      .slice(0, 30)
      .join("\n")}${trackedGenerated.length > 30 ? `\n...and ${trackedGenerated.length - 30} more` : ""}`
  );
}

const releaseRoot = path.join(workspaceRoot, "release", "out", `FastLoop-${version}`);
const releaseSizes = {};
for (const [name, relativePath] of Object.entries({
  releaseRoot: path.join("release", "out", `FastLoop-${version}`),
  installer: path.join("release", "out", `FastLoop-${version}`, "FastLoop-Windows-x64-Setup.exe"),
  portableZip: path.join("release", "out", `FastLoop-${version}`, "FastLoop-Windows-x64.zip"),
  portableFolder: path.join("release", "out", `FastLoop-${version}`, "FastLoop-Windows-x64")
})) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  releaseSizes[name] = existsSync(absolutePath) ? formatMiB(await pathSize(absolutePath)) : "missing";
}

const topLevel = [];
for (const entry of await readdir(workspaceRoot, { withFileTypes: true })) {
  if (entry.name === ".git" || entry.name === "node_modules" || entry.name === ".venv") {
    continue;
  }
  const absolutePath = path.join(workspaceRoot, entry.name);
  topLevel.push({
    path: entry.name,
    size: await pathSize(absolutePath)
  });
}

topLevel.sort((left, right) => right.size - left.size);

console.log(
  JSON.stringify(
    {
      version,
      trackedGeneratedCount: trackedGenerated.length,
      trackedGeneratedCheck: trackedGeneratedResult.unavailable
        ? `unavailable: ${trackedGeneratedResult.error}`
        : "ok",
      releaseRoot,
      releaseSizes,
      largestWorkspacePaths: topLevel.slice(0, 10).map((entry) => ({
        path: entry.path,
        size: formatMiB(entry.size)
      }))
    },
    null,
    2
  )
);
