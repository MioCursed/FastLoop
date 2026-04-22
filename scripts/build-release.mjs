import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const workspaceRoot = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
const version = packageJson.version ?? "0.1.0";
const releaseRoot = path.join(workspaceRoot, "release", "out", `FastLoop-${version}`);
const extensionRoot = path.join(releaseRoot, "FastLoop");
const zipPath = path.join(releaseRoot, `FastLoop-${version}-unsigned.zip`);
const runtimeSourceRoot = path.join(workspaceRoot, "release", "build", "runtime", "windows-x64");

const requiredSources = [
  path.join(workspaceRoot, "panel", "dist", "index.html"),
  path.join(workspaceRoot, "panel", "CSXS", "manifest.xml"),
  path.join(workspaceRoot, "panel", "host-index.jsx"),
  path.join(workspaceRoot, "host-premiere", "jsx", "fastloop_premiere.jsx"),
  path.join(workspaceRoot, "host-aftereffects", "jsx", "fastloop_aftereffects.jsx")
];

for (const source of requiredSources) {
  if (!existsSync(source)) {
    throw new Error(`Release build requires existing asset: ${source}`);
  }
}

await rm(releaseRoot, { recursive: true, force: true });
await mkdir(extensionRoot, { recursive: true });

await cp(path.join(workspaceRoot, "panel", "CSXS"), path.join(extensionRoot, "CSXS"), { recursive: true });
await cp(path.join(workspaceRoot, "panel", "dist"), path.join(extensionRoot, "dist"), { recursive: true });
await cp(path.join(workspaceRoot, "panel", "host-index.jsx"), path.join(extensionRoot, "host-index.jsx"));
await cp(path.join(workspaceRoot, "host-premiere"), path.join(extensionRoot, "host-premiere"), { recursive: true });
await cp(path.join(workspaceRoot, "host-aftereffects"), path.join(extensionRoot, "host-aftereffects"), { recursive: true });
await cp(path.join(workspaceRoot, "INSTALL.md"), path.join(releaseRoot, "INSTALL.md"));
await cp(path.join(workspaceRoot, "README.md"), path.join(releaseRoot, "README.md"));
await cp(path.join(workspaceRoot, "release", "README.md"), path.join(releaseRoot, "RELEASE.md"));
await cp(path.join(workspaceRoot, "release", "CHECKLIST.md"), path.join(releaseRoot, "CHECKLIST.md"));

if (existsSync(runtimeSourceRoot)) {
  const runtimeTargetRoot = path.join(extensionRoot, "engine-runtime", "windows-x64");
  await rm(runtimeTargetRoot, { recursive: true, force: true });
  await mkdir(path.dirname(runtimeTargetRoot), { recursive: true });
  execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `Copy-Item -Path '${runtimeSourceRoot}' -Destination '${runtimeTargetRoot}' -Recurse -Force`
    ],
    {
      cwd: workspaceRoot,
      stdio: "inherit"
    }
  );
}

const releaseManifest = {
  product: "FastLoop",
  version,
  builtAt: new Date().toISOString(),
  extensionBundlePath: extensionRoot,
  artifacts: {
    manifest: path.join(extensionRoot, "CSXS", "manifest.xml"),
    panelEntry: path.join(extensionRoot, "dist", "index.html"),
    hostIndex: path.join(extensionRoot, "host-index.jsx"),
    premiereHost: path.join(extensionRoot, "host-premiere", "jsx", "fastloop_premiere.jsx"),
    afterEffectsHost: path.join(extensionRoot, "host-aftereffects", "jsx", "fastloop_aftereffects.jsx"),
    installGuide: path.join(releaseRoot, "INSTALL.md"),
    releaseGuide: path.join(releaseRoot, "RELEASE.md"),
    packagedRuntime: existsSync(runtimeSourceRoot)
      ? path.join(extensionRoot, "engine-runtime", "windows-x64", "fastloop-engine-runtime", "fastloop-engine-runtime.exe")
      : null
  },
  notes: [
    "Unsigned CEP bundle for staging and manual install.",
    "Windows packaged engine runtime is bundled when present so end users do not need to install Python.",
    "ZXPSignCMD signing is intentionally left for the next release step."
  ]
};

await writeFile(
  path.join(releaseRoot, "release-manifest.json"),
  `${JSON.stringify(releaseManifest, null, 2)}\n`,
  "utf8"
);

execFileSync(
  "powershell",
  [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path '${extensionRoot}\\*' -DestinationPath '${zipPath}' -Force`
  ],
  {
    cwd: workspaceRoot,
    stdio: "inherit"
  }
);

console.log(
  JSON.stringify(
    {
      version,
      extensionRoot,
      zipPath
    },
    null,
    2
  )
);
