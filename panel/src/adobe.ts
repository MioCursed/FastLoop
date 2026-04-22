import type { AdobeHostKind, HostCapabilities, PanelBridge } from "@fastloop/shared";
import type { AnalyzeTrackRequest, ExportPlanRequest, PlaceMarkersRequest } from "@fastloop/shared";

declare global {
  interface Window {
    __FASTLOOP_BRIDGE__?: PanelBridge;
    __FASTLOOP_WORKSPACE_ROOT__?: string;
    __FASTLOOP_PYTHON_BIN__?: string;
    CSInterface?: new () => {
      getApplicationID(): string;
      evalScript(script: string, callback: (result: string) => void): void;
    };
    require?: (moduleName: string) => unknown;
  }
}

interface DesktopRuntime {
  cwd: string;
  pythonBin: string;
  execFileSync: (
    file: string,
    args: string[],
    options: { cwd: string; encoding: "utf8" }
  ) => string;
  path: {
    dirname(pathname: string): string;
    resolve(...segments: string[]): string;
    basename(pathname: string): string;
  };
  fileURLToPath: (url: string) => string;
}

function detectHostKind(): AdobeHostKind {
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

function getNodeRequire(): ((moduleName: string) => unknown) | undefined {
  if (typeof window.require === "function") {
    return window.require;
  }

  try {
    return Function("return typeof require !== 'undefined' ? require : undefined;")() as
      | ((moduleName: string) => unknown)
      | undefined;
  } catch {
    return undefined;
  }
}

function getDesktopRuntime(): DesktopRuntime | null {
  const nodeRequire = getNodeRequire();
  if (!nodeRequire) {
    return null;
  }

  try {
    const childProcess = nodeRequire("node:child_process") as {
      execFileSync: DesktopRuntime["execFileSync"];
    };
    const path = nodeRequire("node:path") as DesktopRuntime["path"];
    const url = nodeRequire("node:url") as { fileURLToPath: DesktopRuntime["fileURLToPath"] };

    const locationHref = window.location.href;
    const htmlPath =
      locationHref.startsWith("file:")
        ? url.fileURLToPath(locationHref)
        : path.resolve(window.__FASTLOOP_WORKSPACE_ROOT__ ?? ".");
    const htmlDirectory = path.dirname(htmlPath);
    const cwd =
      window.__FASTLOOP_WORKSPACE_ROOT__ ??
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
  } catch {
    return null;
  }
}

function runEngineAnalysis(runtime: DesktopRuntime, request: AnalyzeTrackRequest) {
  const stdout = runtime.execFileSync(
    runtime.pythonBin,
    [
      "-m",
      "fastloop_engine.cli",
      request.sourcePath,
      "--track-id",
      request.trackId,
      "--duration-target",
      String(request.durationTargetSeconds),
      "--scoring-mode",
      request.scoringMode
    ],
    {
      cwd: runtime.cwd,
      encoding: "utf8"
    }
  );

  return JSON.parse(stdout);
}

function createAdobeBridge(): PanelBridge {
  const host = detectHostKind();
  const runtime = getDesktopRuntime();

  async function evalHost(script: string): Promise<string> {
    const cs = window.CSInterface ? new window.CSInterface() : undefined;
    if (!cs) {
      throw new Error("CEP host bridge unavailable.");
    }

    return await new Promise((resolve) => {
      cs.evalScript(script, resolve);
    });
  }

  return {
    async getHostCapabilities(): Promise<HostCapabilities> {
      return {
        host,
        markers: { available: host === "premiere" || host === "aftereffects" },
        timelineTiming: { available: host === "premiere" },
        compTiming: { available: host === "aftereffects" },
        exportHandOff: { available: false, reason: "Reserved for later host-side export handoff." }
      };
    },
    async analyzeTrack(request: AnalyzeTrackRequest) {
      if (runtime) {
        return runEngineAnalysis(runtime, request);
      }
      throw new Error("Engine runtime unavailable. Use CEP with Node enabled or the mock bridge.");
    },
    async placeMarkers(request: PlaceMarkersRequest) {
      if (host !== "premiere" && host !== "aftereffects") {
        return { ok: false, message: "Host bridge unavailable for marker placement." };
      }
      const payload = JSON.stringify(request).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      const script =
        host === "premiere"
          ? "$._fastloopPremiere.placeMarkers('" + payload + "')"
          : "$._fastloopAfterEffects.placeMarkers('" + payload + "')";
      const result = await evalHost(script);
      return { ok: result === "ok", message: result };
    },
    async buildExportPlan(request: ExportPlanRequest) {
      const mockBridge = window.__FASTLOOP_BRIDGE__;
      if (!mockBridge) {
        return { ok: false, artifacts: [] };
      }
      return mockBridge.buildExportPlan(request);
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

export function getBridge(): PanelBridge {
  return window.__FASTLOOP_BRIDGE__ ?? createAdobeBridge();
}
