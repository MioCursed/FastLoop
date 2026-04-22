from dataclasses import dataclass


@dataclass(slots=True)
class EngineConfig:
    working_sample_rate: int = 44100
    min_loop_seconds: float = 2.0
    max_loop_seconds: float = 60.0
    cache_directory: str = ".fastloop-cache"
    waveform_points: int = 512
    boundary_window_seconds: float = 0.35
    beats_per_bar: int = 4
    max_candidates: int = 24
