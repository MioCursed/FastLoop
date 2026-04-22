import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const workspaceRoot = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
const version = packageJson.version ?? "0.1.0";
const runtimeBuildRoot = path.join(workspaceRoot, "release", "build", "runtime", "windows-x64");
const distPath = runtimeBuildRoot;
const workPath = path.join(workspaceRoot, "release", "build", "pyinstaller", "work");
const specPath = path.join(workspaceRoot, "release", "build", "pyinstaller", "spec");
const exeDir = path.join(runtimeBuildRoot, "fastloop-engine-runtime");
const exePath = path.join(exeDir, "fastloop-engine-runtime.exe");

async function removeWithRetries(targetPath, attempts = 5) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await rm(targetPath, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
    }
  }
}

await mkdir(runtimeBuildRoot, { recursive: true });
await mkdir(workPath, { recursive: true });
await mkdir(specPath, { recursive: true });
await removeWithRetries(exeDir);

execFileSync(
  "python",
  [
    "-m",
    "PyInstaller",
    "--noconfirm",
    "--clean",
    "--onedir",
    "--name",
    "fastloop-engine-runtime",
    "--distpath",
    distPath,
    "--workpath",
    workPath,
    "--specpath",
    specPath,
    "--paths",
    path.join(workspaceRoot, "engine"),
    path.join(workspaceRoot, "engine", "fastloop_engine", "runtime_cli.py")
  ],
  {
    cwd: workspaceRoot,
    stdio: "inherit"
  }
);

if (!existsSync(exePath)) {
  throw new Error(`Packaged engine executable was not produced at ${exePath}`);
}

await writeFile(
  path.join(runtimeBuildRoot, "runtime-manifest.json"),
  `${JSON.stringify(
    {
      version,
      platform: "windows-x64",
      executable: exePath
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(
  JSON.stringify(
    {
      version,
      executable: exePath
    },
    null,
    2
  )
);
