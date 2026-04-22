export const DURATION_PRESETS = [
    { label: "2s", seconds: 2 },
    { label: "4s", seconds: 4 },
    { label: "6s", seconds: 6 },
    { label: "8s", seconds: 8 },
    { label: "10s", seconds: 10 },
    { label: "15s", seconds: 15 },
    { label: "20s", seconds: 20 },
    { label: "30s", seconds: 30 },
    { label: "45s", seconds: 45 },
    { label: "60s", seconds: 60 }
];
export const SCENE_PRESETS = [
    { id: "vlog", label: "Vlog", scoringMode: "smart", preferredDurations: [15, 30, 60] },
    { id: "gaming", label: "Gaming", scoringMode: "musical-similarity", preferredDurations: [10, 20, 30] },
    { id: "cinematic", label: "Cinematic", scoringMode: "transparent", preferredDurations: [30, 45, 60] },
    { id: "trap", label: "Trap", scoringMode: "duration-priority", preferredDurations: [8, 15, 30] },
    { id: "ambient", label: "Ambient", scoringMode: "musical-similarity", preferredDurations: [20, 30, 60] },
    { id: "drill", label: "Drill", scoringMode: "smart", preferredDurations: [10, 15, 30] },
    { id: "documentary", label: "Documentary", scoringMode: "transparent", preferredDurations: [15, 30, 45] },
    { id: "tutorial", label: "Tutorial", scoringMode: "duration-priority", preferredDurations: [15, 30, 60] }
];
