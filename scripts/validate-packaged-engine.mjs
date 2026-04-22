import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const packageJson = JSON.parse(readFileSync(path.join(workspaceRoot, "package.json"), "utf8"));
const version = packageJson.version ?? "0.1.0";
const runtimeManifestPath = path.join(
  workspaceRoot,
  "release",
  "build",
  "runtime",
  "windows-x64",
  "runtime-manifest.json"
);

if (!existsSync(runtimeManifestPath)) {
  throw new Error("Packaged engine manifest missing. Run npm run build:engine-runtime first.");
}

const runtimeManifest = JSON.parse(readFileSync(runtimeManifestPath, "utf8"));
const exePath = runtimeManifest.executable;
const fixtureBuilder = path.join(workspaceRoot, "engine", "tests", "fixture_builder.py");
const fixturePath = path.join(workspaceRoot, "engine", "tests", "generated", "loop_fixture.wav");

execFileSync("python", [fixtureBuilder], {
  cwd: workspaceRoot,
  stdio: "inherit"
});

const analysis = JSON.parse(
  execFileSync(
    exePath,
    ["analyze", fixturePath, "--track-id", "packaged-fixture", "--duration-target", "30", "--scoring-mode", "duration-priority"],
    { cwd: workspaceRoot, encoding: "utf8" }
  )
);

const candidate = analysis.candidates[1] ?? analysis.candidates[0];
const preview = JSON.parse(
  execFileSync(
    exePath,
    [
      "preview",
      fixturePath,
      "--track-id",
      "packaged-fixture",
      "--candidate-json",
      JSON.stringify(candidate),
      "--preview-mode",
      "repeat"
    ],
    { cwd: workspaceRoot, encoding: "utf8" }
  )
);

const exported = JSON.parse(
  execFileSync(
    exePath,
    [
      "export",
      fixturePath,
      "--track-id",
      "packaged-fixture",
      "--candidate-json",
      JSON.stringify(candidate),
      "--duration-target",
      "30",
      "--scoring-mode",
      "duration-priority",
      "--warnings-json",
      JSON.stringify(analysis.warnings)
    ],
    { cwd: workspaceRoot, encoding: "utf8" }
  )
);

console.log(
  JSON.stringify(
    {
      version,
      executable: exePath,
      candidateId: candidate.id,
      previewPath: preview.previewFilePath,
      metadataPath: exported.artifacts.metadataPath
    },
    null,
    2
  )
);
