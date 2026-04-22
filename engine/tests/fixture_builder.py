from __future__ import annotations

from pathlib import Path

import numpy as np
import soundfile as sf


def create_loop_fixture(destination: Path, sample_rate: int = 44100) -> Path:
    bpm = 120.0
    beats_per_bar = 4
    bars = 16
    beat_duration = 60.0 / bpm
    total_duration = beat_duration * beats_per_bar * bars
    samples = np.zeros(int(total_duration * sample_rate), dtype=np.float32)

    for beat_index in range(beats_per_bar * bars):
        start = int(beat_index * beat_duration * sample_rate)
        pulse_length = int(0.045 * sample_rate)
        pulse_t = np.linspace(0, pulse_length / sample_rate, num=pulse_length, endpoint=False)
        accent = 1.0 if beat_index % beats_per_bar == 0 else 0.55
        pulse = accent * np.sin(2.0 * np.pi * 1200.0 * pulse_t) * np.hanning(pulse_length)
        end = min(start + pulse_length, len(samples))
        samples[start:end] += pulse[: end - start]

    t = np.linspace(0, total_duration, num=len(samples), endpoint=False)
    progression = [220.0, 261.63, 329.63, 293.66]
    bar_duration = beat_duration * beats_per_bar
    for bar_index in range(bars):
        freq = progression[bar_index % len(progression)]
        start = int(bar_index * bar_duration * sample_rate)
        end = int((bar_index + 1) * bar_duration * sample_rate)
        envelope = np.hanning(max(end - start, 2))
        tone = 0.2 * np.sin(2.0 * np.pi * freq * t[start:end]) * envelope
        samples[start:end] += tone.astype(np.float32)

    max_abs = np.max(np.abs(samples))
    if max_abs > 0:
        samples = samples / max_abs * 0.85

    destination.parent.mkdir(parents=True, exist_ok=True)
    sf.write(destination, samples, sample_rate)
    return destination


if __name__ == "__main__":
    target = Path(__file__).resolve().parent / "generated" / "loop_fixture.wav"
    path = create_loop_fixture(target)
    print(path)
