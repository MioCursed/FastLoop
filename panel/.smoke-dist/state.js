export function createInitialState() {
    return {
        host: null,
        tracks: [
            {
                id: "track-01",
                name: "Track 1",
                sourcePath: "",
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
