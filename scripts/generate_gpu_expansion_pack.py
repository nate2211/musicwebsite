#!/usr/bin/env python3
"""Generate the original DAW 8.0 GPU Production Expansion Pack."""
from pathlib import Path
import json, math, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "sounds" / "gpu-production"
MANIFEST = ROOT / "public" / "sounds" / "manifest.json"
RATE = 44100
rng = np.random.default_rng(20260717)


def lowpass(signal, coefficient):
    output = np.empty_like(signal)
    state = 0.0
    for index, value in enumerate(signal):
        state += coefficient * (value - state)
        output[index] = state
    return output


def normalize(audio, peak=0.82):
    maximum = float(np.max(np.abs(audio))) if audio.size else 0
    return audio if maximum < 1e-9 else audio / maximum * peak


def write(path, audio):
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.asarray(np.clip(normalize(audio), -1, 1) * 32767, dtype="<i2")
    with wave.open(str(path), "wb") as target:
        target.setnchannels(2)
        target.setsampwidth(2)
        target.setframerate(RATE)
        target.writeframes(pcm.tobytes())


def chord_bed(index, seconds):
    length = int(seconds * RATE)
    t = np.arange(length, dtype=np.float64) / RATE
    roots = [48, 50, 51, 53, 55, 56, 58, 60]
    root = roots[index % len(roots)]
    intervals = ([0, 3, 7, 10], [0, 4, 7, 11], [0, 5, 7, 12])[index % 3]
    left = np.zeros(length)
    right = np.zeros(length)
    attack = np.minimum(1, t / (0.35 + (index % 4) * 0.18))
    release = np.minimum(1, (seconds - t) / (0.8 + (index % 5) * 0.18))
    envelope = np.clip(attack * release, 0, 1)
    for voice, interval in enumerate(intervals):
        midi = root + interval
        frequency = 440 * 2 ** ((midi - 69) / 12)
        phase = 2 * np.pi * frequency * t
        detune = 1 + (voice - 1.5) * 0.0018
        wave_data = np.sin(phase) * 0.68 + np.sin(phase * 2 * detune) * 0.16 + np.sin(phase * 3.01) * 0.07
        motion = 0.78 + 0.22 * np.sin(2 * np.pi * (0.07 + index * 0.002) * t + voice)
        pan = -0.65 + voice * 0.43
        left += wave_data * motion * envelope * math.cos((pan + 1) * math.pi / 4) / len(intervals)
        right += wave_data * motion * envelope * math.sin((pan + 1) * math.pi / 4) / len(intervals)
    tape = lowpass(rng.uniform(-1, 1, length), 0.006) * 0.018
    left += tape
    right += np.roll(tape, 311)
    return np.stack((np.tanh(left * 1.08), np.tanh(right * 1.08)), axis=1), root


def air_texture(index, seconds):
    length = int(seconds * RATE)
    t = np.arange(length, dtype=np.float64) / RATE
    noise_l = rng.uniform(-1, 1, length)
    noise_r = rng.uniform(-1, 1, length)
    smooth_l = lowpass(noise_l, 0.012 + (index % 5) * 0.003)
    smooth_r = lowpass(noise_r, 0.011 + (index % 6) * 0.003)
    shimmer = np.sin(2 * np.pi * (320 + index * 17) * t + np.sin(2 * np.pi * 0.09 * t) * 1.7)
    pulse = 0.62 + 0.38 * np.sin(2 * np.pi * (0.055 + index * 0.003) * t + index)
    fade = np.minimum(1, t / 0.55) * np.minimum(1, (seconds - t) / 0.8)
    left = (smooth_l * 0.68 + shimmer * 0.045 * pulse) * fade
    right = (smooth_r * 0.68 + np.roll(shimmer, 167) * 0.045 * (1.2 - pulse)) * fade
    return np.stack((left, right), axis=1)


def motion_pulse(index, seconds):
    length = int(seconds * RATE)
    t = np.arange(length, dtype=np.float64) / RATE
    bpm = [120, 128, 136, 140, 142, 150, 160][index % 7]
    rate = bpm / 60 * (1 if index % 3 else 2)
    root = 36 + (index % 12)
    frequency = 440 * 2 ** ((root - 69) / 12)
    phase = 2 * np.pi * frequency * t
    gate_phase = (t * rate) % 1
    gate_shape = np.maximum(0, np.sin(gate_phase / 0.6 * np.pi)) ** 0.7
    gate = np.where(gate_phase < 0.6, gate_shape, 0)
    tone = np.sin(phase) * 0.72 + np.sin(phase * 2.01) * 0.16 + np.sin(phase * 4.03) * 0.05
    movement = 0.75 + 0.25 * np.sin(2 * np.pi * 0.13 * t + index)
    mono = np.tanh(tone * gate * movement * 1.3)
    delay = int((0.009 + index % 5 * 0.0015) * RATE)
    return np.stack((mono, np.roll(mono, delay)), axis=1), bpm, root


def generate():
    OUT.mkdir(parents=True, exist_ok=True)
    existing = json.loads(MANIFEST.read_text())
    existing = [entry for entry in existing if not str(entry.get("id", "")).startswith("gpu8_")]
    entries = []
    note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

    for index in range(20):
        seconds = 6.4 + (index % 5) * 0.35
        audio, root = chord_bed(index, seconds)
        sample_id = f"gpu8_chord_{index + 1:02d}"
        path = OUT / "warm-chords" / f"{sample_id}.wav"
        write(path, audio)
        root_name = f"{note_names[root % 12]}{root // 12 - 1}"
        entries.append({"id": sample_id, "name": f"GPU Warm Chord Bed {index + 1:02d} · {root_name}", "url": "/" + str(path.relative_to(ROOT / 'public')).replace('\\','/'), "category": "GPU Production Pack", "subtype": "Warm Chord Bed", "duration": round(seconds, 3), "sampleRate": RATE, "channels": 2, "rootNote": root_name, "tags": ["gpu", "warm", "chord", "stereo", "production", "original", "factory", "royalty-free"], "description": "Original warm stereo chord layer for GPU-assisted arrangement and sample workflows."})

    for index in range(20):
        seconds = 6.8 + (index % 4) * 0.4
        audio = air_texture(index, seconds)
        sample_id = f"gpu8_air_{index + 1:02d}"
        path = OUT / "air-textures" / f"{sample_id}.wav"
        write(path, audio)
        entries.append({"id": sample_id, "name": f"GPU Air Texture {index + 1:02d}", "url": "/" + str(path.relative_to(ROOT / 'public')).replace('\\','/'), "category": "GPU Production Pack", "subtype": "Air Texture", "duration": round(seconds, 3), "sampleRate": RATE, "channels": 2, "tags": ["gpu", "air", "texture", "clarity", "stereo", "original", "factory", "royalty-free"], "description": "Original high-definition stereo atmosphere with controlled air and soft motion."})

    for index in range(16):
        seconds = 7.0 + (index % 4) * 0.25
        audio, bpm, root = motion_pulse(index, seconds)
        sample_id = f"gpu8_pulse_{index + 1:02d}"
        path = OUT / "motion-pulses" / f"{sample_id}.wav"
        write(path, audio)
        root_name = f"{note_names[root % 12]}{root // 12 - 1}"
        entries.append({"id": sample_id, "name": f"GPU Motion Pulse {index + 1:02d} · {bpm} BPM", "url": "/" + str(path.relative_to(ROOT / 'public')).replace('\\','/'), "category": "GPU Production Pack", "subtype": "Motion Pulse", "duration": round(seconds, 3), "sampleRate": RATE, "channels": 2, "bpm": bpm, "rootNote": root_name, "tags": ["gpu", "pulse", "motion", "loop", "stereo", "original", "factory", "royalty-free"], "description": "Original rhythmic stereo pulse designed for slicing, looping, and multitrack layering."})

    combined = sorted(existing + entries, key=lambda entry: (entry.get("category", ""), entry.get("subtype", ""), entry.get("name", "")))
    MANIFEST.write_text(json.dumps(combined, indent=2))
    print(f"Generated {len(entries)} GPU production assets; manifest now contains {len(combined)} WAV files.")

if __name__ == "__main__":
    generate()
