#!/usr/bin/env python3
"""Generate the complete original MusicStudioLab factory WAV library.

All files are procedurally synthesized and are safe to redistribute with this project.
The generator is deterministic so the included library can be rebuilt exactly.
"""
from __future__ import annotations

from pathlib import Path
import json
import math
import wave
import shutil
import numpy as np

RATE = 44_100
SEED = 20260715
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "sounds"
rng = np.random.default_rng(SEED)
manifest: list[dict] = []

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def softclip(audio: np.ndarray, drive: float = 1.0) -> np.ndarray:
    return np.tanh(audio * drive) / max(0.001, np.tanh(drive))


def normalize(audio: np.ndarray, peak: float = 0.94) -> np.ndarray:
    maximum = float(np.max(np.abs(audio))) if audio.size else 0.0
    return audio if maximum < 1e-9 else audio / maximum * peak


def highpass_noise(length: int, strength: float = 0.95) -> np.ndarray:
    noise = rng.uniform(-1.0, 1.0, length)
    shifted = np.concatenate(([0.0], noise[:-1]))
    return noise - shifted * strength


def lowpass(signal: np.ndarray, amount: float = 0.12) -> np.ndarray:
    output = np.empty_like(signal)
    state = 0.0
    for index, sample in enumerate(signal):
        state += amount * (sample - state)
        output[index] = state
    return output


def stereo_pan(mono: np.ndarray, pan: float = 0.0) -> np.ndarray:
    angle = (pan + 1) * math.pi / 4
    return np.stack((mono * math.cos(angle), mono * math.sin(angle)), axis=1)


def write_wav(path: Path, audio: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    audio = normalize(audio)
    if audio.ndim == 1:
        channels = 1
    else:
        channels = audio.shape[1]
    pcm = np.asarray(np.clip(audio, -1, 1) * 32767, dtype="<i2")
    with wave.open(str(path), "wb") as output:
        output.setnchannels(channels)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(pcm.tobytes())


def register(path: Path, *, sample_id: str, name: str, category: str, subtype: str,
             tags: list[str], bpm: int | None = None, root_note: str | None = None,
             description: str = "") -> None:
    with wave.open(str(path), "rb") as source:
        duration = source.getnframes() / source.getframerate()
        channels = source.getnchannels()
    entry = {
        "id": sample_id,
        "name": name,
        "url": "/" + str(path.relative_to(ROOT / "public")).replace("\\", "/"),
        "category": category,
        "subtype": subtype,
        "duration": round(duration, 3),
        "sampleRate": RATE,
        "channels": channels,
        "tags": tags + ["original", "factory", "royalty-free"],
        "description": description,
    }
    if bpm is not None:
        entry["bpm"] = bpm
    if root_note is not None:
        entry["rootNote"] = root_note
    manifest.append(entry)


def timebase(seconds: float) -> np.ndarray:
    return np.arange(max(1, int(seconds * RATE)), dtype=np.float64) / RATE


def synth_kick(index: int) -> np.ndarray:
    seconds = 0.62 + (index % 8) * 0.055
    t = timebase(seconds)
    start = 115 + (index % 7) * 14
    end = 38 + (index % 9) * 1.8
    pitch = end + (start - end) * np.exp(-t / (0.018 + (index % 5) * 0.006))
    phase = np.cumsum(2 * np.pi * pitch / RATE)
    body = np.sin(phase) * np.exp(-t / (0.17 + (index % 6) * 0.028))
    harmonic = np.sin(phase * 2.03) * np.exp(-t / 0.08) * (0.06 + (index % 4) * 0.025)
    click = highpass_noise(len(t), 0.98) * np.exp(-t / (0.0025 + (index % 4) * 0.001)) * (0.09 + (index % 5) * 0.025)
    return softclip(body + harmonic + click, 1.5 + (index % 6) * 0.45)


def synth_snare(index: int) -> np.ndarray:
    seconds = 0.48 + (index % 6) * 0.055
    t = timebase(seconds)
    noise = highpass_noise(len(t), 0.68)
    noise_env = np.exp(-t / (0.10 + (index % 6) * 0.018))
    tone_freq = 145 + (index % 8) * 13
    tone = np.sin(2 * np.pi * tone_freq * t + np.sin(2 * np.pi * 19 * t) * 0.18)
    tone *= np.exp(-t / (0.075 + (index % 5) * 0.016))
    rattle = np.sin(2 * np.pi * (tone_freq * 2.3) * t) * np.exp(-t / 0.035) * 0.12
    return softclip(noise * noise_env * (0.62 + (index % 4) * 0.06) + tone * 0.45 + rattle, 1.3)


def synth_clap(index: int) -> np.ndarray:
    seconds = 0.42 + (index % 5) * 0.045
    t = timebase(seconds)
    noise = highpass_noise(len(t), 0.82)
    env = np.zeros_like(t)
    spacing = 0.009 + (index % 4) * 0.0015
    for burst in range(4):
        start = burst * spacing
        local = np.maximum(0, t - start)
        env += np.where(t >= start, np.exp(-local / (0.012 + burst * 0.004)), 0)
    env += np.exp(-t / (0.12 + (index % 5) * 0.015)) * 0.35
    color = lowpass(noise, 0.25 + (index % 4) * 0.04)
    return softclip((noise * 0.75 + color * 0.35) * env, 1.7)


def synth_hat(index: int, open_hat: bool = False) -> np.ndarray:
    seconds = (0.65 + (index % 5) * 0.09) if open_hat else (0.085 + (index % 7) * 0.014)
    t = timebase(seconds)
    metallic = np.zeros_like(t)
    base = 3800 + (index % 8) * 210
    for ratio, amount in [(1.0, 0.24), (1.342, 0.22), (1.789, 0.18), (2.17, 0.15), (2.73, 0.12), (3.47, 0.09)]:
        metallic += np.sign(np.sin(2 * np.pi * base * ratio * t + index * 0.13)) * amount
    noise = highpass_noise(len(t), 0.985) * 0.42
    decay = (0.23 + (index % 5) * 0.045) if open_hat else (0.026 + (index % 5) * 0.007)
    env = np.exp(-t / decay)
    return softclip((metallic + noise) * env, 1.15)


def synth_perc(index: int) -> np.ndarray:
    seconds = 0.28 + (index % 9) * 0.055
    t = timebase(seconds)
    base = 110 + (index % 12) * 34
    mod_ratio = 1.5 + (index % 7) * 0.37
    mod = np.sin(2 * np.pi * base * mod_ratio * t) * (1.3 + (index % 5) * 0.4) * np.exp(-t / 0.12)
    tone = np.sin(2 * np.pi * base * t + mod)
    overtone = np.sin(2 * np.pi * base * (2.1 + (index % 4) * 0.19) * t) * 0.24
    click = highpass_noise(len(t), 0.9) * np.exp(-t / 0.006) * 0.16
    return softclip((tone + overtone) * np.exp(-t / (0.08 + (index % 8) * 0.025)) + click, 1.45)


def synth_808(index: int, midi: int) -> np.ndarray:
    seconds = 2.4 + (index % 7) * 0.24
    t = timebase(seconds)
    base = 440 * 2 ** ((midi - 69) / 12)
    start_ratio = 1.0 + (index % 5) * 0.22
    pitch = base * (1 + (start_ratio - 1) * np.exp(-t / (0.025 + (index % 4) * 0.012)))
    phase = np.cumsum(2 * np.pi * pitch / RATE)
    fundamental = np.sin(phase)
    second = np.sin(phase * 2) * (0.03 + (index % 6) * 0.024)
    third = np.sin(phase * 3) * (0.015 + (index % 5) * 0.014)
    buzz = np.sin(phase * 4.97) * (index % 4) * 0.008
    attack = np.minimum(1, t / (0.003 + (index % 3) * 0.002))
    release = np.exp(-t / (0.75 + (index % 7) * 0.18))
    click = highpass_noise(len(t), 0.97) * np.exp(-t / 0.004) * (0.02 + (index % 4) * 0.012)
    return softclip((fundamental + second + third + buzz) * attack * release + click, 1.05 + (index % 8) * 0.42)


def synth_transition(index: int, kind: str) -> np.ndarray:
    seconds = 2.2 + (index % 6) * 0.45
    t = timebase(seconds)
    progress = t / max(t[-1], 1e-9)
    if kind == "riser":
        freq = 90 * (2 ** (progress * (4.5 + (index % 4))))
        env = progress ** 1.4
    elif kind == "downlifter":
        freq = 9000 * (2 ** (-progress * (5 + (index % 3))))
        env = (1 - progress) ** 0.45
    else:
        freq = 55 + np.exp(-progress * 7) * (160 + index * 8)
        env = np.exp(-t / (0.42 + (index % 4) * 0.08))
    phase = np.cumsum(2 * np.pi * freq / RATE)
    noise = highpass_noise(len(t), 0.72)
    tone = np.sin(phase) + np.sin(phase * 1.503) * 0.35
    if kind == "impact":
        transient = highpass_noise(len(t), 0.96) * np.exp(-t / 0.012) * 0.85
        return softclip(tone * env * 0.8 + noise * env * 0.25 + transient, 1.8)
    return softclip(tone * env * 0.32 + noise * env * (0.25 + progress * 0.35), 1.25)


def synth_texture(index: int) -> np.ndarray:
    seconds = 3.5 + (index % 8) * 0.42
    t = timebase(seconds)
    white = rng.uniform(-1, 1, len(t))
    colored = lowpass(white, 0.01 + (index % 6) * 0.008)
    shimmer = np.sin(2 * np.pi * (110 + index * 13) * t + np.sin(2 * np.pi * 0.13 * t) * 2.5)
    flutter = 0.6 + 0.4 * np.sin(2 * np.pi * (0.08 + index * 0.011) * t + index)
    mono = colored * 0.55 + shimmer * 0.12 * flutter
    left = np.roll(mono, int((0.003 + (index % 5) * 0.001) * RATE))
    right = np.roll(mono, -int((0.004 + (index % 6) * 0.001) * RATE))
    return softclip(np.stack((left, right), axis=1), 1.1)


def add_clip(destination: np.ndarray, source: np.ndarray, start: int, gain: float = 1.0, pan: float = 0.0) -> None:
    if destination.ndim == 2 and source.ndim == 1:
        source = stereo_pan(source, pan)
    end = min(len(destination), start + len(source))
    if start >= end:
        return
    destination[start:end] += source[:end-start] * gain


def make_drum_loop(index: int, bpm: int) -> np.ndarray:
    bars = 4
    beat = 60 / bpm
    seconds = bars * 4 * beat
    loop = np.zeros((int(seconds * RATE), 2), dtype=np.float64)
    kick = synth_kick(index % 32)
    snare = synth_snare(index % 24)
    hat = synth_hat(index % 24, False)
    open_hat = synth_hat(index % 16, True)
    perc = synth_perc(index % 28)
    step_seconds = beat / 4
    for step in range(bars * 16):
        position = int(step * step_seconds * RATE)
        if step % 16 in ({0, 7, 10, 14} if index % 3 == 0 else {0, 6, 11} if index % 3 == 1 else {0, 5, 8, 13}):
            add_clip(loop, kick, position, 0.86)
        if step % 16 in {4, 12}:
            add_clip(loop, snare, position, 0.72, 0.02)
        if step % 2 == 0 or (index % 4 == 0 and step % 4 == 3):
            swing = int((step % 2) * step_seconds * 0.16 * RATE)
            add_clip(loop, hat, position + swing, 0.28 + (step % 8 == 6) * 0.12, (-0.35 if step % 4 == 0 else 0.35))
        if step % 16 == 10 and index % 2 == 0:
            add_clip(loop, open_hat, position, 0.32, 0.22)
        if step % 16 in {3, 15} and index % 3 == 2:
            add_clip(loop, perc, position, 0.24, -0.22)
    return softclip(loop, 1.18)


def synth_note(freq: float, seconds: float, style: int, pan: float) -> np.ndarray:
    t = timebase(seconds)
    phase = 2 * np.pi * freq * t
    if style % 4 == 0:
        wave_data = np.sin(phase) * 0.72 + np.sin(phase * 2) * 0.18 + np.sin(phase * 3) * 0.1
    elif style % 4 == 1:
        wave_data = (2 * ((freq * t) % 1) - 1) * 0.65 + np.sin(phase) * 0.35
    elif style % 4 == 2:
        wave_data = np.sign(np.sin(phase)) * 0.42 + np.sin(phase) * 0.58
    else:
        wave_data = np.sin(phase + np.sin(phase * 2.5) * 1.6) * 0.75 + np.sin(phase * 0.5) * 0.25
    attack = np.minimum(1, t / (0.006 + style % 5 * 0.012))
    decay = np.exp(-t / (0.32 + style % 6 * 0.12))
    mono = softclip(wave_data * attack * decay, 1.25)
    return stereo_pan(mono, pan)


def make_melody_loop(index: int, bpm: int) -> tuple[np.ndarray, str]:
    bars = 4
    beat = 60 / bpm
    seconds = bars * 4 * beat
    loop = np.zeros((int(seconds * RATE), 2), dtype=np.float64)
    roots = [48, 50, 51, 53, 55, 56, 58, 60]
    root = roots[index % len(roots)]
    scale = [0, 3, 5, 7, 10, 12, 15, 17]
    pattern = [0, 2, 4, 1, 5, 3, 6, 2] if index % 2 == 0 else [0, 4, 2, 5, 1, 6, 3, 7]
    step_seconds = beat / 2
    for note_index, degree in enumerate(pattern * 2):
        midi = root + scale[(degree + index // 3) % len(scale)]
        freq = 440 * 2 ** ((midi - 69) / 12)
        note = synth_note(freq, step_seconds * (1.55 if note_index % 4 == 0 else 0.86), index, -0.32 + (note_index % 5) * 0.16)
        add_clip(loop, note, int(note_index * step_seconds * RATE), 0.44)
    # subtle tape/noise bed
    bed = lowpass(rng.uniform(-1, 1, len(loop)), 0.006) * 0.018
    loop += np.stack((bed, np.roll(bed, 237)), axis=1)
    root_name = f"{NOTE_NAMES[root % 12]}{root // 12 - 1}"
    return softclip(loop, 1.16), root_name


def make_wavetable(index: int) -> np.ndarray:
    seconds = 0.35
    t = timebase(seconds)
    freq = 110
    phase = 2 * np.pi * freq * t
    style = index % 8
    if style == 0:
        signal = np.sin(phase)
    elif style == 1:
        signal = 2 * ((freq * t) % 1) - 1
    elif style == 2:
        signal = np.sign(np.sin(phase))
    elif style == 3:
        signal = 1 - 4 * np.abs(np.round((freq * t) % 1) - ((freq * t) % 1))
    elif style == 4:
        signal = np.sin(phase) + np.sin(phase * 3) * 0.35 + np.sin(phase * 5) * 0.18
    elif style == 5:
        signal = np.sin(phase + np.sin(phase * (2 + index % 5)) * (0.7 + index % 4 * 0.3))
    elif style == 6:
        signal = np.sign(np.sin(phase)) * 0.45 + np.sin(phase * 2.71) * 0.35 + np.sin(phase * 5.43) * 0.2
    else:
        signal = (2 * ((freq * t) % 1) - 1) * 0.55 + np.sin(phase) * 0.45
    return softclip(signal, 1.05 + (index % 5) * 0.22)


def make_impulse(index: int) -> np.ndarray:
    seconds = 1.2 + (index % 6) * 0.42
    t = timebase(seconds)
    decay = 2.0 + (index % 5) * 0.8
    envelope = (1 - t / seconds) ** decay
    left = rng.uniform(-1, 1, len(t)) * envelope
    right = rng.uniform(-1, 1, len(t)) * envelope
    if index % 3 == 0:
        reflections = np.zeros_like(left)
        for delay_ms, amount in [(17, 0.6), (41, 0.42), (73, 0.28), (113, 0.18)]:
            offset = int(delay_ms / 1000 * RATE)
            reflections[offset:] += left[:-offset] * amount
        left += reflections
        right += np.roll(reflections, 191)
    return normalize(np.stack((left, right), axis=1), 0.72)


def generate() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True, exist_ok=True)

    families = [
        ("kick", 32, synth_kick, "Kick", "drums"),
        ("snare", 24, synth_snare, "Snare", "drums"),
        ("clap", 20, synth_clap, "Clap", "drums"),
        ("hat_closed", 24, lambda i: synth_hat(i, False), "Closed Hat", "drums"),
        ("hat_open", 16, lambda i: synth_hat(i, True), "Open Hat", "drums"),
        ("perc", 28, synth_perc, "Percussion", "drums"),
    ]
    for prefix, count, function, label, folder in families:
        for index in range(count):
            sample_id = f"{prefix}_{index + 1:02d}"
            path = OUT / folder / f"{sample_id}.wav"
            write_wav(path, function(index))
            register(path, sample_id=sample_id, name=f"{label} {index + 1:02d}", category="Drums", subtype=label,
                     tags=[prefix, "hip-hop", "trap", "one-shot"], description=f"Original synthesized {label.lower()} one-shot.")

    roots = [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]
    for index in range(36):
        midi = roots[index % len(roots)]
        note_name = f"{NOTE_NAMES[midi % 12]}{midi // 12 - 1}"
        sample_id = f"808_{index + 1:02d}_{NOTE_NAMES[midi % 12].replace('#', 's').lower()}"
        path = OUT / "808" / f"{sample_id}.wav"
        write_wav(path, synth_808(index, midi))
        register(path, sample_id=sample_id, name=f"Tuned 808 {index + 1:02d} · {note_name}", category="Bass", subtype="808",
                 tags=["808", "sub", "tuned", "trap", "drill"], root_note=note_name,
                 description="Long tuned 808 one-shot with original harmonic and saturation profile.")

    for kind, count, label in [("riser", 12, "Riser"), ("downlifter", 12, "Downlifter"), ("impact", 12, "Impact")]:
        for index in range(count):
            sample_id = f"{kind}_{index + 1:02d}"
            path = OUT / "fx" / kind / f"{sample_id}.wav"
            write_wav(path, stereo_pan(synth_transition(index, kind), (index % 5 - 2) * 0.12))
            register(path, sample_id=sample_id, name=f"{label} {index + 1:02d}", category="FX", subtype=label,
                     tags=[kind, "transition", "cinematic", "hip-hop"], description=f"Original {label.lower()} transition effect.")

    for index in range(24):
        sample_id = f"texture_{index + 1:02d}"
        path = OUT / "textures" / f"{sample_id}.wav"
        write_wav(path, synth_texture(index))
        register(path, sample_id=sample_id, name=f"Atmospheric Texture {index + 1:02d}", category="FX", subtype="Texture",
                 tags=["texture", "atmosphere", "noise", "stereo"], description="Original stereo atmosphere for intros, breakdowns, and layering.")

    bpms = [120, 128, 132, 136, 140, 142, 145, 148, 150, 154, 160, 164]
    for index in range(24):
        bpm = bpms[index % len(bpms)]
        sample_id = f"drum_loop_{bpm}_{index + 1:02d}"
        path = OUT / "loops" / "drums" / f"{sample_id}.wav"
        write_wav(path, make_drum_loop(index, bpm))
        register(path, sample_id=sample_id, name=f"Hip-Hop Drum Loop {index + 1:02d} · {bpm} BPM", category="Loops", subtype="Drum Loop",
                 tags=["loop", "drums", "hip-hop", "trap", "four-bars"], bpm=bpm,
                 description="Original four-bar drum loop with kick, snare, hats, swing, and percussion.")

    for index in range(24):
        bpm = bpms[(index * 5) % len(bpms)]
        audio, root_note = make_melody_loop(index, bpm)
        sample_id = f"melody_loop_{bpm}_{index + 1:02d}"
        path = OUT / "loops" / "melody" / f"{sample_id}.wav"
        write_wav(path, audio)
        register(path, sample_id=sample_id, name=f"Melody Loop {index + 1:02d} · {bpm} BPM · {root_note}", category="Loops", subtype="Melody Loop",
                 tags=["loop", "melody", "minor", "hip-hop", "original"], bpm=bpm, root_note=root_note,
                 description="Original four-bar minor-key synth melody loop.")

    for index in range(32):
        sample_id = f"wavetable_{index + 1:02d}"
        path = OUT / "wavetables" / f"{sample_id}.wav"
        write_wav(path, make_wavetable(index))
        register(path, sample_id=sample_id, name=f"Wavetable Source {index + 1:02d}", category="Synth Sources", subtype="Wavetable",
                 tags=["wavetable", "oscillator", "synthesis", "tone"], root_note="A2",
                 description="Original periodic source waveform for resampling and custom oscillator design.")

    for index in range(12):
        sample_id = f"impulse_{index + 1:02d}"
        path = OUT / "impulses" / f"{sample_id}.wav"
        write_wav(path, make_impulse(index))
        register(path, sample_id=sample_id, name=f"Space Impulse {index + 1:02d}", category="Impulse Responses", subtype="Reverb IR",
                 tags=["impulse", "reverb", "space", "convolution"],
                 description="Original stereo convolution impulse response.")

    manifest.sort(key=lambda entry: (entry["category"], entry["subtype"], entry["name"]))
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"Generated {len(manifest)} original WAV assets in {OUT}")


if __name__ == "__main__":
    generate()
