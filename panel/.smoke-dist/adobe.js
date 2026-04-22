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
        return {
            cwd,
            pythonBin: window.__FASTLOOP_PYTHON_BIN__ ?? "python",
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
    const stdout = runtime.execFileSync(runtime.pythonBin, [
        "-m",
        "fastloop_engine.cli",
        request.sourcePath,
        "--track-id",
        request.trackId,
        "--duration-target",
        String(request.durationTargetSeconds),
        "--scoring-mode",
        request.scoringMode
    ], {
        cwd: runtime.cwd,
        encoding: "utf8"
    });
    return JSON.parse(stdout);
}
function runEngineRenderCommand(runtime, command, args) {
    const stdout = runtime.execFileSync(runtime.pythonBin, ["-m", "fastloop_engine.render_cli", command, ...args], {
        cwd: runtime.cwd,
        encoding: "utf8"
    });
    return JSON.parse(stdout);
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
            return {
                host,
                markers: { available: host === "premiere" || host === "aftereffects" },
                timelineTiming: { available: host === "premiere" },
                compTiming: { available: host === "aftereffects" },
                exportHandOff: { available: false, reason: "Reserved for later host-side export handoff." }
            };
        },
        async analyzeTrack(request) {
            if (runtime) {
                return runEngineAnalysis(runtime, request);
            }
            throw new Error("Engine runtime unavailable. Use CEP with Node enabled or the mock bridge.");
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
            ]);
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
                return { ok: false, message: "Host bridge unavailable for commit." };
            }
            const payload = JSON.stringify(request).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
            const script = host === "premiere"
                ? "$._fastloopPremiere.commitCandidate('" + payload + "')"
                : "$._fastloopAfterEffects.commitCandidate('" + payload + "')";
            const result = await evalHost(script);
            return { ok: result === "ok", message: result };
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
