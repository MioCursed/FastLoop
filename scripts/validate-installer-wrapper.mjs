import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const workspaceRoot = process.cwd();
const innoScriptPath = path.join(workspaceRoot, "release", "installer", "windows", "FastLoop.iss");
const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
const version = packageJson.version ?? "0.0.0";
const releaseRoot = path.join(workspaceRoot, "release", "out", `FastLoop-${version}`);
const installerStageRoot = path.join(workspaceRoot, "release", "build", "installer", `FastLoop-${version}`);
const validationRoot = path.join(workspaceRoot, "release", "build", "installer-wrapper-self-test", `FastLoop-${version}`);

const innoScript = await readFile(innoScriptPath, "utf8");

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const customMessagesMatch = innoScript.match(/\[CustomMessages\]([\s\S]*?)\n\[Tasks\]/);
assert(customMessagesMatch, "FastLoop.iss is missing a [CustomMessages] section.");

const customMessageLines = customMessagesMatch[1]
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith(";"));

const customMessages = new Map();
for (const line of customMessageLines) {
  const separator = line.indexOf("=");
  if (separator === -1) {
    continue;
  }
  customMessages.set(line.slice(0, separator), line.slice(separator + 1));
}

for (const [key, value] of customMessages) {
  assert(!/\{[01]\}/.test(value), `${key} uses .NET-style placeholders; Inno FmtMessage requires %1/%2.`);
  assert(!/%s/i.test(value), `${key} uses printf-style placeholders; Inno FmtMessage requires %1/%2.`);
  assert(!/\b(undefined|null)\b/i.test(value), `${key} contains an unresolved JS-style value.`);
}

for (const key of ["english.InstallFailed", "brazilianportuguese.InstallFailed"]) {
  const value = customMessages.get(key) ?? "";
  assert(value.includes("%1"), `${key} must include the Inno FmtMessage placeholder %1.`);
  const rendered = value
    .replaceAll("%1", "PowerShell preflight failed")
    .replaceAll("%n", "\n")
    .replaceAll("{localappdata}", "C:\\Users\\Example\\AppData\\Local");
  assert(!/\{[01]\}|%1|%s|\b(undefined|null)\b/i.test(rendered), `${key} still renders with an unresolved placeholder.`);
}

for (const requiredSnippet of [
  "WindowsArgQuote",
  "PowerShellBoolValue",
  "WriteCommandScript",
  "RunPowerShellPreflight",
  "PowerShellPreflightStdoutPath",
  "PowerShellPreflightStderrPath",
  "HelperCmdPath",
  "BuildCmdRunScriptArgs",
  "setup-helper-stdout.log",
  "setup-helper-stderr.log",
  "setup-powershell-preflight-stdout.log",
  "setup-powershell-preflight-stderr.log",
  "FastLoop-CEPCommon.ps1",
  "Test-FastLoop-HostReadiness.ps1"
]) {
  assert(innoScript.includes(requiredSnippet), `FastLoop.iss is missing wrapper diagnostic support: ${requiredSnippet}`);
}

assert(!innoScript.includes("PowerShellQuote"), "FastLoop.iss must not use single-quote PowerShell argument quoting through cmd.exe.");
assert(!innoScript.includes("because {0}"), "FastLoop.iss still contains the broken {0} user-visible failure message.");
assert(!innoScript.includes("-EnableUnsignedPanelSupport:$true"), "PowerShell -File bool arguments must not be passed as $true through cmd.exe.");
assert(!innoScript.includes("-EnableUnsignedPanelSupport $true"), "PowerShell -File bool arguments must not be passed as $true through cmd.exe.");

if (existsSync(installerStageRoot)) {
  for (const relativePath of [
    "FastLoop-Windows-x64.zip",
    "Install-FastLoop.ps1",
    "Install-FastLoop.cmd",
    "FastLoop-CEPCommon.ps1",
    "Test-FastLoop-HostReadiness.ps1",
    "INSTALL.md",
    "TROUBLESHOOTING.md"
  ]) {
    assert(
      existsSync(path.join(installerStageRoot, relativePath)),
      `Installer stage is missing required payload file: ${relativePath}`
    );
  }
}

if (existsSync(path.join(releaseRoot, "FastLoop-Windows-x64"))) {
  for (const relativePath of [
    "FastLoop/CSXS/manifest.xml",
    "FastLoop/dist/index.html",
    "FastLoop/host-index.jsx",
    "Install-FastLoop.ps1",
    "Install-FastLoop.cmd",
    "FastLoop-CEPCommon.ps1",
    "Test-FastLoop-HostReadiness.ps1",
    "INSTALL.md",
    "TROUBLESHOOTING.md"
  ]) {
    assert(
      existsSync(path.join(releaseRoot, "FastLoop-Windows-x64", ...relativePath.split("/"))),
      `Portable release folder is missing required fallback file: ${relativePath}`
    );
  }
}

await mkdir(validationRoot, { recursive: true });
const stdoutPath = path.join(validationRoot, "preflight stdout.log");
const stderrPath = path.join(validationRoot, "preflight stderr.log");
const cmdPath = path.join(validationRoot, "powershell preflight.cmd");
const command = `"powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "$PSVersionTable.PSVersion.ToString()"`;
await writeFile(
  cmdPath,
  [
    "@echo off",
    `cd /d "${validationRoot}"`,
    `${command} 1> "${stdoutPath}" 2> "${stderrPath}"`,
    "exit /b %ERRORLEVEL%",
    ""
  ].join("\r\n"),
  "utf8"
);

const preflight = spawnSync("cmd.exe", ["/D", "/C", "call", cmdPath], {
  cwd: workspaceRoot,
  encoding: "utf8"
});

assert(preflight.status === 0, `PowerShell wrapper self-test failed with exit ${preflight.status}: ${preflight.stderr}`);
const preflightStdout = await readFile(stdoutPath, "utf8");
assert(/\d+\.\d+/.test(preflightStdout), "PowerShell wrapper self-test did not capture a version in stdout.");
assert(existsSync(stderrPath), "PowerShell wrapper self-test did not create stderr capture.");

console.log(
  JSON.stringify(
    {
      version,
      customMessages: customMessages.size,
      innoScript: innoScriptPath,
      installerStageChecked: existsSync(installerStageRoot),
      portableFolderChecked: existsSync(path.join(releaseRoot, "FastLoop-Windows-x64")),
      powershellPreflightStdout: stdoutPath,
      powershellPreflightStderr: stderrPath
    },
    null,
    2
  )
);
