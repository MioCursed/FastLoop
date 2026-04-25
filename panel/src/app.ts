import { DURATION_PRESETS, SCORING_MODE_PRESETS } from "@fastloop/shared";
import type {
  AnalysisResult,
  LoopCandidate,
  PanelBridge,
  PreviewMode,
  ScoringMode
} from "@fastloop/shared";
import { getBridge } from "./adobe.js";
import { createInitialState, type ActionStatus, type PanelState } from "./state.js";

interface MountOptions {
  bridge?: PanelBridge;
  initialState?: PanelState;
}

const EXPORT_DIRECTORY_STORAGE_KEY = "fastloop.exportDirectory";
const PANEL_VERSION = "0.1.1-beta.7";

type FunctionMode = "analyze" | "finder" | "preview" | "export" | "bed" | "commit";

const FUNCTION_MODES: Array<{ id: FunctionMode; label: string }> = [
  { id: "analyze", label: "Analyze" },
  { id: "finder", label: "Loop Finder" },
  { id: "preview", label: "Preview" },
  { id: "export", label: "Export" },
  { id: "bed", label: "Build Bed" },
  { id: "commit", label: "Commit" }
];

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatSeconds(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }
  return `${value.toFixed(2)}s`;
}

function formatSigned(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function formatActionStatus(status: ActionStatus): string {
  switch (status) {
    case "running":
      return "Running";
    case "success":
      return "Ready";
    case "error":
      return "Failed";
    default:
      return "Idle";
  }
}

function readStoredValue(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStoredValue(key: string, value: string): void {
  try {
    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore CEP storage failures and keep the in-memory state.
  }
}

function toFileUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  return encodeURI(normalized.startsWith("/") ? `file://${normalized}` : `file:///${normalized}`);
}

function selectedTrack(state: PanelState) {
  return state.tracks.find((track) => track.id === state.selectedTrackId) ?? null;
}

function selectedCandidate(state: PanelState) {
  if (!state.analysis) {
    return null;
  }
  return (
    state.analysis.candidates.find((candidate) => candidate.id === state.selectedCandidateId) ??
    state.analysis.candidates[0] ??
    null
  );
}

function renderWaveformBars(peaks: number[]): string {
  if (!peaks.length) {
    return '<div class="waveform-empty">Analyze a track to render waveform peaks.</div>';
  }

  return `
    <div class="waveform-bars" aria-label="Waveform peaks">
      ${peaks
        .map((peak, index) => {
          const height = Math.max(4, Math.round(peak * 100));
          return `<span class="wave-bar" style="height:${height}%;" data-wave-index="${index}"></span>`;
        })
        .join("")}
    </div>
  `;
}

function renderTimingMarkers(
  times: number[],
  durationSeconds: number,
  className: string,
  maxMarkers: number
): string {
  if (!times.length || durationSeconds <= 0) {
    return "";
  }

  const step = Math.max(1, Math.ceil(times.length / maxMarkers));
  return times
    .filter((_, index) => index % step === 0)
    .map((time) => {
      const position = Math.min(100, Math.max(0, (time / durationSeconds) * 100));
      return `<span class="timing-marker ${className}" style="left:${position}%;"></span>`;
    })
    .join("");
}

function renderCandidateOverlay(candidate: LoopCandidate | null, analysis: AnalysisResult | null): string {
  if (!candidate || !analysis || analysis.durationSeconds <= 0) {
    return "";
  }

  const left = (candidate.startSeconds / analysis.durationSeconds) * 100;
  const width = ((candidate.endSeconds - candidate.startSeconds) / analysis.durationSeconds) * 100;
  return `<div class="candidate-overlay" style="left:${left}%; width:${Math.max(width, 0.6)}%;"></div>`;
}

function renderCandidateRow(candidate: LoopCandidate, isSelected: boolean): string {
  return `
    <button class="candidate-row ${isSelected ? "selected" : ""}" data-candidate-id="${candidate.id}">
      <span>${candidate.compositeScore.toFixed(1)}</span>
      <span>${candidate.baseDeterministicScore.toFixed(1)}</span>
      <span>${formatSigned(candidate.rerankDelta)}</span>
      <span>${formatSeconds(candidate.startSeconds)}</span>
      <span>${formatSeconds(candidate.endSeconds)}</span>
      <span>${formatSeconds(candidate.durationSeconds)}</span>
      <span>${candidate.bars}</span>
      <span>${candidate.breakdown.targetDurationUsefulness.toFixed(0)}</span>
      <span>${candidate.breakdown.aiRerankConfidence.toFixed(0)}</span>
      <span>${candidate.breakdown.clickRiskPenalty.toFixed(0)}</span>
      <span>${candidate.breakdown.editorialUsability.toFixed(0)}</span>
    </button>
  `;
}

function renderWarnings(warnings: string[]): string {
  if (!warnings.length) {
    return "";
  }

  return `
    <div class="warning-block">
      <div class="warning-title">Warnings</div>
      ${warnings.map((warning) => `<div class="warning-row">${escapeHtml(warning)}</div>`).join("")}
    </div>
  `;
}

function renderBreakdown(candidate: LoopCandidate | null): string {
  if (!candidate) {
    return '<div class="empty-row">Select a candidate to inspect the score breakdown.</div>';
  }

  const breakdownRows = [
    ["Base Deterministic", candidate.baseDeterministicScore],
    ["Mode-Weighted", candidate.scoringModeScore],
    ["Rerank Delta", candidate.rerankDelta],
    ["Beat Alignment", candidate.breakdown.beatAlignment],
    ["Bar Alignment", candidate.breakdown.barAlignment],
    ["Phrase Alignment", candidate.breakdown.phraseAlignment],
    ["Spectral Continuity", candidate.breakdown.spectralContinuity],
    ["Energy Continuity", candidate.breakdown.energyContinuity],
    ["Timbre Continuity", candidate.breakdown.timbreContinuity],
    ["Loudness Continuity", candidate.breakdown.loudnessContinuity],
    ["Click Risk", candidate.breakdown.clickRiskPenalty],
    ["Duration Fit", candidate.breakdown.targetDurationUsefulness],
    ["Editorial Use", candidate.breakdown.editorialUsability],
    ["AI Assist", candidate.breakdown.aiRerankConfidence]
  ];

  return breakdownRows
    .map(
      ([label, value]) => `
        <div class="breakdown-row">
          <span>${label}</span>
          <strong>${Number(value).toFixed(1)}</strong>
        </div>
      `
    )
    .join("");
}

function renderExecutionBlock(state: PanelState): string {
  const preview = state.lastPreview;
  const exportResult = state.lastExport;
  const audioMarkup = preview
    ? `
        <audio id="preview-audio" class="preview-audio" controls src="${escapeHtml(toFileUrl(preview.previewFilePath))}"></audio>
        <div class="artifact-path">${escapeHtml(preview.previewFilePath)}</div>
      `
    : '<div class="empty-row">No preview rendered yet.</div>';

  const exportMarkup = exportResult
    ? `
        <div class="execution-summary">
          <span>Output</span>
          <strong>${escapeHtml(exportResult.outputDirectory)}</strong>
        </div>
        <div class="artifact-list">
          <div class="artifact-path">${escapeHtml(exportResult.artifacts.introPath)}</div>
          <div class="artifact-path">${escapeHtml(exportResult.artifacts.loopPath)}</div>
          <div class="artifact-path">${escapeHtml(exportResult.artifacts.outroPath)}</div>
          <div class="artifact-path">${escapeHtml(exportResult.artifacts.extendedMixPath)}</div>
          <div class="artifact-path">${escapeHtml(exportResult.artifacts.metadataPath)}</div>
        </div>
      `
    : '<div class="empty-row">No exports generated yet.</div>';

  return `
    <div class="execution-grid">
      <div class="execution-row">
        <span>Preview</span>
        <strong class="status-pill ${state.previewStatus}">${formatActionStatus(state.previewStatus)}</strong>
      </div>
      <div class="execution-row">
        <span>Export</span>
        <strong class="status-pill ${state.exportStatus}">${formatActionStatus(state.exportStatus)}</strong>
      </div>
      <div class="execution-row">
        <span>Commit</span>
        <strong class="status-pill ${state.commitStatus}">${formatActionStatus(state.commitStatus)}</strong>
      </div>
      <div class="execution-row">
        <span>Preview Mode</span>
        <strong>${state.previewMode}</strong>
      </div>
      <div class="execution-row">
        <span>Export Folder</span>
        <strong>${escapeHtml(state.exportDirectory || "Default .fastloop-output")}</strong>
      </div>
    </div>
    <div class="execution-panel">
      <div class="block-subtitle">Preview Output</div>
      ${audioMarkup}
    </div>
    <div class="execution-panel">
      <div class="block-subtitle">Export Output</div>
      ${exportMarkup}
    </div>
  `;
}

function hostLabel(state: PanelState): string {
  switch (state.host?.host) {
    case "premiere":
      return "Premiere Pro";
    case "aftereffects":
      return "After Effects";
    case "unknown":
      return "Mock / Desktop";
    default:
      return "Loading";
  }
}

function hostReadiness(state: PanelState): string {
  if (!state.host) {
    return "Detecting host bridge";
  }
  if (state.host.markers.available || state.host.exportHandOff.available) {
    return "Host bridge ready";
  }
  return "Host bridge unavailable";
}

function primaryActionLabel(activeFunction: FunctionMode): string {
  switch (activeFunction) {
    case "preview":
      return "Preview Selected Loop";
    case "export":
    case "bed":
      return "Export Selected Loop";
    case "commit":
      return "Commit to Host";
    default:
      return "Analyze Track";
  }
}

function primaryActionDisabled(
  state: PanelState,
  activeFunction: FunctionMode,
  canActOnCandidate: boolean
): string {
  if ((activeFunction === "analyze" || activeFunction === "finder") && state.analysisStatus === "loading") {
    return "disabled";
  }
  if (activeFunction === "preview" && (!canActOnCandidate || state.previewStatus === "running")) {
    return "disabled";
  }
  if ((activeFunction === "export" || activeFunction === "bed") && (!canActOnCandidate || state.exportStatus === "running")) {
    return "disabled";
  }
  if (activeFunction === "commit" && (!canActOnCandidate || state.commitStatus === "running")) {
    return "disabled";
  }
  return "";
}

function renderOutputDock(state: PanelState): string {
  const exportResult = state.lastExport;
  const preview = state.lastPreview;
  return `
    <section class="output-pane">
      <div class="dock-title">Output / Destination</div>
      <div class="output-grid">
        <label class="output-field">
          <span>Destination</span>
          <input
            id="export-directory-input"
            type="text"
            value="${escapeHtml(state.exportDirectory)}"
            placeholder="Default .fastloop-output"
          />
        </label>
        <div class="output-field readonly">
          <span>Preview WAV</span>
          <strong>${preview ? escapeHtml(preview.previewFilePath) : "No preview rendered"}</strong>
        </div>
        <div class="output-field readonly">
          <span>Intro</span>
          <strong>${exportResult ? escapeHtml(exportResult.artifacts.introPath) : "--"}</strong>
        </div>
        <div class="output-field readonly">
          <span>Loop</span>
          <strong>${exportResult ? escapeHtml(exportResult.artifacts.loopPath) : "--"}</strong>
        </div>
        <div class="output-field readonly">
          <span>Outro</span>
          <strong>${exportResult ? escapeHtml(exportResult.artifacts.outroPath) : "--"}</strong>
        </div>
        <div class="output-field readonly">
          <span>Extended Bed</span>
          <strong>${exportResult ? escapeHtml(exportResult.artifacts.extendedMixPath) : "--"}</strong>
        </div>
        <div class="output-field readonly">
          <span>Metadata JSON</span>
          <strong>${exportResult ? escapeHtml(exportResult.artifacts.metadataPath) : "--"}</strong>
        </div>
      </div>
    </section>
    <section class="log-pane">
      <div class="dock-title">Progress / Log</div>
      <div class="log-row ${state.analysisStatus === "loading" ? "loading" : state.errorMessage ? "error" : "success"}">
        <span>Panel</span>
        <strong>${escapeHtml(state.errorMessage ?? state.statusMessage ?? "Ready.")}</strong>
      </div>
      <div class="log-row">
        <span>Analysis</span>
        <strong>${state.analysisStatus}</strong>
      </div>
      <div class="log-row">
        <span>Preview</span>
        <strong>${state.previewStatus}</strong>
      </div>
      <div class="log-row">
        <span>Export</span>
        <strong>${state.exportStatus}</strong>
      </div>
      <div class="log-row">
        <span>Commit</span>
        <strong>${state.commitStatus}</strong>
      </div>
      ${
        state.queue.length
          ? state.queue
              .map(
                (item) => `
                  <div class="queue-row">
                    <span>${escapeHtml(item.trackId)}</span>
                    <span>${item.status}</span>
                    <span>${item.durationTargetSeconds}s</span>
                    <span>${item.candidateCount}</span>
                    <span>${item.exportState}</span>
                  </div>
                `
              )
              .join("")
          : '<div class="queue-row empty-row">No queued tasks yet.</div>'
      }
    </section>
  `;
}

function render(state: PanelState, activeFunction: FunctionMode): string {
  const track = selectedTrack(state);
  const candidate = selectedCandidate(state);
  const analysis = state.analysis;
  const duration = analysis?.durationSeconds ?? track?.durationSeconds ?? 0;
  const canActOnCandidate = Boolean(candidate && track);

  return `
    <div class="shell utility-shell">
      <header class="topbar">
        <div class="title-block">
          <div class="product-mark">FL</div>
          <div>
            <strong>FastLoop</strong>
            <span>v${PANEL_VERSION}</span>
          </div>
          <span class="host-pill">${hostLabel(state)}</span>
          <span class="status-pill ${state.errorMessage ? "error" : state.analysisStatus === "loading" ? "running" : "success"}">
            ${state.errorMessage ? "Attention" : state.analysisStatus === "loading" ? "Working" : "Ready"}
          </span>
        </div>
        <div class="toolbar">
          <button id="choose-track-button">Add Audio</button>
          <button id="focus-path-button">Track Path</button>
          <button id="sidebar-choose-output-button">Output Folder</button>
          <button disabled>Settings</button>
        </div>
      </header>
      <main class="workspace">
        <aside class="sidebar input-column">
          <section class="panel-block">
            <div class="block-title">
              <span>Input Files</span>
              <small>${state.tracks.length} slots</small>
            </div>
            <div class="input-queue">
            ${state.tracks
              .map(
                (trackRow) => `
                  <button class="track-row ${trackRow.id === state.selectedTrackId ? "selected" : ""}" data-track-id="${trackRow.id}">
                    <span>
                      <strong>${escapeHtml(trackRow.name)}</strong>
                      <small>${escapeHtml(trackRow.sourcePath || "No source selected")}</small>
                    </span>
                    <em>${trackRow.cacheState}</em>
                  </button>
                `
              )
              .join("")}
            </div>
            <div class="button-row">
              <button id="sidebar-choose-track-button">Choose Audio</button>
              <button disabled>Clear</button>
            </div>
            <label class="input-block">
              <span>Selected Track Path</span>
              <input id="track-path-input" type="text" value="${escapeHtml(track?.sourcePath ?? "")}" placeholder="Paste a local audio path" />
            </label>
            <div class="status-line ${state.analysisStatus === "loading" ? "loading" : state.errorMessage ? "error" : "success"}">
              <span>${escapeHtml(state.errorMessage ?? state.statusMessage ?? "Ready.")}</span>
            </div>
            ${renderWarnings(analysis?.warnings ?? [])}
          </section>
          <section class="panel-block compact-block">
            <div class="block-title">Host</div>
            <div class="host-grid">
              <span>Target</span><strong>${hostLabel(state)}</strong>
              <span>Markers</span><strong>${state.host?.markers.available ? "Available" : "Unavailable"}</strong>
              <span>Timeline</span><strong>${state.host?.timelineTiming.available ? "Premiere" : state.host?.compTiming.available ? "After Effects" : "Unavailable"}</strong>
              <span>Handoff</span><strong>${state.host?.exportHandOff.available ? "Available" : "Unavailable"}</strong>
            </div>
          </section>
        </aside>
        <section class="center function-center">
          <section class="function-panel">
            <div class="mode-strip">
              ${FUNCTION_MODES.map(
                (mode) => `
                  <button class="${activeFunction === mode.id ? "active" : ""}" data-function-mode="${mode.id}">
                    ${mode.label}
                  </button>
                `
              ).join("")}
            </div>
            <div class="primary-action-area">
              <div>
                <span class="overline">Active Function</span>
                <strong>${primaryActionLabel(activeFunction)}</strong>
              </div>
              <button
                id="primary-action-button"
                class="primary-action"
                data-primary-action="${activeFunction}"
                ${primaryActionDisabled(state, activeFunction, canActOnCandidate)}
              >
                ${primaryActionLabel(activeFunction)}
              </button>
              <div class="secondary-actions">
                <button id="analyze-button" ${state.analysisStatus === "loading" ? "disabled" : ""}>Analyze Track</button>
                <button id="preview-button" ${canActOnCandidate && state.previewStatus !== "running" ? "" : "disabled"}>Preview</button>
                <button id="export-button" ${canActOnCandidate && state.exportStatus !== "running" ? "" : "disabled"}>Export</button>
                <button id="commit-button" ${canActOnCandidate && state.commitStatus !== "running" ? "" : "disabled"}>Commit</button>
                <button id="place-markers-button" ${canActOnCandidate ? "" : "disabled"}>Place Markers</button>
              </div>
            </div>
          </section>
          <section class="waveform-card">
            <div class="card-header">
              <span>Loop Analysis Work Area</span>
              <div class="segmented">
                ${DURATION_PRESETS.map(
                  (preset) => `
                    <button class="${state.durationTargetSeconds === preset.seconds ? "active" : ""}" data-duration-target="${preset.seconds}">
                      ${preset.label}
                    </button>
                  `
                ).join("")}
              </div>
            </div>
            <div class="card-header compact-header">
              <span>Scoring Mode</span>
              <div class="segmented">
                ${SCORING_MODE_PRESETS.map(
                  (preset) => `
                    <button class="${state.scoringMode === preset.id ? "active" : ""}" data-scoring-mode="${preset.id}">
                      ${preset.label}
                    </button>
                  `
                ).join("")}
              </div>
            </div>
            <div class="wave-meta">
              <span>BPM ${analysis?.bpm?.toFixed(2) ?? "--"}</span>
              <span>Duration ${formatSeconds(duration)}</span>
              <span>Sample Rate ${analysis?.sampleRate ?? "--"}</span>
              <span>Beats ${analysis?.beatTimes.length ?? 0}</span>
              <span>Bars ${analysis?.barTimes.length ?? 0}</span>
              <span>Phrases ${analysis?.phraseTimes.length ?? 0}</span>
              <span>Mode ${analysis?.scoringMode ?? state.scoringMode}</span>
              <span>Rerank ${(analysis?.rerankEnabled ?? (state.scoringMode !== "transparent")) ? "On" : "Off"}</span>
            </div>
            <div class="waveform-grid" data-waveform-grid>
              ${renderWaveformBars(analysis?.waveformPeaks ?? [])}
              <div class="timing-layer">
                ${renderTimingMarkers(analysis?.beatTimes ?? [], analysis?.durationSeconds ?? 0, "beat", 48)}
                ${renderTimingMarkers(analysis?.barTimes ?? [], analysis?.durationSeconds ?? 0, "bar", 24)}
                ${renderTimingMarkers(analysis?.phraseTimes ?? [], analysis?.durationSeconds ?? 0, "phrase", 12)}
                ${renderCandidateOverlay(candidate, analysis)}
              </div>
              <div class="wave-caption">
                ${candidate ? `Selected loop ${formatSeconds(candidate.startSeconds)} -> ${formatSeconds(candidate.endSeconds)}` : "No candidate selected yet."}
              </div>
            </div>
            <div class="action-strip">
              <span>Target Duration</span>
              <strong>${state.durationTargetSeconds}s</strong>
              <div class="segmented">
                <button class="${state.previewMode === "cycle" ? "active" : ""}" data-preview-mode="cycle">1 Cycle</button>
                <button class="${state.previewMode === "repeat" ? "active" : ""}" data-preview-mode="repeat">Looping</button>
              </div>
              <span class="muted">Preview renders a local WAV and attempts in-panel playback.</span>
            </div>
          </section>
          <section class="candidate-card">
            <div class="card-header">
              <span>Loop Candidate Table</span>
              <span class="muted">${track ? escapeHtml(track.name) : "No track selected"}</span>
            </div>
            <div class="candidate-header">
              <span>Score</span>
              <span>Base</span>
              <span>Delta</span>
              <span>Start</span>
              <span>End</span>
              <span>Length</span>
              <span>Bars</span>
              <span>Fit</span>
              <span>AI</span>
              <span>Click</span>
              <span>Use</span>
            </div>
            <div class="candidate-table">
              ${
                state.analysisStatus === "loading"
                  ? '<div class="empty-row candidate-empty">Analyzing track through the engine...</div>'
                  : analysis?.candidates.length
                    ? analysis.candidates
                        .map((loopCandidate) =>
                          renderCandidateRow(loopCandidate, loopCandidate.id === state.selectedCandidateId)
                        )
                        .join("")
                    : '<div class="empty-row candidate-empty">Run analysis to populate ranked loop candidates.</div>'
              }
            </div>
          </section>
        </section>
        <aside class="inspector settings-column">
          <section class="panel-block">
            <div class="block-title">Advanced Options</div>
            <div class="settings-stack">
              <label class="inline-input wide">
                <span>Custom Duration</span>
                <input
                  id="custom-duration-input"
                  type="number"
                  min="2"
                  max="60"
                  step="1"
                  value="${escapeHtml(String(state.durationTargetSeconds))}"
                />
              </label>
              <div class="setting-row">
                <span>Preview Mode</span>
                <div class="segmented">
                  <button class="${state.previewMode === "cycle" ? "active" : ""}" data-preview-mode="cycle">Cycle</button>
                  <button class="${state.previewMode === "repeat" ? "active" : ""}" data-preview-mode="repeat">Repeat</button>
                </div>
              </div>
              <div class="setting-row">
                <span>Rerank</span>
                <strong>${(analysis?.rerankEnabled ?? (state.scoringMode !== "transparent")) ? "Enabled" : "Transparent"}</strong>
              </div>
              <div class="setting-row">
                <span>Host Status</span>
                <strong>${hostReadiness(state)}</strong>
              </div>
            </div>
          </section>
          <section class="panel-block">
            <div class="block-title">Candidate Inspector</div>
            <div class="metric-grid">
              <div><span>BPM</span><strong>${analysis?.bpm ?? "--"}</strong></div>
              <div><span>Bars</span><strong>${analysis?.bars ?? "--"}</strong></div>
              <div><span>Phrase</span><strong>${analysis?.phraseLengthBars ?? "--"}</strong></div>
              <div><span>Mode</span><strong>${analysis?.scoringMode ?? state.scoringMode}</strong></div>
              <div><span>Final Score</span><strong>${candidate?.compositeScore ?? "--"}</strong></div>
              <div><span>Base Score</span><strong>${candidate?.baseDeterministicScore ?? "--"}</strong></div>
              <div><span>AI Delta</span><strong>${candidate ? formatSigned(candidate.rerankDelta) : "--"}</strong></div>
              <div><span>Loop Start</span><strong>${formatSeconds(candidate?.startSeconds)}</strong></div>
              <div><span>Loop End</span><strong>${formatSeconds(candidate?.endSeconds)}</strong></div>
              <div><span>Loop Length</span><strong>${formatSeconds(candidate?.durationSeconds)}</strong></div>
              <div><span>Target</span><strong>${analysis?.targetDurationSeconds ?? state.durationTargetSeconds}s</strong></div>
              <div><span>Duration Fit</span><strong>${candidate?.breakdown.targetDurationUsefulness ?? "--"}</strong></div>
              <div><span>AI Assist</span><strong>${candidate?.breakdown.aiRerankConfidence ?? "--"}</strong></div>
              <div><span>Click Risk</span><strong>${candidate?.breakdown.clickRiskPenalty ?? "--"}</strong></div>
              <div><span>Host Flow</span><strong>${state.host?.markers.available ? "Ready" : "Unavailable"}</strong></div>
            </div>
          </section>
          <section class="panel-block">
            <div class="block-title">Preview / Export / Commit</div>
            ${renderExecutionBlock(state)}
          </section>
          <section class="panel-block">
            <div class="block-title">Score Breakdown</div>
            <div class="breakdown-grid">${renderBreakdown(candidate)}</div>
          </section>
        </aside>
      </main>
      <footer class="queuebar">
        ${renderOutputDock(state)}
      </footer>
    </div>
  `;
}

export async function mountApp(root: HTMLElement, options?: MountOptions): Promise<void> {
  const bridge = options?.bridge ?? getBridge();
  const baseState = options?.initialState ?? createInitialState();
  const state: PanelState = {
    ...baseState,
    tracks: baseState.tracks.map((track) => ({ ...track })),
    queue: baseState.queue.map((item) => ({ ...item })),
    exportDirectory: readStoredValue(EXPORT_DIRECTORY_STORAGE_KEY) || baseState.exportDirectory
  };

  let previewAudio: HTMLAudioElement | null = null;
  let activeFunction: FunctionMode = "analyze";

  async function refreshCapabilities(): Promise<void> {
    state.host = await bridge.getHostCapabilities();
    state.queue = await bridge.getQueue();
  }

  function setStatus(message: string | null, errorMessage: string | null = null): void {
    state.statusMessage = message;
    state.errorMessage = errorMessage;
  }

  function syncQueue(
    status: PanelState["queue"][number]["status"],
    exportState?: PanelState["queue"][number]["exportState"]
  ): void {
    const track = selectedTrack(state);
    if (!track) {
      return;
    }

    const existing = state.queue.find((item) => item.trackId === track.id);
    const next = {
      trackId: track.id,
      status,
      candidateCount: state.analysis?.candidates.length ?? existing?.candidateCount ?? 0,
      durationTargetSeconds: state.durationTargetSeconds,
      exportState: exportState ?? existing?.exportState ?? "none"
    };

    state.queue = existing
      ? state.queue.map((item) => (item.trackId === track.id ? next : item))
      : [next, ...state.queue];
  }

  function updateSelectedTrackPath(nextPath: string): void {
    const track = selectedTrack(state);
    if (!track) {
      return;
    }

    track.sourcePath = nextPath.trim();
    if (track.sourcePath) {
      const segments = track.sourcePath.split(/[\\/]/);
      track.name = segments[segments.length - 1] ?? track.name;
    }
  }

  function updateExportDirectory(nextPath: string): void {
    state.exportDirectory = nextPath.trim();
    writeStoredValue(EXPORT_DIRECTORY_STORAGE_KEY, state.exportDirectory);
  }

  function stopPreviewPlayback(): void {
    if (!previewAudio) {
      return;
    }
    previewAudio.pause();
    previewAudio.src = "";
    previewAudio = null;
  }

  function renderApp(): void {
    root.innerHTML = render(state, activeFunction);
    bindEvents();
  }

  async function startPreviewPlayback(): Promise<void> {
    const audioElement = root.querySelector<HTMLAudioElement>("#preview-audio");
    if (!audioElement) {
      return;
    }

    stopPreviewPlayback();
    previewAudio = audioElement;

    try {
      await previewAudio.play();
    } catch {
      setStatus("Preview rendered. Use the inline audio controls if autoplay is blocked.", null);
      renderApp();
    }
  }

  async function analyzeSelectedTrack(): Promise<void> {
    const track = selectedTrack(state);
    if (!track || !track.sourcePath.trim()) {
      state.analysisStatus = "error";
      setStatus(null, "Provide a local track path before analyzing.");
      renderApp();
      return;
    }

    state.analysisStatus = "loading";
    setStatus(`Analyzing ${track.name}...`, null);
    syncQueue("analyzing");
    renderApp();

    try {
      const result = await bridge.analyzeTrack({
        trackId: track.id,
        sourcePath: track.sourcePath,
        durationTargetSeconds: state.durationTargetSeconds,
        scoringMode: state.scoringMode
      });
      state.analysis = result;
      state.selectedCandidateId = result.candidates[0]?.id ?? null;
      state.lastPreview = null;
      state.lastExport = null;
      state.previewStatus = "idle";
      state.exportStatus = "idle";
      state.commitStatus = "idle";
      track.durationSeconds = result.durationSeconds;
      track.cacheState = "ready";
      state.analysisStatus = "success";
      setStatus(
        `Analyzed ${track.name}: ${result.candidates.length} candidates at ${result.bpm.toFixed(2)} BPM.`,
        null
      );
      syncQueue("ready", "none");
    } catch (error) {
      state.analysisStatus = "error";
      setStatus(null, error instanceof Error ? error.message : "Unknown analysis failure.");
      syncQueue("error", "failed");
    }

    renderApp();
  }

  async function chooseTrackSource(): Promise<void> {
    try {
      const nextPath = await bridge.pickSourceFile(selectedTrack(state)?.sourcePath ?? null);
      if (!nextPath) {
        setStatus("Track selection cancelled.", null);
        renderApp();
        return;
      }

      updateSelectedTrackPath(nextPath);
      setStatus(`Selected source file ${selectedTrack(state)?.name ?? nextPath}.`, null);
    } catch (error) {
      setStatus(null, error instanceof Error ? error.message : "Unable to open the audio picker.");
    }

    renderApp();
  }

  async function chooseExportDirectory(): Promise<void> {
    try {
      const nextPath = await bridge.pickOutputDirectory(state.exportDirectory || null);
      if (!nextPath) {
        setStatus("Export destination selection cancelled.", null);
        renderApp();
        return;
      }

      updateExportDirectory(nextPath);
      setStatus(`Export destination set to ${nextPath}.`, null);
    } catch (error) {
      setStatus(null, error instanceof Error ? error.message : "Unable to choose export destination.");
    }

    renderApp();
  }

  async function placeSelectedCandidateMarkers(): Promise<void> {
    const track = selectedTrack(state);
    const candidate = selectedCandidate(state);
    if (!track || !candidate) {
      setStatus(null, "Select a candidate before sending markers.");
      renderApp();
      return;
    }

    const response = await bridge.placeMarkers({
      trackId: track.id,
      candidate
    });
    setStatus(response.message, response.ok ? null : response.message);
    renderApp();
  }

  async function previewSelectedCandidate(): Promise<void> {
    const track = selectedTrack(state);
    const candidate = selectedCandidate(state);
    if (!track || !candidate) {
      state.previewStatus = "error";
      setStatus(null, "Select a candidate before rendering preview.");
      renderApp();
      return;
    }

    state.previewStatus = "running";
    setStatus(`Preparing ${state.previewMode} preview for ${candidate.id}...`, null);
    renderApp();

    try {
      const response = await bridge.previewCandidate({
        trackId: track.id,
        sourcePath: track.sourcePath,
        candidate,
        previewMode: state.previewMode
      });
      state.lastPreview = response;
      state.previewStatus = response.ok ? "success" : "error";
      setStatus(response.message, response.ok ? null : response.message);
      renderApp();
      if (response.ok) {
        await startPreviewPlayback();
      }
    } catch (error) {
      state.previewStatus = "error";
      setStatus(null, error instanceof Error ? error.message : "Preview render failed.");
      renderApp();
    }
  }

  async function exportSelectedCandidate(): Promise<void> {
    const track = selectedTrack(state);
    const candidate = selectedCandidate(state);
    const analysis = state.analysis;
    if (!track || !candidate || !analysis) {
      state.exportStatus = "error";
      setStatus(null, "Analyze a track and select a candidate before exporting.");
      renderApp();
      return;
    }

    state.exportStatus = "running";
    setStatus(`Exporting intro/loop/outro/full bed for ${candidate.id}...`, null);
    syncQueue("exporting", "planned");
    renderApp();

    try {
      const response = await bridge.exportCandidate({
        trackId: track.id,
        sourcePath: track.sourcePath,
        candidate,
        scoringMode: analysis.scoringMode,
        warnings: analysis.warnings,
        includeIntro: true,
        includeLoop: true,
        includeOutro: true,
        includeExtendedMix: true,
        durationTargetSeconds: state.durationTargetSeconds,
        outputDirectory: state.exportDirectory || null
      });
      state.lastExport = response;
      state.exportStatus = response.ok ? "success" : "error";
      setStatus(response.message, response.ok ? null : response.message);
      syncQueue("ready", response.ok ? "done" : "failed");
    } catch (error) {
      state.exportStatus = "error";
      setStatus(null, error instanceof Error ? error.message : "Export failed.");
      syncQueue("error", "failed");
    }

    renderApp();
  }

  async function commitSelectedCandidate(): Promise<void> {
    const track = selectedTrack(state);
    const candidate = selectedCandidate(state);
    if (!track || !candidate) {
      state.commitStatus = "error";
      setStatus(null, "Select a candidate before committing to the Adobe host.");
      renderApp();
      return;
    }

    state.commitStatus = "running";
    setStatus(`Committing ${candidate.id} to the host...`, null);
    renderApp();

    try {
      const response = await bridge.commitCandidate({
        trackId: track.id,
        candidate,
        renderedAssetPath: state.lastExport?.artifacts.extendedMixPath ?? null
      });
      state.commitStatus = response.ok ? "success" : "error";
      setStatus(response.message, response.ok ? null : response.message);
    } catch (error) {
      state.commitStatus = "error";
      setStatus(null, error instanceof Error ? error.message : "Commit failed.");
    }

    renderApp();
  }

  function updateDurationTarget(next: number): void {
    const normalized = Math.max(2, Math.min(60, Math.round(next)));
    if (!Number.isFinite(normalized) || normalized === state.durationTargetSeconds) {
      return;
    }

    state.durationTargetSeconds = normalized;
    setStatus(`Duration target set to ${normalized}s.`, null);
    renderApp();

    if (state.analysis && state.selectedTrackId === state.analysis.trackId) {
      void analyzeSelectedTrack();
    }
  }

  function updateScoringMode(nextMode: ScoringMode): void {
    if (state.scoringMode === nextMode) {
      return;
    }

    state.scoringMode = nextMode;
    setStatus(`Scoring mode switched to ${nextMode}.`, null);
    renderApp();

    if (state.analysis && state.selectedTrackId === state.analysis.trackId) {
      void analyzeSelectedTrack();
    }
  }

  function updatePreviewMode(nextMode: PreviewMode): void {
    if (state.previewMode === nextMode) {
      return;
    }

    state.previewMode = nextMode;
    setStatus(`Preview mode set to ${nextMode}.`, null);
    renderApp();
  }

  function bindEvents(): void {
    root.querySelector("#primary-action-button")?.addEventListener("click", () => {
      if (activeFunction === "preview") {
        void previewSelectedCandidate();
        return;
      }
      if (activeFunction === "export" || activeFunction === "bed") {
        void exportSelectedCandidate();
        return;
      }
      if (activeFunction === "commit") {
        void commitSelectedCandidate();
        return;
      }
      void analyzeSelectedTrack();
    });

    for (const button of root.querySelectorAll<HTMLButtonElement>("[data-function-mode]")) {
      button.addEventListener("click", () => {
        activeFunction = (button.dataset.functionMode as FunctionMode | undefined) ?? "analyze";
        renderApp();
      });
    }

    root.querySelector("#choose-track-button")?.addEventListener("click", () => {
      void chooseTrackSource();
    });

    root.querySelector("#focus-path-button")?.addEventListener("click", () => {
      root.querySelector<HTMLInputElement>("#track-path-input")?.focus();
    });

    root.querySelector("#sidebar-choose-track-button")?.addEventListener("click", () => {
      void chooseTrackSource();
    });

    root.querySelector("#sidebar-choose-output-button")?.addEventListener("click", () => {
      void chooseExportDirectory();
    });

    root.querySelector("#analyze-button")?.addEventListener("click", () => {
      void analyzeSelectedTrack();
    });

    root.querySelector("#preview-button")?.addEventListener("click", () => {
      void previewSelectedCandidate();
    });

    root.querySelector("#export-button")?.addEventListener("click", () => {
      void exportSelectedCandidate();
    });

    root.querySelector("#commit-button")?.addEventListener("click", () => {
      void commitSelectedCandidate();
    });

    root.querySelector("#place-markers-button")?.addEventListener("click", () => {
      void placeSelectedCandidateMarkers();
    });

    root.querySelector<HTMLInputElement>("#track-path-input")?.addEventListener("input", (event) => {
      updateSelectedTrackPath((event.currentTarget as HTMLInputElement).value);
    });

    root.querySelector<HTMLInputElement>("#export-directory-input")?.addEventListener("input", (event) => {
      updateExportDirectory((event.currentTarget as HTMLInputElement).value);
    });

    for (const button of root.querySelectorAll<HTMLButtonElement>("[data-track-id]")) {
      button.addEventListener("click", () => {
        stopPreviewPlayback();
        state.selectedTrackId = button.dataset.trackId ?? null;
        if (state.analysis?.trackId !== state.selectedTrackId) {
          state.analysis = null;
          state.selectedCandidateId = null;
          state.lastPreview = null;
          state.lastExport = null;
          state.previewStatus = "idle";
          state.exportStatus = "idle";
          state.commitStatus = "idle";
        } else {
          state.selectedCandidateId = state.analysis.candidates[0]?.id ?? null;
        }
        renderApp();
      });
    }

    for (const button of root.querySelectorAll<HTMLButtonElement>("[data-duration-target]")) {
      button.addEventListener("click", () => {
        const next = Number(button.dataset.durationTarget);
        if (Number.isFinite(next)) {
          updateDurationTarget(next);
        }
      });
    }

    root.querySelector<HTMLInputElement>("#custom-duration-input")?.addEventListener("change", (event) => {
      const next = Number((event.currentTarget as HTMLInputElement).value);
      if (Number.isFinite(next)) {
        updateDurationTarget(next);
      }
    });

    for (const button of root.querySelectorAll<HTMLButtonElement>("[data-scoring-mode]")) {
      button.addEventListener("click", () => {
        const nextMode = button.dataset.scoringMode as ScoringMode | undefined;
        if (nextMode) {
          updateScoringMode(nextMode);
        }
      });
    }

    for (const button of root.querySelectorAll<HTMLButtonElement>("[data-preview-mode]")) {
      button.addEventListener("click", () => {
        const nextMode = button.dataset.previewMode as PreviewMode | undefined;
        if (nextMode) {
          updatePreviewMode(nextMode);
        }
      });
    }

    for (const button of root.querySelectorAll<HTMLButtonElement>("[data-candidate-id]")) {
      button.addEventListener("click", () => {
        stopPreviewPlayback();
        state.selectedCandidateId = button.dataset.candidateId ?? null;
        state.lastPreview = null;
        state.previewStatus = "idle";
        renderApp();
      });
    }
  }

  await refreshCapabilities();
  renderApp();
}
