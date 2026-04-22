export function createInitialState() {
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
        lastPreview: null,
        lastExport: null,
        statusMessage: "Ready for analysis.",
        errorMessage: null
    };
}
