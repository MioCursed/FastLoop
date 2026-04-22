function detectHostKind() {
    if (!window.CSInterface) {
        return "unknown";
    }
    const appId = new window.CSInterface().getApplicationID();
    if (appId === "PPRO") {
        return "premiere";
    }
    if (appId === "AEFT") {
        return "aftereffects";
    }
    return "unknown";
}
function getNodeRequire() {
    if (typeof window.require === "function") {
        return window.require;
    }
    try {
        return Function("return typeof require !== 'undefined' ? require : undefined;")();
    }
    catch {
        return undefined;
    }
}
function getDesktopRuntime() {
    const nodeRequire = getNodeRequire();
    if (!nodeRequire) {
        return null;
    }
    try {
        const childProcess = nodeRequire("node:child_process");
        const path = nodeRequire("node:path");
        const url = nodeRequire("node:url");
        const locationHref = window.location.href;
        const htmlPath = locationHref.startsWith("file:")
            ? url.fileURLToPath(locationHref)
            : path.resolve(window.__FASTLOOP_WORKSPACE_ROOT__ ?? ".");
        const htmlDirectory = path.dirname(htmlPath);
        const cwd = window.__FASTLOOP_WORKSPACE_ROOT__ ??
            (path.basename(htmlDirectory) === "dist"
                ? path.resolve(htmlDirectory, "..", "..")
                : path.resolve(htmlDirectory, ".."));
        const packagedCandidates = [
            window.__FASTLOOP_ENGINE_BIN__ ?? "",
            path.resolve(cwd, "engine-runtime", "windows-x64", "fastloop-engine-runtime", "fastloop-engine-runtime.exe"),
            path.resolve(cwd, "release", "build", "runtime", "windows-x64", "fastloop-engine-runtime", "fastloop-engine-runtime.exe")
        ];
        const fs = nodeRequire("node:fs");
        const engineBin = packagedCandidates.find((candidate) => candidate && fs.existsSync(candidate)) ?? null;
        return {
            cwd,
            pythonBin: window.__FASTLOOP_PYTHON_BIN__ ?? "python",
            engineBin,
            execFileSync: childProcess.execFileSync,
            path,
            fileURLToPath: url.fileURLToPath
        };
    }
    catch {
        return null;
    }
}
function runEngineAnalysis(runtime, request) {
    const stdout = runRuntimeCommand(runtime, "analyze", [
        request.sourcePath,
        "--track-id",
        request.trackId,
        "--duration-target",
        String(request.durationTargetSeconds),
        "--scoring-mode",
        request.scoringMode
    ]);
    return JSON.parse(stdout);
}
function runEngineRenderCommand(runtime, command, args) {
    const stdout = runRuntimeCommand(runtime, command, args);
    return JSON.parse(stdout);
}
function sanitizeDialogPath(pathname) {
    if (!pathname) {
        return null;
    }
    return pathname.replace(/'/g, "''");
}
function openWindowsDialog(runtime, dialogType, initialPath) {
    const initial = sanitizeDialogPath(initialPath);
    const binary = runtime.path.resolve(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    const script = dialogType === "file"
        ? [
            "Add-Type -AssemblyName System.Windows.Forms",
            "$dialog = New-Object System.Windows.Forms.OpenFileDialog",
            "$dialog.Filter = 'Audio Files|*.wav;*.mp3;*.flac;*.m4a;*.aiff;*.aif;*.ogg|All Files|*.*'",
            "$dialog.Multiselect = $false",
            initial ? `$dialog.InitialDirectory = '${initial}'` : "",
            "$result = $dialog.ShowDialog()",
            "if ($result -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.FileName }"
        ]
        : [
            "Add-Type -AssemblyName System.Windows.Forms",
            "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
            initial ? `$dialog.SelectedPath = '${initial}'` : "",
            "$result = $dialog.ShowDialog()",
            "if ($result -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.SelectedPath }"
        ];
    const stdout = runtime.execFileSync(binary, ["-NoProfile", "-STA", "-Command", script.filter(Boolean).join("; ")], {
        cwd: runtime.cwd,
        encoding: "utf8"
    }).trim();
    return stdout || null;
}
function runRuntimeCommand(runtime, command, args) {
    const binary = runtime.engineBin ?? runtime.pythonBin;
    const binaryArgs = runtime.engineBin
        ? [command, ...args]
        : ["-m", "fastloop_engine.runtime_cli", command, ...args];
    return runtime.execFileSync(binary, binaryArgs, {
        cwd: runtime.cwd,
        encoding: "utf8"
    });
}
function createAdobeBridge() {
    const host = detectHostKind();
    const runtime = getDesktopRuntime();
    async function evalHost(script) {
        const cs = window.CSInterface ? new window.CSInterface() : undefined;
        if (!cs) {
            throw new Error("CEP host bridge unavailable.");
        }
        return await new Promise((resolve) => {
            cs.evalScript(script, resolve);
        });
    }
    return {
        async getHostCapabilities() {
            const exportHandOff = host === "premiere" || host === "aftereffects"
                ? { available: true }
                : {
                    available: false,
                    reason: "Rendered asset handoff is available only inside Adobe hosts."
                };
            return {
                host,
                markers: { available: host === "premiere" || host === "aftereffects" },
                timelineTiming: { available: host === "premiere" },
                compTiming: { available: host === "aftereffects" },
                exportHandOff
            };
        },
        async analyzeTrack(request) {
            if (runtime) {
                return runEngineAnalysis(runtime, request);
            }
            throw new Error("Engine runtime unavailable. Use CEP with Node enabled or the mock bridge.");
        },
        async pickSourceFile(initialPath) {
            if (!runtime) {
                const mockBridge = window.__FASTLOOP_BRIDGE__;
                if (!mockBridge || !mockBridge.pickSourceFile) {
                    return null;
                }
                return mockBridge.pickSourceFile(initialPath);
            }
            const initialDirectory = initialPath ? runtime.path.dirname(initialPath) : runtime.cwd;
            return openWindowsDialog(runtime, "file", initialDirectory);
        },
        async pickOutputDirectory(initialPath) {
            if (!runtime) {
                const mockBridge = window.__FASTLOOP_BRIDGE__;
                if (!mockBridge || !mockBridge.pickOutputDirectory) {
                    return null;
                }
                return mockBridge.pickOutputDirectory(initialPath);
            }
            const defaultDirectory = initialPath ?? runtime.path.join(runtime.cwd, ".fastloop-output");
            return openWindowsDialog(runtime, "directory", defaultDirectory);
        },
        async placeMarkers(request) {
            if (host !== "premiere" && host !== "aftereffects") {
                return { ok: false, message: "Host bridge unavailable for marker placement." };
            }
            const payload = JSON.stringify(request).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
            const script = host === "premiere"
                ? "$._fastloopPremiere.placeMarkers('" + payload + "')"
                : "$._fastloopAfterEffects.placeMarkers('" + payload + "')";
            const result = await evalHost(script);
            return { ok: result === "ok", message: result };
        },
        async previewCandidate(request) {
            if (!runtime) {
                throw new Error("Preview runtime unavailable. Use CEP with Node enabled or the mock bridge.");
            }
            return runEngineRenderCommand(runtime, "preview", [
                request.sourcePath,
                "--track-id",
                request.trackId,
                "--candidate-json",
                JSON.stringify(request.candidate),
                "--preview-mode",
                request.previewMode
            ]);
        },
        async exportCandidate(request) {
            if (!runtime) {
                throw new Error("Export runtime unavailable. Use CEP with Node enabled or the mock bridge.");
            }
            return runEngineRenderCommand(runtime, "export", [
                request.sourcePath,
                "--track-id",
                request.trackId,
                "--candidate-json",
                JSON.stringify(request.candidate),
                "--duration-target",
                String(request.durationTargetSeconds),
                "--scoring-mode",
                request.scoringMode,
                "--warnings-json",
                JSON.stringify(request.warnings)
            ].concat(request.outputDirectory ? ["--output-dir", request.outputDirectory] : []));
        },
        async buildExportPlan(request) {
            if (runtime) {
                const result = await this.exportCandidate(request);
                return { ok: result.ok, artifacts: Object.values(result.artifacts) };
            }
            const mockBridge = window.__FASTLOOP_BRIDGE__;
            if (!mockBridge) {
                return { ok: false, artifacts: [] };
            }
            return mockBridge.buildExportPlan(request);
        },
        async commitCandidate(request) {
            if (host !== "premiere" && host !== "aftereffects") {
                return { ok: false, message: "Host bridge unavailable for commit.", importedAssetPath: null };
            }
            const payload = JSON.stringify(request).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
            const script = host === "premiere"
                ? "$._fastloopPremiere.commitCandidate('" + payload + "')"
                : "$._fastloopAfterEffects.commitCandidate('" + payload + "')";
            const result = await evalHost(script);
            return {
                ok: result === "ok",
                message: result,
                importedAssetPath: request.renderedAssetPath ?? null
            };
        },
        async getQueue() {
            const mockBridge = window.__FASTLOOP_BRIDGE__;
            if (!mockBridge) {
                return [];
            }
            return mockBridge.getQueue();
        }
    };
}
export function getBridge() {
    return window.__FASTLOOP_BRIDGE__ ?? createAdobeBridge();
}
