import { DURATION_PRESETS, SCORING_MODE_PRESETS } from "@fastloop/shared";
import { getBridge } from "./adobe.js";
import { createInitialState } from "./state.js";
function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
function formatSeconds(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return "--";
    }
    return `${value.toFixed(2)}s`;
}
function formatSigned(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return "--";
    }
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}
function selectedTrack(state) {
    return state.tracks.find((track) => track.id === state.selectedTrackId) ?? null;
}
function selectedCandidate(state) {
    if (!state.analysis) {
        return null;
    }
    return (state.analysis.candidates.find((candidate) => candidate.id === state.selectedCandidateId) ??
        state.analysis.candidates[0] ??
        null);
}
function renderWaveformBars(peaks) {
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
function renderTimingMarkers(times, durationSeconds, className, maxMarkers) {
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
function renderCandidateOverlay(candidate, analysis) {
    if (!candidate || !analysis || analysis.durationSeconds <= 0) {
        return "";
    }
    const left = (candidate.startSeconds / analysis.durationSeconds) * 100;
    const width = ((candidate.endSeconds - candidate.startSeconds) / analysis.durationSeconds) * 100;
    return `<div class="candidate-overlay" style="left:${left}%; width:${Math.max(width, 0.6)}%;"></div>`;
}
function renderCandidateRow(candidate, isSelected) {
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
function renderWarnings(warnings) {
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
function renderBreakdown(candidate) {
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
        .map(([label, value]) => `
        <div class="breakdown-row">
          <span>${label}</span>
          <strong>${Number(value).toFixed(1)}</strong>
        </div>
      `)
        .join("");
}
function render(state) {
    const track = selectedTrack(state);
    const candidate = selectedCandidate(state);
    const analysis = state.analysis;
    const duration = analysis?.durationSeconds ?? track?.durationSeconds ?? 0;
    return `
    <div class="shell">
      <header class="topbar">
        <div class="title-block">
          <strong>FastLoop</strong>
          <span class="host-pill">${state.host?.host ?? "loading"}</span>
        </div>
        <div class="toolbar">
          <button id="focus-path-button">Track Path</button>
          <button id="analyze-button" ${state.analysisStatus === "loading" ? "disabled" : ""}>Analyze Track</button>
          <button id="place-markers-button" ${candidate ? "" : "disabled"}>Place Markers</button>
          <button disabled>Preview Seamless Loop</button>
          <button disabled>Export</button>
          <button disabled>Settings</button>
        </div>
      </header>
      <main class="workspace">
        <aside class="sidebar">
          <nav class="nav">
            <button class="nav-item active">Library</button>
            <button class="nav-item">Analyze</button>
            <button class="nav-item">Candidates</button>
            <button class="nav-item">Build Bed</button>
            <button class="nav-item">Export</button>
            <button class="nav-item">Queue</button>
            <button class="nav-item">Presets</button>
            <button class="nav-item">Settings</button>
          </nav>
          <section class="panel-block">
            <div class="block-title">Tracks</div>
            ${state.tracks
        .map((trackRow) => `
                  <button class="track-row ${trackRow.id === state.selectedTrackId ? "selected" : ""}" data-track-id="${trackRow.id}">
                    <span>${escapeHtml(trackRow.name)}</span>
                    <small>${trackRow.cacheState}</small>
                  </button>
                `)
        .join("")}
            <label class="input-block">
              <span>Selected Track Source</span>
              <input id="track-path-input" type="text" value="${escapeHtml(track?.sourcePath ?? "")}" placeholder="Paste a local audio path" />
            </label>
            <div class="status-line ${state.analysisStatus}">
              <span>${escapeHtml(state.errorMessage ?? state.statusMessage ?? "Ready.")}</span>
            </div>
            ${renderWarnings(analysis?.warnings ?? [])}
          </section>
        </aside>
        <section class="center">
          <section class="waveform-card">
            <div class="card-header">
              <span>Waveform</span>
              <div class="segmented">
                ${DURATION_PRESETS.map((preset) => `
                    <button class="${state.durationTargetSeconds === preset.seconds ? "active" : ""}" data-duration-target="${preset.seconds}">
                      ${preset.label}
                    </button>
                  `).join("")}
              </div>
            </div>
            <div class="card-header compact-header">
              <span>Ranking Mode</span>
              <div class="segmented">
                ${SCORING_MODE_PRESETS.map((preset) => `
                    <button class="${state.scoringMode === preset.id ? "active" : ""}" data-scoring-mode="${preset.id}">
                      ${preset.label}
                    </button>
                  `).join("")}
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
              <label class="inline-input">
                <span>Custom</span>
                <input
                  id="custom-duration-input"
                  type="number"
                  min="2"
                  max="60"
                  step="1"
                  value="${escapeHtml(String(state.durationTargetSeconds))}"
                />
              </label>
              <span class="muted">Mode-aware ranking reruns against the real engine after analysis.</span>
            </div>
          </section>
          <section class="candidate-card">
            <div class="card-header">
              <span>Ranked Candidates</span>
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
              ${state.analysisStatus === "loading"
        ? '<div class="empty-row candidate-empty">Analyzing track through the engine...</div>'
        : analysis?.candidates.length
            ? analysis.candidates
                .map((loopCandidate) => renderCandidateRow(loopCandidate, loopCandidate.id === state.selectedCandidateId))
                .join("")
            : '<div class="empty-row candidate-empty">Run analysis to populate ranked loop candidates.</div>'}
            </div>
          </section>
        </section>
        <aside class="inspector">
          <section class="panel-block">
            <div class="block-title">Inspector</div>
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
            <div class="block-title">Score Breakdown</div>
            <div class="breakdown-grid">${renderBreakdown(candidate)}</div>
          </section>
        </aside>
      </main>
      <footer class="queuebar">
        <div class="queue-header">Queue</div>
        ${state.queue.length
        ? state.queue
            .map((item) => `
                    <div class="queue-row">
                      <span>${escapeHtml(item.trackId)}</span>
                      <span>${item.status}</span>
                      <span>${item.durationTargetSeconds}s</span>
                      <span>${item.candidateCount}</span>
                      <span>${item.exportState}</span>
                    </div>
                  `)
            .join("")
        : '<div class="queue-row empty-row">No queued tasks yet.</div>'}
      </footer>
    </div>
  `;
}
export async function mountApp(root, options) {
    const bridge = options?.bridge ?? getBridge();
    const baseState = options?.initialState ?? createInitialState();
    const state = {
        ...baseState,
        tracks: baseState.tracks.map((track) => ({ ...track })),
        queue: baseState.queue.map((item) => ({ ...item }))
    };
    async function refreshCapabilities() {
        state.host = await bridge.getHostCapabilities();
        state.queue = await bridge.getQueue();
    }
    function setStatus(message, errorMessage = null) {
        state.statusMessage = message;
        state.errorMessage = errorMessage;
    }
    function syncQueue(status) {
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
            exportState: existing?.exportState ?? "none"
        };
        state.queue = existing
            ? state.queue.map((item) => (item.trackId === track.id ? next : item))
            : [next, ...state.queue];
    }
    function updateSelectedTrackPath(nextPath) {
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
    function renderApp() {
        root.innerHTML = render(state);
        bindEvents();
    }
    async function analyzeSelectedTrack() {
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
            track.durationSeconds = result.durationSeconds;
            track.cacheState = "ready";
            state.analysisStatus = "success";
            setStatus(`Analyzed ${track.name}: ${result.candidates.length} candidates at ${result.bpm.toFixed(2)} BPM.`, null);
            syncQueue("ready");
        }
        catch (error) {
            state.analysisStatus = "error";
            setStatus(null, error instanceof Error ? error.message : "Unknown analysis failure.");
            syncQueue("error");
        }
        renderApp();
    }
    async function placeSelectedCandidateMarkers() {
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
    function updateDurationTarget(next) {
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
    function updateScoringMode(nextMode) {
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
    function bindEvents() {
        root.querySelector("#focus-path-button")?.addEventListener("click", () => {
            root.querySelector("#track-path-input")?.focus();
        });
        root.querySelector("#analyze-button")?.addEventListener("click", () => {
            void analyzeSelectedTrack();
        });
        root.querySelector("#place-markers-button")?.addEventListener("click", () => {
            void placeSelectedCandidateMarkers();
        });
        root.querySelector("#track-path-input")?.addEventListener("input", (event) => {
            updateSelectedTrackPath(event.currentTarget.value);
        });
        for (const button of root.querySelectorAll("[data-track-id]")) {
            button.addEventListener("click", () => {
                state.selectedTrackId = button.dataset.trackId ?? null;
                if (state.analysis?.trackId !== state.selectedTrackId) {
                    state.analysis = null;
                    state.selectedCandidateId = null;
                }
                else {
                    state.selectedCandidateId = state.analysis.candidates[0]?.id ?? null;
                }
                renderApp();
            });
        }
        for (const button of root.querySelectorAll("[data-duration-target]")) {
            button.addEventListener("click", () => {
                const next = Number(button.dataset.durationTarget);
                if (Number.isFinite(next)) {
                    updateDurationTarget(next);
                }
            });
        }
        root.querySelector("#custom-duration-input")?.addEventListener("change", (event) => {
            const next = Number(event.currentTarget.value);
            if (Number.isFinite(next)) {
                updateDurationTarget(next);
            }
        });
        for (const button of root.querySelectorAll("[data-scoring-mode]")) {
            button.addEventListener("click", () => {
                const nextMode = button.dataset.scoringMode;
                if (nextMode) {
                    updateScoringMode(nextMode);
                }
            });
        }
        for (const button of root.querySelectorAll("[data-candidate-id]")) {
            button.addEventListener("click", () => {
                state.selectedCandidateId = button.dataset.candidateId ?? null;
                renderApp();
            });
        }
    }
    await refreshCapabilities();
    renderApp();
}
