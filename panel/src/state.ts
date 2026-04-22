import type {
  AnalysisResult,
  ExportResult,
  HostCapabilities,
  LibraryTrack,
  PreviewMode,
  PreviewResult,
  QueueItem,
  ScoringMode
} from "@fastloop/shared";

export type AnalysisStatus = "idle" | "loading" | "success" | "error";
export type ActionStatus = "idle" | "running" | "success" | "error";

export interface PanelState {
  host: HostCapabilities | null;
  tracks: LibraryTrack[];
  selectedTrackId: string | null;
  selectedCandidateId: string | null;
  analysis: AnalysisResult | null;
  queue: QueueItem[];
  analysisStatus: AnalysisStatus;
  durationTargetSeconds: number;
  scoringMode: ScoringMode;
  previewMode: PreviewMode;
  previewStatus: ActionStatus;
  exportStatus: ActionStatus;
  commitStatus: ActionStatus;
  exportDirectory: string;
  lastPreview: PreviewResult | null;
  lastExport: ExportResult | null;
  statusMessage: string | null;
  errorMessage: string | null;
}

export function createInitialState(): PanelState {
  return {
    host: null,
    tracks: [
      {
        id: "track-01",
        name: "Workspace Fixture",
        sourcePath: "c:/Users/Nataniel/Downloads/FastLoop/engine/tests/generated/loop_fixture.wav",
        durationSeconds: 0,
        cacheState: "missing"
      },
      {
        id: "track-02",
        name: "Paste Track Path",
        sourcePath: "",
        durationSeconds: 0,
        cacheState: "missing"
      }
    ],
    selectedTrackId: "track-01",
    selectedCandidateId: null,
    analysis: null,
    queue: [],
    analysisStatus: "idle",
    durationTargetSeconds: 8,
    scoringMode: "duration-priority",
    previewMode: "repeat",
    previewStatus: "idle",
    exportStatus: "idle",
    commitStatus: "idle",
    exportDirectory: "",
    lastPreview: null,
    lastExport: null,
    statusMessage: "Ready for analysis.",
    errorMessage: null
  };
}
