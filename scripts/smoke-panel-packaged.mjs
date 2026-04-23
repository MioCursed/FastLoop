import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const workspaceRoot = process.cwd();
const fixtureBuilder = `${workspaceRoot}/engine/tests/fixture_builder.py`;
const fixturePath = `${workspaceRoot}/engine/tests/generated/loop_fixture.wav`;
const packageJson = JSON.parse(readFileSync(path.join(workspaceRoot, "package.json"), "utf8"));
const version = packageJson.version ?? "0.1.0";
const runtimeManifest = JSON.parse(
  readFileSync(
    path.join(workspaceRoot, "release", "build", "runtime", "windows-x64", "runtime-manifest.json"),
    "utf8"
  )
);

execFileSync("python", [fixtureBuilder], {
  cwd: workspaceRoot,
  encoding: "utf8"
});

const dom = new JSDOM(`<!doctype html><html><body><div id="app"></div></body></html>`, {
  url: pathToFileURL(`${workspaceRoot}/panel/dist/index.html`).href
});

const { window } = dom;
global.window = window;
global.document = window.document;
global.HTMLElement = window.HTMLElement;
global.Node = window.Node;
global.Event = window.Event;
global.MouseEvent = window.MouseEvent;
global.HTMLMediaElement = window.HTMLMediaElement;

if (window.HTMLMediaElement) {
  window.HTMLMediaElement.prototype.play = function () {
    this.dataset.played = "true";
    return Promise.resolve();
  };
  window.HTMLMediaElement.prototype.pause = function () {};
}

window.require = createRequire(import.meta.url);
window.__FASTLOOP_WORKSPACE_ROOT__ = workspaceRoot;
window.__FASTLOOP_ENGINE_BIN__ = runtimeManifest.executable;

const appModule = await import(pathToFileURL(`${workspaceRoot}/panel/.smoke-dist/app.js`).href);
await appModule.mountApp(window.document.querySelector("#app"));

const pathInput = window.document.querySelector("#track-path-input");
pathInput.value = fixturePath;
pathInput.dispatchEvent(new window.Event("input", { bubbles: true }));
const exportInput = window.document.querySelector("#export-directory-input");
exportInput.value = `${workspaceRoot}/.fastloop-output/packaged-smoke`;
exportInput.dispatchEvent(new window.Event("input", { bubbles: true }));

window.document.querySelector('[data-duration-target="30"]')?.dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);

window.document.querySelector("#analyze-button").dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);
await new Promise((resolve) => setTimeout(resolve, 100));

const candidateRows = [...window.document.querySelectorAll("[data-candidate-id]")];
if (!candidateRows.length) {
  throw new Error("Packaged panel smoke failed: no candidates rendered.");
}

candidateRows[0].dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 0));

window.document.querySelector("#preview-button").dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);
await new Promise((resolve) => setTimeout(resolve, 50));

window.document.querySelector("#export-button").dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);
await new Promise((resolve) => setTimeout(resolve, 50));
window.document.querySelector("#commit-button").dispatchEvent(
  new window.MouseEvent("click", { bubbles: true })
);
await new Promise((resolve) => setTimeout(resolve, 50));

const previewAudio = window.document.querySelector("#preview-audio");
const exportArtifact = [...window.document.querySelectorAll(".artifact-path")][0]?.textContent ?? "";
const modeText = [...window.document.querySelectorAll(".metric-grid span")]
  .find((node) => node.textContent === "Mode")
  ?.nextElementSibling?.textContent;
const statusLine = window.document.querySelector(".status-line")?.textContent ?? "";

if (!previewAudio || !exportArtifact || modeText === "--" || !statusLine) {
  throw new Error("Packaged panel smoke failed: preview/export runtime path did not render.");
}

console.log(
  JSON.stringify(
    {
      version,
      runtimeExecutable: runtimeManifest.executable,
      candidateCount: candidateRows.length,
      exportArtifact,
      statusLine: statusLine.trim(),
      modeText
    },
    null,
    2
  )
);
