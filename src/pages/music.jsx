// src/pages/Music.js
//
// Advanced AudioMasterLab music studio.
// Replaces the older music page with:
// - faster soundboard workflow
// - stronger oscillator engine with custom waveforms, unison, drive, filter envelope, delay, reverb, compressor
// - sample pads that accept Archive.org drum-kit sounds
// - 32-step sequencer
// - mixer routing
// - localStorage project saving
// - new ArchiveKitBrowser component integration

import React from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Slider,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    AddRounded,
    AlbumRounded,
    AutoAwesomeRounded,
    BlurOnRounded,
    ContentCopyRounded,
    DeleteRounded,
    DownloadRounded,
    GraphicEqRounded,
    GridOnRounded,
    LibraryMusicRounded,
    PauseRounded,
    PianoRounded,
    PlayArrowRounded,
    RestartAltRounded,
    SaveRounded,
    StopRounded,
    TuneRounded,
    UploadFileRounded,
    VolumeOffRounded,
    VolumeUpRounded,
    WavesRounded,
} from "@mui/icons-material";
import {
    AppNavBar,
    BackHomeButton,
    GradientPage,
    SectionHeader,
} from "../components/components.jsx";
import Seo from "../components/seo.jsx";
import ArchiveKitBrowser from "../components/archivekitbrowser.jsx";

const STORAGE_KEY = "audiomasterlab.advancedMusicStudio.v1";

const PATTERN_STEPS = 32;
const STEPS_PER_BEAT = 4;
const BEATS_PER_BAR = 4;
const DEFAULT_BPM = 128;

const CHROMATIC_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const PIANO_ROLL_MIN_MIDI = 12; // C0
const PIANO_ROLL_MAX_MIDI = 120; // C9
const SCALE_DEFINITIONS = [
    { id: "chromatic", label: "Chromatic", intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
    { id: "major", label: "Major", intervals: [0, 2, 4, 5, 7, 9, 11] },
    { id: "natural-minor", label: "Natural Minor", intervals: [0, 2, 3, 5, 7, 8, 10] },
    { id: "harmonic-minor", label: "Harmonic Minor", intervals: [0, 2, 3, 5, 7, 8, 11] },
    { id: "melodic-minor", label: "Melodic Minor", intervals: [0, 2, 3, 5, 7, 9, 11] },
    { id: "major-pentatonic", label: "Major Pentatonic", intervals: [0, 2, 4, 7, 9] },
    { id: "minor-pentatonic", label: "Minor Pentatonic", intervals: [0, 3, 5, 7, 10] },
    { id: "blues", label: "Blues", intervals: [0, 3, 5, 6, 7, 10] },
    { id: "dorian", label: "Dorian", intervals: [0, 2, 3, 5, 7, 9, 10] },
    { id: "mixolydian", label: "Mixolydian", intervals: [0, 2, 4, 5, 7, 9, 10] },
];

const SOUND_TYPES = ["drum", "bass", "lead", "pad", "fx", "sample"];
const FILTER_TYPES = ["lowpass", "highpass", "bandpass", "notch", "allpass"];
const WAVEFORMS = [
    "sine",
    "triangle",
    "square",
    "sawtooth",
    "warmSaw",
    "softSquare",
    "organ",
    "bell",
    "superSaw",
    "noise",
];

const MIXER_PRESETS = [
    {
        id: "master",
        name: "Master",
        volume: 0.92,
        pan: 0,
        muted: false,
        solo: false,
        filterType: "allpass",
        cutoff: 18000,
        q: 0.8,
    },
    {
        id: "mix-drums",
        name: "Drums",
        volume: 0.9,
        pan: 0,
        muted: false,
        solo: false,
        filterType: "lowpass",
        cutoff: 14000,
        q: 0.8,
    },
    {
        id: "mix-bass",
        name: "Bass",
        volume: 0.84,
        pan: 0,
        muted: false,
        solo: false,
        filterType: "lowpass",
        cutoff: 6200,
        q: 1.05,
    },
    {
        id: "mix-music",
        name: "Music",
        volume: 0.78,
        pan: 0,
        muted: false,
        solo: false,
        filterType: "lowpass",
        cutoff: 12500,
        q: 0.8,
    },
    {
        id: "mix-fx",
        name: "FX / Samples",
        volume: 0.86,
        pan: 0,
        muted: false,
        solo: false,
        filterType: "allpass",
        cutoff: 18000,
        q: 0.7,
    },
];

function createId(prefix = "id") {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function midiToFrequency(midi) {
    return Number((440 * Math.pow(2, (midi - 69) / 12)).toFixed(4));
}

function note(label) {
    const match = /^([A-G]#?)(-?\d+)$/.exec(label);
    if (!match) return 261.63;

    const [, name, octaveRaw] = match;
    const octave = Number(octaveRaw);
    const semitone = CHROMATIC_NOTES.indexOf(name);

    if (semitone < 0) return 261.63;

    return midiToFrequency((octave + 1) * 12 + semitone);
}

function frequencyToMidi(frequency) {
    return Math.round(69 + 12 * Math.log2(Math.max(1, Number(frequency) || 440) / 440));
}

function midiToNoteLabel(midi) {
    const safeMidi = Math.round(clamp(midi, 0, 127));
    return `${CHROMATIC_NOTES[safeMidi % 12]}${Math.floor(safeMidi / 12) - 1}`;
}

function createPianoRollNotes() {
    return Array.from(
        { length: PIANO_ROLL_MAX_MIDI - PIANO_ROLL_MIN_MIDI + 1 },
        (_, index) => {
            const midi = PIANO_ROLL_MAX_MIDI - index;
            return {
                midi,
                label: midiToNoteLabel(midi),
                name: CHROMATIC_NOTES[midi % 12],
                pitchClass: midi % 12,
                value: midiToFrequency(midi),
            };
        }
    );
}

const FULL_PIANO_ROLL_NOTES = createPianoRollNotes();

function getScalePitchClasses(rootName, scaleId) {
    const root = Math.max(0, CHROMATIC_NOTES.indexOf(rootName));
    const definition = SCALE_DEFINITIONS.find((scale) => scale.id === scaleId) || SCALE_DEFINITIONS[0];
    return new Set(definition.intervals.map((interval) => (root + interval) % 12));
}

function nextSampleTrackName(existingSounds, offset = 0) {
    const sampleCount = existingSounds.filter((sound) => sound.mode === "sample").length + offset;
    return sampleCount === 0 ? "Samples" : `Samples ${sampleCount + 1}`;
}

function clamp(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.min(max, Math.max(min, number));
}

function formatPercent(value) {
    return `${Math.round(Number(value || 0) * 100)}%`;
}

function secondsPerStep(bpm) {
    return 60 / clamp(bpm, 40, 240) / STEPS_PER_BEAT;
}

function secondsPerBar(bpm) {
    return BEATS_PER_BAR * (60 / clamp(bpm, 40, 240));
}

function makeDistortionCurve(amount = 0) {
    const safeAmount = clamp(amount, 0, 1) * 650;
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < samples; i += 1) {
        const x = (i * 2) / samples - 1;
        curve[i] = ((3 + safeAmount) * x * 20 * deg) / (Math.PI + safeAmount * Math.abs(x));
    }

    return curve;
}

function normalizeImportedSound(sound) {
    if (!sound || typeof sound !== "object") return null;

    const mode = sound.mode === "sample" || sound.type === "sample" ? "sample" : "synth";

    return {
        id: String(sound.id || createId("sound")),
        name: String(sound.name || "Sound"),
        type: SOUND_TYPES.includes(sound.type) ? sound.type : mode === "sample" ? "sample" : "lead",
        category: sound.category || "",
        mode,
        mixerChannelId: sound.mixerChannelId || (mode === "sample" ? "mix-drums" : "mix-music"),
        rootFrequency: clamp(sound.rootFrequency || note("C3"), 20, 20000),
        masterGain: clamp(sound.masterGain ?? 0.75, 0, 1.6),
        pan: clamp(sound.pan || 0, -1, 1),
        drive: clamp(sound.drive || 0, 0, 1),
        pitch: {
            startSemitones: clamp(sound.pitch?.startSemitones || 0, -48, 48),
            endSemitones: clamp(sound.pitch?.endSemitones || 0, -48, 48),
            glide: clamp(sound.pitch?.glide || 0.02, 0.001, 2),
        },
        envelope: {
            attack: clamp(sound.envelope?.attack ?? 0.005, 0.001, 5),
            decay: clamp(sound.envelope?.decay ?? 0.12, 0.001, 5),
            sustain: clamp(sound.envelope?.sustain ?? 0.45, 0.001, 1),
            hold: clamp(sound.envelope?.hold ?? 0.04, 0, 10),
            release: clamp(sound.envelope?.release ?? 0.16, 0.01, 10),
        },
        filter: {
            type: FILTER_TYPES.includes(sound.filter?.type) ? sound.filter.type : "lowpass",
            cutoff: clamp(sound.filter?.cutoff ?? 9000, 40, 20000),
            q: clamp(sound.filter?.q ?? 0.8, 0.1, 30),
            envAmount: clamp(sound.filter?.envAmount ?? 0, -12000, 12000),
        },
        fx: {
            delayTime: clamp(sound.fx?.delayTime || 0, 0, 2),
            delayFeedback: clamp(sound.fx?.delayFeedback || 0, 0, 0.92),
            delayMix: clamp(sound.fx?.delayMix || 0, 0, 1),
            reverbMix: clamp(sound.fx?.reverbMix || 0, 0, 1),
        },
        layers: Array.isArray(sound.layers) && sound.layers.length
            ? sound.layers.map((layer) => ({
                id: String(layer.id || createId("layer")),
                waveform: WAVEFORMS.includes(layer.waveform) ? layer.waveform : "sawtooth",
                octave: clamp(layer.octave || 0, -4, 4),
                detune: clamp(layer.detune || 0, -1200, 1200),
                gain: clamp(layer.gain ?? 0.5, 0, 1.5),
                unison: clamp(layer.unison || 1, 1, 9),
                spread: clamp(layer.spread || 0, 0, 80),
            }))
            : [
                {
                    id: createId("layer"),
                    waveform: "sawtooth",
                    octave: 0,
                    detune: 0,
                    gain: 0.75,
                    unison: 1,
                    spread: 0,
                },
            ],
        sample: sound.sample
            ? {
                url: String(sound.sample.url || ""),
                directUrl: String(sound.sample.directUrl || sound.sample.url || ""),
                archiveIdentifier: String(sound.sample.archiveIdentifier || ""),
                archiveTitle: String(sound.sample.archiveTitle || ""),
                archiveDetailsUrl: String(sound.sample.archiveDetailsUrl || ""),
                fileName: String(sound.sample.fileName || ""),
                displayName: String(sound.sample.displayName || sound.sample.fileName || sound.name || "Sample"),
                proxied: Boolean(sound.sample.proxied),
            }
            : null,
    };
}

function createPattern() {
    return [];
}

function normalizePattern(pattern, sounds) {
    const soundMap = new Map(sounds.map((sound) => [sound.id, sound]));

    // Migrate projects saved by the former step sequencer.
    if (
        Array.isArray(pattern) &&
        pattern.length === PATTERN_STEPS &&
        pattern.every((step) => Array.isArray(step))
    ) {
        return pattern.flatMap((step, startStep) =>
            step.map((soundId) => {
                const sound = soundMap.get(String(soundId));
                return {
                    id: createId("note"),
                    soundId: String(soundId),
                    note: sound?.rootFrequency || note("C3"),
                    startStep,
                    lengthSteps: 1,
                };
            })
        );
    }

    if (!Array.isArray(pattern)) return [];

    return pattern
        .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
        .map((entry) => ({
            id: String(entry.id || createId("note")),
            soundId: String(entry.soundId || sounds[0]?.id || ""),
            note: clamp(entry.note || sounds[0]?.rootFrequency || note("C3"), 8, 24000),
            startStep: Math.round(clamp(entry.startStep || 0, 0, PATTERN_STEPS - 1)),
            lengthSteps: Math.round(
                clamp(entry.lengthSteps || 1, 1, PATTERN_STEPS - Math.round(clamp(entry.startStep || 0, 0, PATTERN_STEPS - 1)))
            ),
        }))
        .filter((entry) => entry.soundId && soundMap.has(entry.soundId));
}

function createInitialSounds() {
    return [
        {
            id: "sound-sub-kick",
            name: "Punch Sub Kick",
            type: "drum",
            category: "kicks",
            mode: "synth",
            mixerChannelId: "mix-drums",
            rootFrequency: note("C1"),
            masterGain: 1.02,
            pan: 0,
            drive: 0.16,
            pitch: {
                startSemitones: 24,
                endSemitones: 0,
                glide: 0.08,
            },
            envelope: {
                attack: 0.001,
                decay: 0.12,
                sustain: 0.22,
                hold: 0.015,
                release: 0.14,
            },
            filter: {
                type: "lowpass",
                cutoff: 1550,
                q: 0.8,
                envAmount: -500,
            },
            fx: {
                delayTime: 0,
                delayFeedback: 0,
                delayMix: 0,
                reverbMix: 0.01,
            },
            layers: [
                {
                    id: "layer-sub-kick",
                    waveform: "sine",
                    octave: 0,
                    detune: 0,
                    gain: 1,
                    unison: 1,
                    spread: 0,
                },
                {
                    id: "layer-kick-click",
                    waveform: "triangle",
                    octave: 2,
                    detune: -11,
                    gain: 0.11,
                    unison: 1,
                    spread: 0,
                },
            ],
        },
        {
            id: "sound-crack-snare",
            name: "Crack Snare",
            type: "drum",
            category: "snares",
            mode: "synth",
            mixerChannelId: "mix-drums",
            rootFrequency: note("D3"),
            masterGain: 0.82,
            pan: 0,
            drive: 0.21,
            pitch: {
                startSemitones: 7,
                endSemitones: 0,
                glide: 0.045,
            },
            envelope: {
                attack: 0.001,
                decay: 0.08,
                sustain: 0.11,
                hold: 0.015,
                release: 0.13,
            },
            filter: {
                type: "bandpass",
                cutoff: 2800,
                q: 1.8,
                envAmount: 900,
            },
            fx: {
                delayTime: 0.08,
                delayFeedback: 0.08,
                delayMix: 0.04,
                reverbMix: 0.12,
            },
            layers: [
                {
                    id: "layer-snare-body",
                    waveform: "triangle",
                    octave: 0,
                    detune: -24,
                    gain: 0.24,
                    unison: 1,
                    spread: 0,
                },
                {
                    id: "layer-snare-noise",
                    waveform: "noise",
                    octave: 0,
                    detune: 0,
                    gain: 0.88,
                    unison: 1,
                    spread: 0,
                },
            ],
        },
        {
            id: "sound-tight-hat",
            name: "Tight Hat",
            type: "drum",
            category: "hats",
            mode: "synth",
            mixerChannelId: "mix-drums",
            rootFrequency: note("F#5"),
            masterGain: 0.42,
            pan: 0.08,
            drive: 0.08,
            pitch: {
                startSemitones: 0,
                endSemitones: 0,
                glide: 0.01,
            },
            envelope: {
                attack: 0.001,
                decay: 0.025,
                sustain: 0.08,
                hold: 0.005,
                release: 0.045,
            },
            filter: {
                type: "highpass",
                cutoff: 5200,
                q: 0.65,
                envAmount: 0,
            },
            fx: {
                delayTime: 0,
                delayFeedback: 0,
                delayMix: 0,
                reverbMix: 0.025,
            },
            layers: [
                {
                    id: "layer-hat-noise",
                    waveform: "noise",
                    octave: 0,
                    detune: 0,
                    gain: 1,
                    unison: 1,
                    spread: 0,
                },
                {
                    id: "layer-hat-metal",
                    waveform: "bell",
                    octave: 0,
                    detune: 17,
                    gain: 0.16,
                    unison: 3,
                    spread: 11,
                },
            ],
        },
        {
            id: "sound-808-bass",
            name: "Smooth 808 Bass",
            type: "bass",
            category: "bass",
            mode: "synth",
            mixerChannelId: "mix-bass",
            rootFrequency: note("C2"),
            masterGain: 0.82,
            pan: 0,
            drive: 0.27,
            pitch: {
                startSemitones: 0,
                endSemitones: 0,
                glide: 0.04,
            },
            envelope: {
                attack: 0.006,
                decay: 0.18,
                sustain: 0.74,
                hold: 0.18,
                release: 0.38,
            },
            filter: {
                type: "lowpass",
                cutoff: 2400,
                q: 1.1,
                envAmount: 300,
            },
            fx: {
                delayTime: 0,
                delayFeedback: 0,
                delayMix: 0,
                reverbMix: 0,
            },
            layers: [
                {
                    id: "layer-808-sine",
                    waveform: "sine",
                    octave: 0,
                    detune: 0,
                    gain: 1,
                    unison: 1,
                    spread: 0,
                },
                {
                    id: "layer-808-warmth",
                    waveform: "softSquare",
                    octave: 0,
                    detune: -8,
                    gain: 0.13,
                    unison: 1,
                    spread: 0,
                },
            ],
        },
        {
            id: "sound-wide-lead",
            name: "Wide Super Lead",
            type: "lead",
            category: "lead",
            mode: "synth",
            mixerChannelId: "mix-music",
            rootFrequency: note("G4"),
            masterGain: 0.58,
            pan: 0.02,
            drive: 0.05,
            pitch: {
                startSemitones: 0,
                endSemitones: 0,
                glide: 0.025,
            },
            envelope: {
                attack: 0.018,
                decay: 0.14,
                sustain: 0.7,
                hold: 0.12,
                release: 0.32,
            },
            filter: {
                type: "lowpass",
                cutoff: 9200,
                q: 0.9,
                envAmount: 1100,
            },
            fx: {
                delayTime: 0.24,
                delayFeedback: 0.28,
                delayMix: 0.2,
                reverbMix: 0.18,
            },
            layers: [
                {
                    id: "layer-lead-super",
                    waveform: "superSaw",
                    octave: 0,
                    detune: 0,
                    gain: 0.62,
                    unison: 5,
                    spread: 18,
                },
                {
                    id: "layer-lead-bell",
                    waveform: "bell",
                    octave: 1,
                    detune: 6,
                    gain: 0.12,
                    unison: 1,
                    spread: 0,
                },
            ],
        },
        {
            id: "sound-cinema-pad",
            name: "Cinema Pad",
            type: "pad",
            category: "pads",
            mode: "synth",
            mixerChannelId: "mix-music",
            rootFrequency: note("C4"),
            masterGain: 0.46,
            pan: 0,
            drive: 0.02,
            pitch: {
                startSemitones: 0,
                endSemitones: 0,
                glide: 0.1,
            },
            envelope: {
                attack: 0.9,
                decay: 0.8,
                sustain: 0.72,
                hold: 0.9,
                release: 2.8,
            },
            filter: {
                type: "lowpass",
                cutoff: 6800,
                q: 0.65,
                envAmount: 600,
            },
            fx: {
                delayTime: 0.38,
                delayFeedback: 0.32,
                delayMix: 0.18,
                reverbMix: 0.5,
            },
            layers: [
                {
                    id: "layer-pad-warm",
                    waveform: "warmSaw",
                    octave: 0,
                    detune: -8,
                    gain: 0.28,
                    unison: 3,
                    spread: 9,
                },
                {
                    id: "layer-pad-organ",
                    waveform: "organ",
                    octave: 0,
                    detune: 8,
                    gain: 0.24,
                    unison: 1,
                    spread: 0,
                },
                {
                    id: "layer-pad-top",
                    waveform: "triangle",
                    octave: 1,
                    detune: 4,
                    gain: 0.14,
                    unison: 1,
                    spread: 0,
                },
            ],
        },
    ].map(normalizeImportedSound);
}

function createDefaultPattern(sounds) {
    const pattern = createPattern();
    const byToken = (token) => sounds.find((sound) => sound.id.includes(token));

    const add = (sound, startStep, lengthSteps = 1) => {
        if (!sound) return;
        pattern.push({
            id: createId("note"),
            soundId: sound.id,
            note: sound.rootFrequency,
            startStep,
            lengthSteps: Math.min(lengthSteps, PATTERN_STEPS - startStep),
        });
    };

    const kick = byToken("kick");
    const snare = byToken("snare");
    const hat = byToken("hat");
    const bass = byToken("bass");

    [0, 8, 16, 24].forEach((step) => add(kick, step, 1));
    [8, 24].forEach((step) => add(snare, step, 1));
    Array.from({ length: PATTERN_STEPS / 2 }).forEach((_, index) => add(hat, index * 2, 1));
    [0, 6, 12, 18, 26].forEach((step) => add(bass, step, Math.min(4, PATTERN_STEPS - step)));

    return pattern;
}

function createDefaultStudio() {
    const sounds = createInitialSounds();

    return {
        bpm: DEFAULT_BPM,
        sounds,
        mixerChannels: MIXER_PRESETS,
        pattern: createDefaultPattern(sounds),
    };
}

function loadStudioState() {
    const defaults = createDefaultStudio();

    if (typeof window === "undefined") return defaults;

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;

        if (!parsed || typeof parsed !== "object") return defaults;

        const sounds = Array.isArray(parsed.sounds)
            ? parsed.sounds.map(normalizeImportedSound).filter(Boolean)
            : defaults.sounds;

        const mixerChannels = Array.isArray(parsed.mixerChannels) && parsed.mixerChannels.length
            ? parsed.mixerChannels.map((channel) => ({
                id: String(channel.id || createId("mix")),
                name: String(channel.name || "Channel"),
                volume: clamp(channel.volume ?? 0.8, 0, 1.5),
                pan: clamp(channel.pan || 0, -1, 1),
                muted: Boolean(channel.muted),
                solo: Boolean(channel.solo),
                filterType: FILTER_TYPES.includes(channel.filterType) ? channel.filterType : "allpass",
                cutoff: clamp(channel.cutoff || 18000, 40, 20000),
                q: clamp(channel.q || 0.8, 0.1, 30),
            }))
            : defaults.mixerChannels;

        const pattern = Array.isArray(parsed.pattern)
            ? normalizePattern(parsed.pattern, sounds)
            : createDefaultPattern(sounds);

        return {
            bpm: clamp(parsed.bpm || DEFAULT_BPM, 40, 240),
            sounds: sounds.length ? sounds : defaults.sounds,
            mixerChannels,
            pattern,
        };
    } catch {
        return defaults;
    }
}

function saveStudioState({ bpm, sounds, mixerChannels, pattern }) {
    if (typeof window === "undefined") return false;

    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                bpm,
                sounds,
                mixerChannels,
                pattern,
            })
        );
        return true;
    } catch {
        return false;
    }
}

function downloadTextFile(filename, content, type = "application/json") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

function getSoundDuration(sound) {
    if (!sound) return 0.25;
    if (sound.mode === "sample") {
        return sound.envelope.attack + sound.envelope.decay + sound.envelope.hold + sound.envelope.release + 0.05;
    }

    return sound.envelope.attack + sound.envelope.decay + sound.envelope.hold + sound.envelope.release + 0.08;
}

function buildPeriodicWave(context, waveform) {
    if (waveform === "warmSaw") {
        const real = new Float32Array([0, 0.9, 0.42, 0.22, 0.11, 0.06, 0.03]);
        const imag = new Float32Array(real.length);
        return context.createPeriodicWave(real, imag, { disableNormalization: false });
    }

    if (waveform === "softSquare") {
        const real = new Float32Array([0, 1, 0, 0.32, 0, 0.15, 0, 0.08]);
        const imag = new Float32Array(real.length);
        return context.createPeriodicWave(real, imag, { disableNormalization: false });
    }

    if (waveform === "organ") {
        const real = new Float32Array([0, 1, 0.55, 0.22, 0.16, 0.08, 0.04]);
        const imag = new Float32Array(real.length);
        return context.createPeriodicWave(real, imag, { disableNormalization: false });
    }

    if (waveform === "bell") {
        const real = new Float32Array([0, 1, 0.18, 0.45, 0.08, 0.22, 0.05, 0.12]);
        const imag = new Float32Array(real.length);
        return context.createPeriodicWave(real, imag, { disableNormalization: false });
    }

    return null;
}

function categoryLabelFromSound(sound) {
    if (sound.mode === "sample" && sound.category) {
        return sound.category.replace(/-/g, " ");
    }

    return sound.type || "sound";
}

export default function Music() {
    const initialStudioRef = React.useRef(null);

    if (!initialStudioRef.current) {
        initialStudioRef.current = loadStudioState();
    }

    const audioContextRef = React.useRef(null);
    const reverbCacheRef = React.useRef(new WeakMap());
    const sampleCacheRef = React.useRef(new Map());
    const activeSourcesRef = React.useRef([]);
    const patternTimerRef = React.useRef(null);
    const patternStepRef = React.useRef(0);

    const [bpm, setBpm] = React.useState(initialStudioRef.current.bpm);
    const [sounds, setSounds] = React.useState(initialStudioRef.current.sounds);
    const [mixerChannels, setMixerChannels] = React.useState(initialStudioRef.current.mixerChannels);
    const [pattern, setPattern] = React.useState(initialStudioRef.current.pattern);
    const [selectedSoundId, setSelectedSoundId] = React.useState(initialStudioRef.current.sounds[0]?.id || "");
    const [noteLengthSteps, setNoteLengthSteps] = React.useState(4);
    const [scaleRoot, setScaleRoot] = React.useState("C");
    const [scaleId, setScaleId] = React.useState("major");
    const [selectedTab, setSelectedTab] = React.useState("soundboard");
    const [playingPattern, setPlayingPattern] = React.useState(false);
    const [currentStep, setCurrentStep] = React.useState(null);
    const [status, setStatus] = React.useState("Ready. Play pads, build kits from Archive.org, and draw a 32-step pattern.");

    const soundsRef = React.useRef(sounds);
    const mixerChannelsRef = React.useRef(mixerChannels);
    const patternRef = React.useRef(pattern);
    const bpmRef = React.useRef(bpm);

    React.useEffect(() => {
        soundsRef.current = sounds;
    }, [sounds]);

    React.useEffect(() => {
        mixerChannelsRef.current = mixerChannels;
    }, [mixerChannels]);

    React.useEffect(() => {
        patternRef.current = pattern;
    }, [pattern]);

    React.useEffect(() => {
        bpmRef.current = bpm;
    }, [bpm]);

    React.useEffect(() => {
        saveStudioState({ bpm, sounds, mixerChannels, pattern });
    }, [bpm, mixerChannels, pattern, sounds]);

    React.useEffect(() => {
        return () => {
            stopPattern();

            activeSourcesRef.current.forEach((source) => {
                try {
                    source.stop();
                } catch {
                    // Already stopped.
                }
            });

            activeSourcesRef.current = [];
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedSound = React.useMemo(
        () => sounds.find((sound) => sound.id === selectedSoundId) || sounds[0],
        [selectedSoundId, sounds]
    );

    const groupedSounds = React.useMemo(() => {
        const groups = new Map();

        for (const sound of sounds) {
            const key = categoryLabelFromSound(sound);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(sound);
        }

        return [...groups.entries()];
    }, [sounds]);

    const soloActive = React.useMemo(
        () => mixerChannels.some((channel) => channel.id !== "master" && channel.solo),
        [mixerChannels]
    );

    const getAudioContext = React.useCallback(async () => {
        if (!audioContextRef.current) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;

            if (!AudioContextClass) {
                throw new Error("This browser does not support WebAudio.");
            }

            audioContextRef.current = new AudioContextClass();
        }

        if (audioContextRef.current.state === "suspended") {
            await audioContextRef.current.resume();
        }

        return audioContextRef.current;
    }, []);

    const registerSource = React.useCallback((source) => {
        activeSourcesRef.current.push(source);

        source.onended = () => {
            activeSourcesRef.current = activeSourcesRef.current.filter((item) => item !== source);
        };
    }, []);

    const stopAllSources = React.useCallback(() => {
        activeSourcesRef.current.forEach((source) => {
            try {
                source.stop();
            } catch {
                // Already stopped.
            }
        });

        activeSourcesRef.current = [];
    }, []);

    const createNoiseBuffer = React.useCallback((context, duration = 1) => {
        const sampleRate = context.sampleRate;
        const length = Math.max(1, Math.floor(sampleRate * duration));
        const buffer = context.createBuffer(1, length, sampleRate);
        const channel = buffer.getChannelData(0);

        for (let index = 0; index < length; index += 1) {
            channel[index] = Math.random() * 2 - 1;
        }

        return buffer;
    }, []);

    const createImpulseResponse = React.useCallback((context) => {
        const cached = reverbCacheRef.current.get(context);
        if (cached) return cached;

        const seconds = 2.6;
        const decay = 2.7;
        const length = Math.floor(context.sampleRate * seconds);
        const impulse = context.createBuffer(2, length, context.sampleRate);

        for (let channelIndex = 0; channelIndex < 2; channelIndex += 1) {
            const channel = impulse.getChannelData(channelIndex);

            for (let index = 0; index < length; index += 1) {
                channel[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / length, decay);
            }
        }

        reverbCacheRef.current.set(context, impulse);
        return impulse;
    }, []);

    const createMixerDestination = React.useCallback(
        (context, mixerChannelId) => {
            const channels = mixerChannelsRef.current;
            const master = channels.find((channel) => channel.id === "master") || MIXER_PRESETS[0];
            const channel =
                channels.find((item) => item.id === mixerChannelId) ||
                channels.find((item) => item.id === "mix-fx") ||
                master;

            const masterFilter = context.createBiquadFilter();
            const masterGain = context.createGain();
            const compressor = context.createDynamicsCompressor();

            masterFilter.type = master.filterType || "allpass";
            masterFilter.frequency.value = master.cutoff || 18000;
            masterFilter.Q.value = master.q || 0.8;
            masterGain.gain.value = master.muted ? 0 : master.volume;

            compressor.threshold.value = -16;
            compressor.knee.value = 24;
            compressor.ratio.value = 8;
            compressor.attack.value = 0.004;
            compressor.release.value = 0.18;

            masterFilter.connect(masterGain);
            masterGain.connect(compressor);
            compressor.connect(context.destination);

            if (channel.id === "master") {
                return masterFilter;
            }

            const channelFilter = context.createBiquadFilter();
            const channelGain = context.createGain();

            channelFilter.type = channel.filterType || "allpass";
            channelFilter.frequency.value = channel.cutoff || 18000;
            channelFilter.Q.value = channel.q || 0.8;

            const mutedBySolo = soloActive && channel.id !== "master" && !channel.solo;
            channelGain.gain.value = channel.muted || mutedBySolo ? 0 : channel.volume;

            channelFilter.connect(channelGain);

            if (context.createStereoPanner) {
                const panner = context.createStereoPanner();
                panner.pan.value = channel.pan || 0;
                channelGain.connect(panner);
                panner.connect(masterFilter);
            } else {
                channelGain.connect(masterFilter);
            }

            return channelFilter;
        },
        [soloActive]
    );

    const applySoundFx = React.useCallback(
        (context, input, destination, sound) => {
            const dry = context.createGain();
            dry.gain.value = 1;
            input.connect(dry);
            dry.connect(destination);

            if (sound.fx.delayTime > 0.001 && sound.fx.delayMix > 0.001) {
                const delay = context.createDelay(2);
                const feedback = context.createGain();
                const wet = context.createGain();

                delay.delayTime.value = sound.fx.delayTime;
                feedback.gain.value = sound.fx.delayFeedback;
                wet.gain.value = sound.fx.delayMix;

                input.connect(delay);
                delay.connect(feedback);
                feedback.connect(delay);
                delay.connect(wet);
                wet.connect(destination);
            }

            if (sound.fx.reverbMix > 0.001) {
                const convolver = context.createConvolver();
                const wet = context.createGain();

                convolver.buffer = createImpulseResponse(context);
                wet.gain.value = sound.fx.reverbMix;

                input.connect(convolver);
                convolver.connect(wet);
                wet.connect(destination);
            }
        },
        [createImpulseResponse]
    );

    const getSampleBuffer = React.useCallback(
        async (context, sound) => {
            const url = sound.sample?.url;
            if (!url) throw new Error("Sample has no URL.");

            if (sampleCacheRef.current.has(url)) {
                return sampleCacheRef.current.get(url);
            }

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Sample fetch failed with HTTP ${response.status}.`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = await context.decodeAudioData(arrayBuffer.slice(0));
            sampleCacheRef.current.set(url, buffer);

            return buffer;
        },
        []
    );

    const playSampleSound = React.useCallback(
        async ({ context, sound, when, destination, frequency, durationSeconds }) => {
            const buffer = await getSampleBuffer(context, sound);
            const source = context.createBufferSource();
            const amp = context.createGain();
            const filter = context.createBiquadFilter();
            const drive = context.createWaveShaper();

            const ratio = frequency && sound.rootFrequency
                ? clamp(frequency / sound.rootFrequency, 0.125, 8)
                : 1;

            source.buffer = buffer;
            source.playbackRate.setValueAtTime(ratio, when);

            filter.type = sound.filter.type;
            filter.frequency.setValueAtTime(sound.filter.cutoff, when);
            filter.Q.value = sound.filter.q;

            drive.curve = makeDistortionCurve(sound.drive);
            drive.oversample = "4x";

            amp.gain.setValueAtTime(0.0001, when);
            amp.gain.exponentialRampToValueAtTime(Math.max(sound.masterGain, 0.0001), when + sound.envelope.attack);
            amp.gain.exponentialRampToValueAtTime(
                Math.max(sound.masterGain * sound.envelope.sustain, 0.0001),
                when + sound.envelope.attack + sound.envelope.decay
            );
            amp.gain.setValueAtTime(
                Math.max(sound.masterGain * sound.envelope.sustain, 0.0001),
                when + sound.envelope.attack + sound.envelope.decay + sound.envelope.hold
            );
            amp.gain.exponentialRampToValueAtTime(
                0.0001,
                when + sound.envelope.attack + sound.envelope.decay + sound.envelope.hold + sound.envelope.release
            );

            source.connect(filter);
            filter.connect(drive);
            drive.connect(amp);
            applySoundFx(context, amp, destination, sound);

            source.start(when);
            const requestedDuration = Number(durationSeconds) > 0 ? Number(durationSeconds) : getSoundDuration(sound) + 0.6;
            source.stop(when + Math.min(buffer.duration / ratio, Math.max(0.08, requestedDuration)));
            registerSource(source);
        },
        [applySoundFx, getSampleBuffer, registerSource]
    );

    const startOscillatorVoice = React.useCallback(
        ({ context, sound, layer, baseFrequency, when, stopAt, bus }) => {
            if (layer.waveform === "noise") {
                const source = context.createBufferSource();
                const gain = context.createGain();

                source.buffer = createNoiseBuffer(context, Math.max(0.08, stopAt - when + 0.04));
                gain.gain.value = layer.gain;

                source.connect(gain);
                gain.connect(bus);
                source.start(when);
                source.stop(stopAt);
                registerSource(source);
                return;
            }

            const voiceCount = layer.waveform === "superSaw" ? Math.max(3, layer.unison || 5) : layer.unison || 1;
            const center = (voiceCount - 1) / 2;

            for (let voiceIndex = 0; voiceIndex < voiceCount; voiceIndex += 1) {
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                const detuneOffset = voiceCount === 1 ? 0 : (voiceIndex - center) * (layer.spread || 8);
                const frequency = baseFrequency * Math.pow(2, layer.octave || 0);
                const startFrequency = frequency * Math.pow(2, (sound.pitch.startSemitones || 0) / 12);
                const endFrequency = frequency * Math.pow(2, (sound.pitch.endSemitones || 0) / 12);

                if (["warmSaw", "softSquare", "organ", "bell"].includes(layer.waveform)) {
                    const wave = buildPeriodicWave(context, layer.waveform);
                    if (wave) oscillator.setPeriodicWave(wave);
                } else if (layer.waveform === "superSaw") {
                    oscillator.type = "sawtooth";
                } else {
                    oscillator.type = layer.waveform;
                }

                oscillator.frequency.setValueAtTime(Math.max(20, startFrequency), when);
                oscillator.frequency.exponentialRampToValueAtTime(
                    Math.max(20, endFrequency),
                    when + Math.max(sound.pitch.glide, 0.002)
                );
                oscillator.detune.value = (layer.detune || 0) + detuneOffset;

                gain.gain.value = layer.gain / Math.sqrt(voiceCount);
                oscillator.connect(gain);
                gain.connect(bus);

                oscillator.start(when);
                oscillator.stop(stopAt);
                registerSource(oscillator);
            }
        },
        [createNoiseBuffer, registerSource]
    );

    const playSynthSound = React.useCallback(
        ({ context, sound, when, destination, frequency, durationSeconds }) => {
            const total = Math.max(getSoundDuration(sound), Number(durationSeconds) || 0);
            const stopAt = when + total + 0.08;
            const voiceBus = context.createGain();
            const filter = context.createBiquadFilter();
            const drive = context.createWaveShaper();
            const amp = context.createGain();

            filter.type = sound.filter.type;
            filter.frequency.setValueAtTime(sound.filter.cutoff, when);
            filter.Q.value = sound.filter.q;

            if (Math.abs(sound.filter.envAmount) > 1) {
                const target = clamp(sound.filter.cutoff + sound.filter.envAmount, 40, 20000);
                filter.frequency.exponentialRampToValueAtTime(
                    Math.max(40, target),
                    when + Math.max(sound.envelope.attack + sound.envelope.decay, 0.01)
                );
                filter.frequency.exponentialRampToValueAtTime(
                    Math.max(40, sound.filter.cutoff),
                    when + Math.max(sound.envelope.attack + sound.envelope.decay + sound.envelope.hold + sound.envelope.release, 0.02)
                );
            }

            drive.curve = makeDistortionCurve(sound.drive);
            drive.oversample = "4x";

            amp.gain.setValueAtTime(0.0001, when);
            amp.gain.exponentialRampToValueAtTime(Math.max(sound.masterGain, 0.0001), when + sound.envelope.attack);
            amp.gain.exponentialRampToValueAtTime(
                Math.max(sound.masterGain * sound.envelope.sustain, 0.0001),
                when + sound.envelope.attack + sound.envelope.decay
            );
            amp.gain.setValueAtTime(
                Math.max(sound.masterGain * sound.envelope.sustain, 0.0001),
                when + sound.envelope.attack + sound.envelope.decay + sound.envelope.hold
            );
            amp.gain.exponentialRampToValueAtTime(
                0.0001,
                when + sound.envelope.attack + sound.envelope.decay + sound.envelope.hold + sound.envelope.release
            );

            voiceBus.connect(filter);
            filter.connect(drive);
            drive.connect(amp);
            applySoundFx(context, amp, destination, sound);

            sound.layers.forEach((layer) => {
                startOscillatorVoice({
                    context,
                    sound,
                    layer,
                    baseFrequency: frequency || sound.rootFrequency,
                    when,
                    stopAt,
                    bus: voiceBus,
                });
            });

            return total;
        },
        [applySoundFx, startOscillatorVoice]
    );

    const playSound = React.useCallback(
        async (sound, options = {}) => {
            if (!sound) return;

            try {
                const context = await getAudioContext();
                const when = options.when ?? context.currentTime + 0.005;
                const frequency = options.frequency || sound.rootFrequency;
                const destination = createMixerDestination(context, sound.mixerChannelId);

                if (sound.mode === "sample") {
                    await playSampleSound({
                        context,
                        sound,
                        when,
                        destination,
                        frequency,
                        durationSeconds: options.durationSeconds,
                    });
                } else {
                    playSynthSound({
                        context,
                        sound,
                        when,
                        destination,
                        frequency,
                        durationSeconds: options.durationSeconds,
                    });
                }
            } catch (playError) {
                setStatus(playError?.message || "Playback failed.");
            }
        },
        [createMixerDestination, getAudioContext, playSampleSound, playSynthSound]
    );

    const triggerSoundById = React.useCallback(
        (soundId, options = {}) => {
            const sound = soundsRef.current.find((item) => item.id === soundId);
            if (sound) playSound(sound, options);
        },
        [playSound]
    );

    const playStep = React.useCallback(
        async (step) => {
            const notesAtStep = patternRef.current.filter((patternNote) => patternNote.startStep === step);
            const context = await getAudioContext();
            const when = context.currentTime + 0.01;

            notesAtStep.forEach((patternNote) => {
                const sound = soundsRef.current.find((item) => item.id === patternNote.soundId);
                if (!sound) return;

                playSound(sound, {
                    when,
                    frequency: patternNote.note,
                    durationSeconds: Math.max(
                        secondsPerStep(bpmRef.current),
                        patternNote.lengthSteps * secondsPerStep(bpmRef.current)
                    ),
                });
            });
        },
        [getAudioContext, playSound]
    );

    const stopPattern = React.useCallback(() => {
        if (patternTimerRef.current) {
            window.clearInterval(patternTimerRef.current);
            patternTimerRef.current = null;
        }

        patternStepRef.current = 0;
        setPlayingPattern(false);
        setCurrentStep(null);
    }, []);

    const startPattern = React.useCallback(async () => {
        stopPattern();
        await getAudioContext();

        const run = () => {
            const step = patternStepRef.current;
            setCurrentStep(step);
            playStep(step);

            patternStepRef.current = (step + 1) % PATTERN_STEPS;
        };

        run();

        patternTimerRef.current = window.setInterval(() => {
            run();
        }, secondsPerStep(bpmRef.current) * 1000);

        setPlayingPattern(true);
        setStatus("Pattern playing. Click cells while it runs to program live.");
    }, [getAudioContext, playStep, stopPattern]);

    const addPianoNote = React.useCallback(({ soundId, note: frequency, startStep, lengthSteps }) => {
        if (!soundId) return;
        const safeStart = Math.round(clamp(startStep, 0, PATTERN_STEPS - 1));
        const safeLength = Math.round(clamp(lengthSteps, 1, PATTERN_STEPS - safeStart));

        setPattern((current) => {
            const withoutSameStart = current.filter(
                (entry) => !(
                    entry.soundId === soundId &&
                    entry.startStep === safeStart &&
                    Math.abs(entry.note - frequency) < 0.001
                )
            );

            return [
                ...withoutSameStart,
                {
                    id: createId("note"),
                    soundId,
                    note: frequency,
                    startStep: safeStart,
                    lengthSteps: safeLength,
                },
            ];
        });
    }, []);

    const deletePianoNote = React.useCallback((noteId) => {
        setPattern((current) => current.filter((entry) => entry.id !== noteId));
    }, []);

    const resizePianoNote = React.useCallback((noteId, lengthSteps) => {
        let inheritedLength = 1;
        setPattern((current) =>
            current.map((entry) => {
                if (entry.id !== noteId) return entry;
                inheritedLength = Math.round(clamp(lengthSteps, 1, PATTERN_STEPS - entry.startStep));
                return { ...entry, lengthSteps: inheritedLength };
            })
        );
        setNoteLengthSteps(inheritedLength);
    }, []);

    const clearPattern = React.useCallback(() => {
        setPattern(createPattern());
        setStatus("Pattern cleared.");
    }, []);

    const resetStudio = React.useCallback(() => {
        stopPattern();
        stopAllSources();

        const studio = createDefaultStudio();

        setBpm(studio.bpm);
        setSounds(studio.sounds);
        setMixerChannels(studio.mixerChannels);
        setPattern(studio.pattern);
        setSelectedSoundId(studio.sounds[0]?.id || "");
        setStatus("Studio reset to the advanced default kit.");
    }, [stopAllSources, stopPattern]);

    const updateSelectedSound = React.useCallback((patcher) => {
        setSounds((current) =>
            current.map((sound) => {
                if (sound.id !== selectedSoundId) return sound;

                const next = typeof patcher === "function" ? patcher(sound) : { ...sound, ...patcher };
                return normalizeImportedSound(next);
            })
        );
    }, [selectedSoundId]);

    const updateSoundById = React.useCallback((soundId, patcher) => {
        setSounds((current) =>
            current.map((sound) => {
                if (sound.id !== soundId) return sound;

                const next = typeof patcher === "function" ? patcher(sound) : { ...sound, ...patcher };
                return normalizeImportedSound(next);
            })
        );
    }, []);

    const duplicateSound = React.useCallback((soundId) => {
        const sound = sounds.find((item) => item.id === soundId);
        if (!sound) return;

        const copy = normalizeImportedSound({
            ...sound,
            id: createId("sound-copy"),
            name: `${sound.name} Copy`,
            layers: sound.layers.map((layer) => ({ ...layer, id: createId("layer") })),
        });

        setSounds((current) => [...current, copy]);
        setSelectedSoundId(copy.id);
        setStatus(`Duplicated ${sound.name}.`);
    }, [sounds]);

    const deleteSound = React.useCallback((soundId) => {
        if (sounds.length <= 1) return;

        setSounds((current) => current.filter((sound) => sound.id !== soundId));
        setPattern((current) => current.filter((entry) => entry.soundId !== soundId));

        if (selectedSoundId === soundId) {
            const fallback = sounds.find((sound) => sound.id !== soundId);
            setSelectedSoundId(fallback?.id || "");
        }

        setStatus("Sound removed from soundboard and pattern.");
    }, [selectedSoundId, sounds]);

    const createNewSynth = React.useCallback(() => {
        const sound = normalizeImportedSound({
            id: createId("sound"),
            name: "New Advanced Synth",
            type: "lead",
            mode: "synth",
            mixerChannelId: "mix-music",
            rootFrequency: note("C4"),
            masterGain: 0.62,
            pan: 0,
            drive: 0.04,
            pitch: {
                startSemitones: 0,
                endSemitones: 0,
                glide: 0.03,
            },
            envelope: {
                attack: 0.01,
                decay: 0.16,
                sustain: 0.68,
                hold: 0.12,
                release: 0.28,
            },
            filter: {
                type: "lowpass",
                cutoff: 9000,
                q: 0.9,
                envAmount: 800,
            },
            fx: {
                delayTime: 0.18,
                delayFeedback: 0.22,
                delayMix: 0.16,
                reverbMix: 0.14,
            },
            layers: [
                {
                    id: createId("layer"),
                    waveform: "warmSaw",
                    octave: 0,
                    detune: 0,
                    gain: 0.52,
                    unison: 3,
                    spread: 12,
                },
            ],
        });

        setSounds((current) => [...current, sound]);
        setSelectedSoundId(sound.id);
        setSelectedTab("designer");
        setStatus("Created a new advanced oscillator sound.");
    }, []);

    const addArchiveSample = React.useCallback((sample) => {
        const sound = normalizeImportedSound({
            id: createId("archive-pad"),
            name: nextSampleTrackName(soundsRef.current),
            type: "sample",
            category: sample.category || "archive",
            mode: "sample",
            mixerChannelId:
                sample.category === "kicks" ||
                sample.category === "snares" ||
                sample.category === "hats" ||
                sample.category === "closed-hats" ||
                sample.category === "open-hats" ||
                sample.category === "claps"
                    ? "mix-drums"
                    : "mix-fx",
            rootFrequency: note("C3"),
            masterGain: 0.86,
            pan: 0,
            drive: 0.02,
            pitch: {
                startSemitones: 0,
                endSemitones: 0,
                glide: 0.01,
            },
            envelope: {
                attack: 0.001,
                decay: 0.04,
                sustain: 0.92,
                hold: 0.35,
                release: 0.08,
            },
            filter: {
                type: "allpass",
                cutoff: 18000,
                q: 0.7,
                envAmount: 0,
            },
            fx: {
                delayTime: 0,
                delayFeedback: 0,
                delayMix: 0,
                reverbMix: 0.02,
            },
            layers: [],
            sample: {
                url: sample.url,
                directUrl: sample.directUrl,
                archiveIdentifier: sample.archiveIdentifier,
                archiveTitle: sample.archiveTitle,
                archiveDetailsUrl: sample.archiveDetailsUrl,
                fileName: sample.fileName,
                displayName: sample.name || sample.fileName || "Archive Sample",
                proxied: sample.proxied,
            },
        });

        setSounds((current) => {
            const duplicate = current.some(
                (item) =>
                    item.mode === "sample" &&
                    item.sample?.archiveIdentifier === sound.sample?.archiveIdentifier &&
                    item.sample?.fileName === sound.sample?.fileName
            );

            if (duplicate) return current;

            return [...current, sound];
        });

        setSelectedSoundId(sound.id);
        setSelectedTab("soundboard");
        setStatus(`Added Archive sample pad: ${sound.name}`);
    }, []);

    const addManyArchiveSamples = React.useCallback(
        (samples) => {
            const existingKeys = new Set(
                soundsRef.current
                    .filter((sound) => sound.mode === "sample")
                    .map((sound) => `${sound.sample?.archiveIdentifier}/${sound.sample?.fileName}`)
            );

            const nextSounds = [];

            samples.slice(0, 32).forEach((sample, sampleIndex) => {
                const key = `${sample.archiveIdentifier}/${sample.fileName}`;
                if (existingKeys.has(key)) return;
                existingKeys.add(key);

                const mixerChannelId =
                    ["kicks", "snares", "hats", "closed-hats", "open-hats", "claps", "percussion"].includes(sample.category)
                        ? "mix-drums"
                        : "mix-fx";

                nextSounds.push(
                    normalizeImportedSound({
                        id: createId("archive-pad"),
                        name: nextSampleTrackName(soundsRef.current, nextSounds.length),
                        type: "sample",
                        category: sample.category || "archive",
                        mode: "sample",
                        mixerChannelId,
                        rootFrequency: note("C3"),
                        masterGain: 0.86,
                        pan: 0,
                        drive: 0.02,
                        pitch: {
                            startSemitones: 0,
                            endSemitones: 0,
                            glide: 0.01,
                        },
                        envelope: {
                            attack: 0.001,
                            decay: 0.04,
                            sustain: 0.92,
                            hold: 0.35,
                            release: 0.08,
                        },
                        filter: {
                            type: "allpass",
                            cutoff: 18000,
                            q: 0.7,
                            envAmount: 0,
                        },
                        fx: {
                            delayTime: 0,
                            delayFeedback: 0,
                            delayMix: 0,
                            reverbMix: 0.02,
                        },
                        layers: [],
                        sample: {
                            url: sample.url,
                            directUrl: sample.directUrl,
                            archiveIdentifier: sample.archiveIdentifier,
                            archiveTitle: sample.archiveTitle,
                            archiveDetailsUrl: sample.archiveDetailsUrl,
                            fileName: sample.fileName,
                            displayName: sample.name || sample.fileName || "Archive Sample",
                            proxied: sample.proxied,
                        },
                    })
                );
            });

            if (nextSounds.length) {
                setSounds((current) => [...current, ...nextSounds]);
                setSelectedSoundId(nextSounds[0].id);
                setSelectedTab("soundboard");
                setStatus(`Added ${nextSounds.length} Archive sample pad(s) to the soundboard.`);
            } else {
                setStatus("Those Archive samples are already on the soundboard.");
            }
        },
        []
    );

    const updateLayer = React.useCallback((layerId, field, value) => {
        updateSelectedSound((sound) => ({
            ...sound,
            layers: sound.layers.map((layer) =>
                layer.id === layerId
                    ? {
                        ...layer,
                        [field]: value,
                    }
                    : layer
            ),
        }));
    }, [updateSelectedSound]);

    const addLayer = React.useCallback(() => {
        updateSelectedSound((sound) => ({
            ...sound,
            mode: "synth",
            type: sound.type === "sample" ? "lead" : sound.type,
            layers: [
                ...sound.layers,
                {
                    id: createId("layer"),
                    waveform: "warmSaw",
                    octave: 0,
                    detune: 0,
                    gain: 0.35,
                    unison: 1,
                    spread: 0,
                },
            ],
        }));
    }, [updateSelectedSound]);

    const deleteLayer = React.useCallback((layerId) => {
        updateSelectedSound((sound) => ({
            ...sound,
            layers: sound.layers.length <= 1 ? sound.layers : sound.layers.filter((layer) => layer.id !== layerId),
        }));
    }, [updateSelectedSound]);

    const updateMixer = React.useCallback((channelId, field, value) => {
        setMixerChannels((current) =>
            current.map((channel) =>
                channel.id === channelId
                    ? {
                        ...channel,
                        [field]: value,
                    }
                    : channel
            )
        );
    }, []);

    const exportProject = React.useCallback(() => {
        downloadTextFile(
            `audiomasterlab-studio-${new Date().toISOString().slice(0, 10)}.json`,
            JSON.stringify({ bpm, sounds, mixerChannels, pattern }, null, 2)
        );
        setStatus("Project JSON exported.");
    }, [bpm, mixerChannels, pattern, sounds]);

    const importProject = React.useCallback((event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
            try {
                const parsed = JSON.parse(String(reader.result || "{}"));
                const importedSounds = Array.isArray(parsed.sounds)
                    ? parsed.sounds.map(normalizeImportedSound).filter(Boolean)
                    : sounds;

                const importedPattern = Array.isArray(parsed.pattern)
                    ? normalizePattern(parsed.pattern, importedSounds)
                    : createDefaultPattern(importedSounds);

                setBpm(clamp(parsed.bpm || bpm, 40, 240));
                setSounds(importedSounds.length ? importedSounds : sounds);
                setMixerChannels(Array.isArray(parsed.mixerChannels) ? parsed.mixerChannels : mixerChannels);
                setPattern(importedPattern);
                setSelectedSoundId(importedSounds[0]?.id || selectedSoundId);
                setStatus("Project imported.");
            } catch (importError) {
                setStatus(importError?.message || "Project import failed.");
            } finally {
                event.target.value = "";
            }
        };

        reader.readAsText(file);
    }, [bpm, mixerChannels, selectedSoundId, sounds]);

    return (
        <GradientPage>
            <Seo
                title="AudioMasterLab Music Studio"
                description="Advanced browser music studio with oscillator design, soundboard pads, Archive.org drum kit search, sequencer, and mixer."
            />

            <AppNavBar />

            <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
                <BackHomeButton />

                <SectionHeader
                    eyebrow="Advanced Music Studio"
                    title="Build sounds, search Archive drum kits, and sequence everything faster."
                    description="Use stronger oscillators, sample pads, mixer routing, and a categorized Archive.org drum-kit browser that drops selected sounds straight into the soundboard."
                />

                <Stack spacing={3}>
                    <TransportPanel
                        bpm={bpm}
                        playing={playingPattern}
                        status={status}
                        onBpmChange={(value) => setBpm(clamp(value, 40, 240))}
                        onPlay={startPattern}
                        onPause={stopPattern}
                        onStopAll={() => {
                            stopPattern();
                            stopAllSources();
                            setStatus("Stopped all playback.");
                        }}
                        onClearPattern={clearPattern}
                        onResetStudio={resetStudio}
                        onExportProject={exportProject}
                        onImportProject={importProject}
                    />

                    <Card sx={glassCardSx}>
                        <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                            <Tabs
                                value={selectedTab}
                                onChange={(event, value) => setSelectedTab(value)}
                                variant="scrollable"
                                scrollButtons="auto"
                                sx={{
                                    "& .MuiTab-root": {
                                        color: "rgba(255,255,255,.65)",
                                        fontWeight: 900,
                                        textTransform: "none",
                                    },
                                    "& .Mui-selected": {
                                        color: "#9ee8ff !important",
                                    },
                                    "& .MuiTabs-indicator": {
                                        bgcolor: "#9ee8ff",
                                    },
                                }}
                            >
                                <Tab icon={<AlbumRounded />} iconPosition="start" label="Soundboard" value="soundboard" />
                                <Tab icon={<GridOnRounded />} iconPosition="start" label="Sequencer" value="sequencer" />
                                <Tab icon={<BlurOnRounded />} iconPosition="start" label="Designer" value="designer" />
                                <Tab icon={<FolderTabIcon />} iconPosition="start" label="Archive Kits" value="archive" />
                                <Tab icon={<TuneRounded />} iconPosition="start" label="Mixer" value="mixer" />
                            </Tabs>
                        </CardContent>
                    </Card>

                    {selectedTab === "soundboard" && (
                        <SoundboardPanel
                            groupedSounds={groupedSounds}
                            selectedSoundId={selectedSoundId}
                            onSelectSound={setSelectedSoundId}
                            onPlaySound={triggerSoundById}
                            onDuplicateSound={duplicateSound}
                            onDeleteSound={deleteSound}
                            onCreateSynth={createNewSynth}
                        />
                    )}

                    {selectedTab === "sequencer" && (
                        <SequencerPanel
                            sounds={sounds}
                            pattern={pattern}
                            currentStep={currentStep}
                            selectedSoundId={selectedSoundId}
                            noteLengthSteps={noteLengthSteps}
                            scaleRoot={scaleRoot}
                            scaleId={scaleId}
                            onNoteLengthChange={setNoteLengthSteps}
                            onScaleRootChange={setScaleRoot}
                            onScaleChange={setScaleId}
                            onDrawNote={addPianoNote}
                            onDeleteNote={deletePianoNote}
                            onResizeNote={resizePianoNote}
                            onPlaySound={triggerSoundById}
                            onSelectSound={setSelectedSoundId}
                        />
                    )}

                    {selectedTab === "designer" && (
                        <DesignerPanel
                            sound={selectedSound}
                            mixerChannels={mixerChannels}
                            onPlay={() => playSound(selectedSound)}
                            onChange={updateSelectedSound}
                            onUpdateLayer={updateLayer}
                            onAddLayer={addLayer}
                            onDeleteLayer={deleteLayer}
                            onDuplicate={() => duplicateSound(selectedSound?.id)}
                            onDelete={() => deleteSound(selectedSound?.id)}
                            onCreateSynth={createNewSynth}
                        />
                    )}

                    {selectedTab === "archive" && (
                        <ArchiveKitBrowser
                            onAddSample={addArchiveSample}
                            onAddManySamples={addManyArchiveSamples}
                        />
                    )}

                    {selectedTab === "mixer" && (
                        <MixerPanel
                            mixerChannels={mixerChannels}
                            onMixerChange={updateMixer}
                        />
                    )}

                    <HelpPanel />
                </Stack>
            </Container>
        </GradientPage>
    );
}

function FolderTabIcon() {
    return <LibraryMusicRounded />;
}

function TransportPanel({
                            bpm,
                            playing,
                            status,
                            onBpmChange,
                            onPlay,
                            onPause,
                            onStopAll,
                            onClearPattern,
                            onResetStudio,
                            onExportProject,
                            onImportProject,
                        }) {
    return (
        <Card sx={glassCardSx}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack spacing={2}>
                    <Stack
                        direction={{ xs: "column", lg: "row" }}
                        spacing={2}
                        alignItems={{ xs: "stretch", lg: "center" }}
                        justifyContent="space-between"
                    >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={sectionIconSx}>
                                <GraphicEqRounded />
                            </Box>

                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 950 }}>
                                    Studio Transport
                                </Typography>
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,.58)" }}>
                                    {PATTERN_STEPS} steps · {STEPS_PER_BEAT} steps per beat · {secondsPerBar(bpm).toFixed(2)}s per bar
                                </Typography>
                            </Box>
                        </Stack>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
                            <Button
                                onClick={playing ? onPause : onPlay}
                                variant="contained"
                                startIcon={playing ? <PauseRounded /> : <PlayArrowRounded />}
                                sx={primaryPillSx}
                            >
                                {playing ? "Pause Pattern" : "Play Pattern"}
                            </Button>

                            <Button
                                onClick={onStopAll}
                                variant="outlined"
                                startIcon={<StopRounded />}
                                sx={outlinePillSx}
                            >
                                Stop All
                            </Button>

                            <Button
                                onClick={onClearPattern}
                                variant="outlined"
                                startIcon={<DeleteRounded />}
                                sx={outlinePillSx}
                            >
                                Clear Pattern
                            </Button>

                            <Button
                                onClick={onResetStudio}
                                variant="outlined"
                                startIcon={<RestartAltRounded />}
                                sx={outlinePillSx}
                            >
                                Reset Studio
                            </Button>
                        </Stack>
                    </Stack>

                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                size="small"
                                label="BPM"
                                type="number"
                                value={bpm}
                                inputProps={{ min: 40, max: 240 }}
                                onChange={(event) => onBpmChange(Number(event.target.value))}
                                sx={darkTextFieldSx}
                            />
                        </Grid>

                        <Grid item xs={12} md={5}>
                            <TinySlider
                                label="Tempo"
                                value={bpm}
                                min={40}
                                max={240}
                                step={1}
                                display={`${bpm} BPM`}
                                onChange={onBpmChange}
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent={{ xs: "flex-start", md: "flex-end" }}>
                                <Button
                                    onClick={onExportProject}
                                    variant="outlined"
                                    startIcon={<DownloadRounded />}
                                    sx={outlinePillSx}
                                >
                                    Export JSON
                                </Button>

                                <Button
                                    component="label"
                                    variant="outlined"
                                    startIcon={<UploadFileRounded />}
                                    sx={outlinePillSx}
                                >
                                    Import
                                    <input hidden type="file" accept="application/json,.json" onChange={onImportProject} />
                                </Button>

                                <Chip
                                    icon={<SaveRounded />}
                                    label="Auto-saves"
                                    sx={{
                                        color: "#9ee8ff",
                                        bgcolor: "rgba(158,232,255,.09)",
                                        border: "1px solid rgba(158,232,255,.16)",
                                        fontWeight: 800,
                                    }}
                                />
                            </Stack>
                        </Grid>
                    </Grid>

                    <Alert severity="info" sx={{ bgcolor: "rgba(158,232,255,.08)", color: "#fff" }}>
                        {status}
                    </Alert>
                </Stack>
            </CardContent>
        </Card>
    );
}

function SoundboardPanel({
                             groupedSounds,
                             selectedSoundId,
                             onSelectSound,
                             onPlaySound,
                             onDuplicateSound,
                             onDeleteSound,
                             onCreateSynth,
                         }) {
    return (
        <Card sx={glassCardSx}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack spacing={2.5}>
                    <PanelTitle
                        icon={<AlbumRounded />}
                        title="Music Soundboard"
                        description="Click a pad to play it. Select a pad to design it or draw it into the sequencer."
                        action={
                            <Button onClick={onCreateSynth} variant="contained" startIcon={<AddRounded />} sx={primaryPillSx}>
                                New Synth Pad
                            </Button>
                        }
                    />

                    {groupedSounds.map(([group, groupSounds]) => (
                        <Box key={group}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
                                <Chip
                                    label={group}
                                    sx={{
                                        color: "#06101f",
                                        bgcolor: "#9ee8ff",
                                        fontWeight: 950,
                                        textTransform: "capitalize",
                                    }}
                                />
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,.52)" }}>
                                    {groupSounds.length} pad(s)
                                </Typography>
                            </Stack>

                            <Grid container spacing={1.5}>
                                {groupSounds.map((sound) => {
                                    const selected = sound.id === selectedSoundId;
                                    return (
                                        <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={sound.id}>
                                            <Box
                                                sx={{
                                                    p: 1.4,
                                                    borderRadius: 4,
                                                    border: selected ? "1px solid rgba(158,232,255,.75)" : "1px solid rgba(255,255,255,.1)",
                                                    bgcolor: selected ? "rgba(158,232,255,.12)" : "rgba(255,255,255,.04)",
                                                    minHeight: 150,
                                                    display: "flex",
                                                    flexDirection: "column",
                                                }}
                                            >
                                                <Stack spacing={1} sx={{ flex: 1 }}>
                                                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                                                        <Box sx={{ minWidth: 0 }}>
                                                            <Typography noWrap sx={{ fontWeight: 950 }}>
                                                                {sound.name}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: "rgba(255,255,255,.52)", textTransform: "capitalize" }}>
                                                                {sound.mode === "sample" ? "Archive sample" : `${sound.layers.length} osc`} · {sound.type}
                                                            </Typography>
                                                        </Box>

                                                        <Tooltip title="Select pad">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => onSelectSound(sound.id)}
                                                                sx={{
                                                                    color: selected ? "#06101f" : "#fff",
                                                                    bgcolor: selected ? "#9ee8ff" : "rgba(255,255,255,.08)",
                                                                }}
                                                            >
                                                                <PianoRounded fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>

                                                    {sound.sample?.displayName && (
                                                        <Typography variant="caption" noWrap sx={{ color: "rgba(255,255,255,.45)" }}>
                                                            Source: {sound.sample.displayName}
                                                        </Typography>
                                                    )}

                                                    <Stack direction="row" spacing={1} sx={{ mt: "auto" }}>
                                                        <Button
                                                            fullWidth
                                                            onClick={() => onPlaySound(sound.id)}
                                                            variant="contained"
                                                            startIcon={<PlayArrowRounded />}
                                                            sx={primaryPillSx}
                                                        >
                                                            Play
                                                        </Button>

                                                        <Tooltip title="Duplicate pad">
                                                            <IconButton onClick={() => onDuplicateSound(sound.id)} sx={iconButtonSx}>
                                                                <ContentCopyRounded fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>

                                                        <Tooltip title="Delete pad">
                                                            <IconButton onClick={() => onDeleteSound(sound.id)} sx={iconButtonSx}>
                                                                <DeleteRounded fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </Stack>
                                            </Box>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Box>
                    ))}
                </Stack>
            </CardContent>
        </Card>
    );
}

function SequencerPanel({
                            sounds,
                            pattern,
                            currentStep,
                            selectedSoundId,
                            noteLengthSteps,
                            scaleRoot,
                            scaleId,
                            onNoteLengthChange,
                            onScaleRootChange,
                            onScaleChange,
                            onDrawNote,
                            onDeleteNote,
                            onResizeNote,
                            onPlaySound,
                            onSelectSound,
                        }) {
    const selectedSound = sounds.find((sound) => sound.id === selectedSoundId) || sounds[0];
    const scalePitchClasses = React.useMemo(
        () => getScalePitchClasses(scaleRoot, scaleId),
        [scaleId, scaleRoot]
    );
    const visibleNotes = React.useMemo(
        () => FULL_PIANO_ROLL_NOTES.filter((pianoNote) => scalePitchClasses.has(pianoNote.pitchClass)),
        [scalePitchClasses]
    );
    const selectedScale = SCALE_DEFINITIONS.find((scale) => scale.id === scaleId) || SCALE_DEFINITIONS[0];
    const safeLength = Math.round(clamp(noteLengthSteps, 1, PATTERN_STEPS));
    const rollScrollRef = React.useRef(null);
    const drawingRef = React.useRef(false);
    const lastDrawKeyRef = React.useRef("");
    const resizeRef = React.useRef(null);
    const [resizePreview, setResizePreview] = React.useState(null);

    React.useEffect(() => {
        const stopDrawing = () => {
            drawingRef.current = false;
            lastDrawKeyRef.current = "";
        };
        window.addEventListener("pointerup", stopDrawing);
        window.addEventListener("blur", stopDrawing);
        return () => {
            window.removeEventListener("pointerup", stopDrawing);
            window.removeEventListener("blur", stopDrawing);
        };
    }, []);

    React.useEffect(() => {
        const node = rollScrollRef.current;
        if (!node) return;
        const frame = window.requestAnimationFrame(() => {
            node.scrollTop = Math.max(0, node.scrollHeight * 0.43 - node.clientHeight / 2);
        });
        return () => window.cancelAnimationFrame(frame);
    }, [scaleId, scaleRoot]);

    const drawAt = React.useCallback(
        (pianoNote, stepIndex) => {
            if (!selectedSound?.id) return;
            const key = `${selectedSound.id}:${pianoNote.midi}:${stepIndex}`;
            if (lastDrawKeyRef.current === key) return;
            lastDrawKeyRef.current = key;
            onDrawNote({
                soundId: selectedSound.id,
                note: pianoNote.value,
                startStep: stepIndex,
                lengthSteps: safeLength,
            });
        },
        [onDrawNote, safeLength, selectedSound]
    );

    const beginRightDraw = React.useCallback(
        (event, pianoNote, stepIndex) => {
            if (event.button !== 2) return;
            event.preventDefault();
            drawingRef.current = true;
            lastDrawKeyRef.current = "";
            drawAt(pianoNote, stepIndex);
        },
        [drawAt]
    );

    const continueRightDraw = React.useCallback(
        (event, pianoNote, stepIndex) => {
            if (!drawingRef.current || !(event.buttons & 2)) return;
            event.preventDefault();
            drawAt(pianoNote, stepIndex);
        },
        [drawAt]
    );

    const beginNoteResize = React.useCallback((event, patternNote, rowElement) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        const rowWidth = rowElement?.getBoundingClientRect().width || PATTERN_STEPS * 30;
        resizeRef.current = {
            id: patternNote.id,
            pointerId: event.pointerId,
            startX: event.clientX,
            startLength: patternNote.lengthSteps,
            stepWidth: Math.max(1, rowWidth / PATTERN_STEPS),
            maxLength: PATTERN_STEPS - patternNote.startStep,
            dragged: false,
            length: patternNote.lengthSteps,
        };
        setResizePreview({ id: patternNote.id, length: patternNote.lengthSteps });
    }, []);

    const moveNoteResize = React.useCallback((event) => {
        const resize = resizeRef.current;
        if (!resize || resize.pointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        const deltaPixels = event.clientX - resize.startX;
        if (Math.abs(deltaPixels) > 3) resize.dragged = true;
        const deltaSteps = Math.round(deltaPixels / resize.stepWidth);
        resize.length = Math.round(clamp(resize.startLength + deltaSteps, 1, resize.maxLength));
        setResizePreview({ id: resize.id, length: resize.length });
    }, []);

    const finishNoteResize = React.useCallback(
        (event) => {
            const resize = resizeRef.current;
            if (!resize || resize.pointerId !== event.pointerId) return;
            event.preventDefault();
            event.stopPropagation();
            if (resize.dragged) {
                onResizeNote(resize.id, resize.length);
            } else {
                onDeleteNote(resize.id);
            }
            resizeRef.current = null;
            setResizePreview(null);
        },
        [onDeleteNote, onResizeNote]
    );

    return (
        <Card sx={glassCardSx}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack spacing={2}>
                    <PanelTitle
                        icon={<PianoRounded />}
                        title="Scale Piano Roll"
                        description="Right-click or right-drag empty cells to draw. Left-click a note to erase it, or left-drag the note to resize it. A resized length becomes the length of the next notes you draw."
                    />

                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 3,
                            bgcolor: "rgba(255,255,255,.04)",
                            border: "1px solid rgba(255,255,255,.08)",
                        }}
                    >
                        <Stack direction={{ xs: "column", lg: "row" }} spacing={1.2} useFlexGap flexWrap="wrap">
                            <FormControl size="small" sx={{ minWidth: 220, ...darkSelectSx }}>
                                <InputLabel>Draw Track</InputLabel>
                                <Select
                                    label="Draw Track"
                                    value={selectedSound?.id || ""}
                                    onChange={(event) => onSelectSound(event.target.value)}
                                >
                                    {sounds.map((sound) => (
                                        <MenuItem key={sound.id} value={sound.id}>
                                            {sound.name} · {sound.type}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl size="small" sx={{ minWidth: 120, ...darkSelectSx }}>
                                <InputLabel>Root</InputLabel>
                                <Select
                                    label="Root"
                                    value={scaleRoot}
                                    onChange={(event) => onScaleRootChange(event.target.value)}
                                >
                                    {CHROMATIC_NOTES.map((root) => (
                                        <MenuItem key={root} value={root}>{root}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl size="small" sx={{ minWidth: 190, ...darkSelectSx }}>
                                <InputLabel>Scale</InputLabel>
                                <Select
                                    label="Scale"
                                    value={scaleId}
                                    onChange={(event) => onScaleChange(event.target.value)}
                                >
                                    {SCALE_DEFINITIONS.map((scale) => (
                                        <MenuItem key={scale.id} value={scale.id}>{scale.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl size="small" sx={{ minWidth: 180, ...darkSelectSx }}>
                                <InputLabel>Next Note Length</InputLabel>
                                <Select
                                    label="Next Note Length"
                                    value={safeLength}
                                    onChange={(event) => onNoteLengthChange(Number(event.target.value))}
                                >
                                    <MenuItem value={1}>1 step · 1/16</MenuItem>
                                    <MenuItem value={2}>2 steps · 1/8</MenuItem>
                                    <MenuItem value={4}>4 steps · 1 beat</MenuItem>
                                    <MenuItem value={8}>8 steps · 2 beats</MenuItem>
                                    <MenuItem value={16}>16 steps · 1 bar</MenuItem>
                                    <MenuItem value={32}>32 steps · 2 bars</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>

                        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} sx={{ mt: 1.5 }}>
                            <Box sx={{ flex: 1, minWidth: 240 }}>
                                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4 }}>
                                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,.62)", fontWeight: 850 }}>
                                        Inherited note length
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "#9ee8ff", fontWeight: 950 }}>
                                        {safeLength} step{safeLength === 1 ? "" : "s"}
                                    </Typography>
                                </Stack>
                                <Slider
                                    size="small"
                                    min={1}
                                    max={PATTERN_STEPS}
                                    step={1}
                                    value={safeLength}
                                    onChange={(_, value) => onNoteLengthChange(Number(value))}
                                />
                            </Box>

                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                <Chip
                                    label={`${scaleRoot} ${selectedScale.label} · C0–C9`}
                                    sx={{ color: "#9ee8ff", bgcolor: "rgba(158,232,255,.09)" }}
                                />
                                <Chip
                                    label={`${visibleNotes.length} visible keys`}
                                    sx={{ color: "rgba(255,255,255,.82)", bgcolor: "rgba(255,255,255,.07)" }}
                                />
                                <Chip
                                    label={`${pattern.length} notes`}
                                    sx={{ color: "rgba(255,255,255,.82)", bgcolor: "rgba(255,255,255,.07)" }}
                                />
                            </Stack>
                        </Stack>
                    </Box>

                    <Alert
                        severity="info"
                        sx={{
                            bgcolor: "rgba(158,232,255,.08)",
                            color: "rgba(255,255,255,.82)",
                            border: "1px solid rgba(158,232,255,.16)",
                        }}
                    >
                        Right mouse draws and paints. Left click erases. Hold the left button and drag horizontally on an existing note to change its length; that new length is inherited by every note placed afterward.
                    </Alert>

                    <Box
                        ref={rollScrollRef}
                        onContextMenu={(event) => event.preventDefault()}
                        sx={{
                            overflow: "auto",
                            maxHeight: 720,
                            borderRadius: 3,
                            border: "1px solid rgba(255,255,255,.08)",
                            bgcolor: "rgba(2,4,12,.54)",
                            overscrollBehavior: "contain",
                            userSelect: "none",
                        }}
                    >
                        <Box sx={{ minWidth: 1180, p: 0.8 }}>
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: "118px 1fr",
                                    gap: 0.55,
                                    position: "sticky",
                                    top: 0,
                                    zIndex: 12,
                                    bgcolor: "rgba(5,7,17,.97)",
                                    pb: 0.6,
                                }}
                            >
                                <Box />
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: `repeat(${PATTERN_STEPS}, minmax(28px, 1fr))`,
                                        gap: 0.55,
                                    }}
                                >
                                    {Array.from({ length: PATTERN_STEPS }).map((_, stepIndex) => (
                                        <Box
                                            key={`roll-step-${stepIndex}`}
                                            sx={{
                                                minHeight: 28,
                                                display: "grid",
                                                placeItems: "center",
                                                borderRadius: 1.2,
                                                color: currentStep === stepIndex ? "#06101f" : stepIndex % 4 === 0 ? "#9ee8ff" : "rgba(255,255,255,.46)",
                                                bgcolor: currentStep === stepIndex ? "#9ee8ff" : stepIndex % 4 === 0 ? "rgba(158,232,255,.1)" : "rgba(255,255,255,.035)",
                                                border: stepIndex % 4 === 0 ? "1px solid rgba(158,232,255,.18)" : "1px solid rgba(255,255,255,.05)",
                                            }}
                                        >
                                            <Typography variant="caption" sx={{ fontSize: ".64rem", fontWeight: 950 }}>
                                                {stepIndex + 1}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>

                            {visibleNotes.map((pianoNote) => {
                                const isSharp = pianoNote.name.includes("#");
                                const isRoot = pianoNote.name === scaleRoot;
                                const rowNotes = pattern
                                    .filter((patternNote) => Math.abs(patternNote.note - pianoNote.value) < 0.001)
                                    .sort((a, b) => a.startStep - b.startStep);

                                return (
                                    <Box
                                        key={pianoNote.midi}
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: "118px 1fr",
                                            gap: 0.55,
                                            mb: 0.45,
                                        }}
                                    >
                                        <Button
                                            onClick={() => selectedSound?.id && onPlaySound(selectedSound.id, { frequency: pianoNote.value })}
                                            sx={{
                                                minHeight: 34,
                                                justifyContent: "space-between",
                                                px: 1,
                                                position: "sticky",
                                                left: 0,
                                                zIndex: 8,
                                                color: isRoot ? "#06101f" : isSharp ? "#b38cff" : "#fff",
                                                bgcolor: isRoot ? "#9ee8ff" : isSharp ? "rgba(0,0,0,.58)" : "rgba(255,255,255,.09)",
                                                border: isRoot ? "1px solid #fff" : "1px solid rgba(255,255,255,.08)",
                                                borderRadius: 1.5,
                                                "&:hover": {
                                                    bgcolor: isRoot ? "#b8efff" : isSharp ? "rgba(25,18,42,.9)" : "rgba(255,255,255,.14)",
                                                },
                                            }}
                                        >
                                            <Typography variant="caption" sx={{ fontWeight: 950 }}>{pianoNote.label}</Typography>
                                            {isRoot && <Typography variant="caption" sx={{ fontSize: ".58rem", fontWeight: 950 }}>ROOT</Typography>}
                                        </Button>

                                        <Box
                                            sx={{
                                                minHeight: 34,
                                                display: "grid",
                                                gridTemplateColumns: `repeat(${PATTERN_STEPS}, minmax(28px, 1fr))`,
                                                gap: 0.55,
                                                position: "relative",
                                            }}
                                        >
                                            {Array.from({ length: PATTERN_STEPS }).map((_, stepIndex) => {
                                                const beat = stepIndex % 4 === 0;
                                                const live = currentStep === stepIndex;
                                                return (
                                                    <Box
                                                        key={`${pianoNote.midi}-${stepIndex}`}
                                                        role="button"
                                                        tabIndex={0}
                                                        aria-label={`Draw ${pianoNote.label} at step ${stepIndex + 1}`}
                                                        onPointerDown={(event) => beginRightDraw(event, pianoNote, stepIndex)}
                                                        onPointerEnter={(event) => continueRightDraw(event, pianoNote, stepIndex)}
                                                        onKeyDown={(event) => {
                                                            if (event.key === "Enter" || event.key === " ") {
                                                                event.preventDefault();
                                                                drawAt(pianoNote, stepIndex);
                                                            }
                                                        }}
                                                        sx={{
                                                            borderRadius: 1,
                                                            cursor: "crosshair",
                                                            bgcolor: live
                                                                ? "rgba(158,232,255,.16)"
                                                                : isSharp
                                                                    ? "rgba(0,0,0,.24)"
                                                                    : beat
                                                                        ? "rgba(255,255,255,.06)"
                                                                        : "rgba(255,255,255,.025)",
                                                            border: live
                                                                ? "1px solid rgba(158,232,255,.48)"
                                                                : beat
                                                                    ? "1px solid rgba(158,232,255,.12)"
                                                                    : "1px solid rgba(255,255,255,.045)",
                                                            "&:hover": { bgcolor: "rgba(158,232,255,.14)" },
                                                            "&:focus-visible": { outline: "2px solid #9ee8ff", outlineOffset: -2 },
                                                        }}
                                                    />
                                                );
                                            })}

                                            <Box
                                                sx={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    display: "grid",
                                                    gridTemplateColumns: `repeat(${PATTERN_STEPS}, minmax(28px, 1fr))`,
                                                    gap: 0.55,
                                                    pointerEvents: "none",
                                                }}
                                            >
                                                {rowNotes.map((patternNote, noteIndex) => {
                                                    const previewLength = resizePreview?.id === patternNote.id
                                                        ? resizePreview.length
                                                        : patternNote.lengthSteps;
                                                    const sound = sounds.find((item) => item.id === patternNote.soundId);

                                                    return (
                                                        <Tooltip
                                                            key={patternNote.id}
                                                            title={`Left click: erase · Left drag: resize · ${previewLength} step${previewLength === 1 ? "" : "s"}`}
                                                        >
                                                            <Box
                                                                onPointerDown={(event) => beginNoteResize(event, patternNote, event.currentTarget.parentElement)}
                                                                onPointerMove={moveNoteResize}
                                                                onPointerUp={finishNoteResize}
                                                                onPointerCancel={finishNoteResize}
                                                                onContextMenu={(event) => event.preventDefault()}
                                                                sx={{
                                                                    gridColumn: `${patternNote.startStep + 1} / span ${previewLength}`,
                                                                    minWidth: 18,
                                                                    height: 24,
                                                                    mt: `${4 + (noteIndex % 2) * 5}px`,
                                                                    mx: "2px",
                                                                    zIndex: 4 + (noteIndex % 2),
                                                                    px: 0.75,
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "space-between",
                                                                    gap: 0.6,
                                                                    pointerEvents: "auto",
                                                                    cursor: "ew-resize",
                                                                    overflow: "hidden",
                                                                    borderRadius: 1.2,
                                                                    color: "#06101f",
                                                                    bgcolor: sound?.mode === "sample" ? "#b38cff" : "#9ee8ff",
                                                                    border: "1px solid rgba(255,255,255,.9)",
                                                                    boxShadow: "0 5px 14px rgba(0,0,0,.28)",
                                                                    touchAction: "none",
                                                                }}
                                                            >
                                                                <Typography variant="caption" noWrap sx={{ fontSize: ".61rem", fontWeight: 950 }}>
                                                                    {sound?.name || "Track"}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ fontSize: ".56rem", fontWeight: 950, opacity: 0.72 }}>
                                                                    {previewLength}
                                                                </Typography>
                                                            </Box>
                                                        </Tooltip>
                                                    );
                                                })}
                                            </Box>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

function DesignerPanel({
                           sound,
                           mixerChannels,
                           onPlay,
                           onChange,
                           onUpdateLayer,
                           onAddLayer,
                           onDeleteLayer,
                           onDuplicate,
                           onDelete,
                           onCreateSynth,
                       }) {
    if (!sound) {
        return (
            <Card sx={glassCardSx}>
                <CardContent>
                    <Typography>No selected sound.</Typography>
                </CardContent>
            </Card>
        );
    }

    const isSample = sound.mode === "sample";

    return (
        <Card sx={glassCardSx}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack spacing={2.4}>
                    <PanelTitle
                        icon={<BlurOnRounded />}
                        title="Advanced Sound Designer"
                        description="Shape pads with oscillator layers, unison spread, filter movement, saturation, delay, and reverb."
                        action={
                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                <Button onClick={onPlay} variant="contained" startIcon={<PlayArrowRounded />} sx={primaryPillSx}>
                                    Audition
                                </Button>
                                <Button onClick={onCreateSynth} variant="outlined" startIcon={<AddRounded />} sx={outlinePillSx}>
                                    New
                                </Button>
                                <Button onClick={onDuplicate} variant="outlined" startIcon={<ContentCopyRounded />} sx={outlinePillSx}>
                                    Duplicate
                                </Button>
                                <Button onClick={onDelete} variant="outlined" startIcon={<DeleteRounded />} sx={outlinePillSx}>
                                    Delete
                                </Button>
                            </Stack>
                        }
                    />

                    {isSample && (
                        <Alert severity="info" sx={{ bgcolor: "rgba(158,232,255,.08)", color: "#fff" }}>
                            This pad uses an Archive sample. You can still control gain, envelope, pitch, filter, drive, and FX.
                        </Alert>
                    )}

                    <Grid container spacing={2}>
                        <Grid item xs={12} lg={3}>
                            <DesignerSection title="Core">
                                <TextField
                                    size="small"
                                    label="Name"
                                    value={sound.name}
                                    onChange={(event) => onChange({ name: event.target.value })}
                                    sx={darkTextFieldSx}
                                />

                                <FormControl size="small" fullWidth sx={darkSelectSx}>
                                    <InputLabel>Type</InputLabel>
                                    <Select
                                        label="Type"
                                        value={sound.type}
                                        onChange={(event) =>
                                            onChange({
                                                type: event.target.value,
                                                mode: event.target.value === "sample" ? "sample" : "synth",
                                            })
                                        }
                                    >
                                        {SOUND_TYPES.map((type) => (
                                            <MenuItem key={type} value={type}>
                                                {type}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl size="small" fullWidth sx={darkSelectSx}>
                                    <InputLabel>Mixer Route</InputLabel>
                                    <Select
                                        label="Mixer Route"
                                        value={sound.mixerChannelId}
                                        onChange={(event) => onChange({ mixerChannelId: event.target.value })}
                                    >
                                        {mixerChannels.map((channel) => (
                                            <MenuItem key={channel.id} value={channel.id}>
                                                {channel.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <TinySlider
                                    label="Root Frequency"
                                    value={sound.rootFrequency}
                                    min={35}
                                    max={1400}
                                    step={1}
                                    display={`${Math.round(sound.rootFrequency)} Hz`}
                                    onChange={(value) => onChange({ rootFrequency: value })}
                                />

                                <TinySlider
                                    label="Pad Gain"
                                    value={sound.masterGain}
                                    min={0}
                                    max={1.5}
                                    step={0.01}
                                    display={formatPercent(sound.masterGain)}
                                    onChange={(value) => onChange({ masterGain: value })}
                                />

                                <TinySlider
                                    label="Pan"
                                    value={sound.pan}
                                    min={-1}
                                    max={1}
                                    step={0.01}
                                    display={sound.pan.toFixed(2)}
                                    onChange={(value) => onChange({ pan: value })}
                                />

                                <TinySlider
                                    label="Drive"
                                    value={sound.drive}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    display={formatPercent(sound.drive)}
                                    onChange={(value) => onChange({ drive: value })}
                                />
                            </DesignerSection>
                        </Grid>

                        <Grid item xs={12} lg={3}>
                            <DesignerSection title="Envelope + Pitch">
                                <TinySlider
                                    label="Attack"
                                    value={sound.envelope.attack}
                                    min={0.001}
                                    max={3}
                                    step={0.001}
                                    display={`${sound.envelope.attack.toFixed(3)}s`}
                                    onChange={(value) =>
                                        onChange({
                                            envelope: {
                                                ...sound.envelope,
                                                attack: value,
                                            },
                                        })
                                    }
                                />

                                <TinySlider
                                    label="Decay"
                                    value={sound.envelope.decay}
                                    min={0.001}
                                    max={3}
                                    step={0.001}
                                    display={`${sound.envelope.decay.toFixed(3)}s`}
                                    onChange={(value) =>
                                        onChange({
                                            envelope: {
                                                ...sound.envelope,
                                                decay: value,
                                            },
                                        })
                                    }
                                />

                                <TinySlider
                                    label="Sustain"
                                    value={sound.envelope.sustain}
                                    min={0.001}
                                    max={1}
                                    step={0.001}
                                    display={formatPercent(sound.envelope.sustain)}
                                    onChange={(value) =>
                                        onChange({
                                            envelope: {
                                                ...sound.envelope,
                                                sustain: value,
                                            },
                                        })
                                    }
                                />

                                <TinySlider
                                    label="Hold"
                                    value={sound.envelope.hold}
                                    min={0}
                                    max={4}
                                    step={0.01}
                                    display={`${sound.envelope.hold.toFixed(2)}s`}
                                    onChange={(value) =>
                                        onChange({
                                            envelope: {
                                                ...sound.envelope,
                                                hold: value,
                                            },
                                        })
                                    }
                                />

                                <TinySlider
                                    label="Release"
                                    value={sound.envelope.release}
                                    min={0.01}
                                    max={6}
                                    step={0.01}
                                    display={`${sound.envelope.release.toFixed(2)}s`}
                                    onChange={(value) =>
                                        onChange({
                                            envelope: {
                                                ...sound.envelope,
                                                release: value,
                                            },
                                        })
                                    }
                                />

                                <TinySlider
                                    label="Pitch Start"
                                    value={sound.pitch.startSemitones}
                                    min={-36}
                                    max={36}
                                    step={1}
                                    display={`${sound.pitch.startSemitones} st`}
                                    onChange={(value) =>
                                        onChange({
                                            pitch: {
                                                ...sound.pitch,
                                                startSemitones: value,
                                            },
                                        })
                                    }
                                />

                                <TinySlider
                                    label="Pitch End"
                                    value={sound.pitch.endSemitones}
                                    min={-36}
                                    max={36}
                                    step={1}
                                    display={`${sound.pitch.endSemitones} st`}
                                    onChange={(value) =>
                                        onChange({
                                            pitch: {
                                                ...sound.pitch,
                                                endSemitones: value,
                                            },
                                        })
                                    }
                                />
                            </DesignerSection>
                        </Grid>

                        <Grid item xs={12} lg={3}>
                            <DesignerSection title="Filter + FX">
                                <FormControl size="small" fullWidth sx={darkSelectSx}>
                                    <InputLabel>Filter</InputLabel>
                                    <Select
                                        label="Filter"
                                        value={sound.filter.type}
                                        onChange={(event) =>
                                            onChange({
                                                filter: {
                                                    ...sound.filter,
                                                    type: event.target.value,
                                                },
                                            })
                                        }
                                    >
                                        {FILTER_TYPES.map((type) => (
                                            <MenuItem key={type} value={type}>
                                                {type}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <TinySlider
                                    label="Cutoff"
                                    value={sound.filter.cutoff}
                                    min={40}
                                    max={20000}
                                    step={10}
                                    display={`${Math.round(sound.filter.cutoff)} Hz`}
                                    onChange={(value) =>
                                        onChange({
                                            filter: {
                                                ...sound.filter,
                                                cutoff: value,
                                            },
                                        })
                                    }
                                />

                                <TinySlider
                                    label="Resonance"
                                    value={sound.filter.q}
                                    min={0.1}
                                    max={24}
                                    step={0.1}
                                    display={sound.filter.q.toFixed(1)}
                                    onChange={(value) =>
                                        onChange({
                                            filter: {
                                                ...sound.filter,
                                                q: value,
                                            },
                                        })
                                    }
                                />

                                <TinySlider
                                    label="Filter Envelope"
                                    value={sound.filter.envAmount}
                                    min={-12000}
                                    max={12000}
                                    step={50}
                                    display={`${Math.round(sound.filter.envAmount)} Hz`}
                                    onChange={(value) =>
                                        onChange({
                                            filter: {
                                                ...sound.filter,
                                                envAmount: value,
                                            },
                                        })
                                    }
                                />

                                <TinySlider
                                    label="Delay Time"
                                    value={sound.fx.delayTime}
                                    min={0}
                                    max={1.5}
                                    step={0.01}
                                    display={`${sound.fx.delayTime.toFixed(2)}s`}
                                    onChange={(value) =>
                                        onChange({
                                            fx: {
                                                ...sound.fx,
                                                delayTime: value,
                                            },
                                        })
                                    }
                                />

                                <TinySlider
                                    label="Delay Feedback"
                                    value={sound.fx.delayFeedback}
                                    min={0}
                                    max={0.9}
                                    step={0.01}
                                    display={formatPercent(sound.fx.delayFeedback)}
                                    onChange={(value) =>
                                        onChange({
                                            fx: {
                                                ...sound.fx,
                                                delayFeedback: value,
                                            },
                                        })
                                    }
                                />

                                <TinySlider
                                    label="Delay Mix"
                                    value={sound.fx.delayMix}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    display={formatPercent(sound.fx.delayMix)}
                                    onChange={(value) =>
                                        onChange({
                                            fx: {
                                                ...sound.fx,
                                                delayMix: value,
                                            },
                                        })
                                    }
                                />

                                <TinySlider
                                    label="Reverb"
                                    value={sound.fx.reverbMix}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    display={formatPercent(sound.fx.reverbMix)}
                                    onChange={(value) =>
                                        onChange({
                                            fx: {
                                                ...sound.fx,
                                                reverbMix: value,
                                            },
                                        })
                                    }
                                />
                            </DesignerSection>
                        </Grid>

                        <Grid item xs={12} lg={3}>
                            <DesignerSection
                                title="Oscillators"
                                action={
                                    <Button
                                        onClick={onAddLayer}
                                        size="small"
                                        variant="contained"
                                        startIcon={<AddRounded />}
                                        sx={primaryPillSx}
                                    >
                                        Add Layer
                                    </Button>
                                }
                            >
                                {isSample && (
                                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,.55)" }}>
                                        Sample pads can become synth pads if you add oscillator layers and change the type.
                                    </Typography>
                                )}

                                {sound.layers.map((layer, index) => (
                                    <Box
                                        key={layer.id}
                                        sx={{
                                            p: 1.2,
                                            borderRadius: 3,
                                            border: "1px solid rgba(255,255,255,.1)",
                                            bgcolor: "rgba(255,255,255,.04)",
                                        }}
                                    >
                                        <Stack spacing={1}>
                                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                                                <Typography variant="caption" sx={{ fontWeight: 950 }}>
                                                    Layer {index + 1}
                                                </Typography>
                                                <IconButton
                                                    size="small"
                                                    disabled={sound.layers.length <= 1}
                                                    onClick={() => onDeleteLayer(layer.id)}
                                                    sx={iconButtonSx}
                                                >
                                                    <DeleteRounded fontSize="small" />
                                                </IconButton>
                                            </Stack>

                                            <FormControl size="small" fullWidth sx={darkSelectSx}>
                                                <InputLabel>Wave</InputLabel>
                                                <Select
                                                    label="Wave"
                                                    value={layer.waveform}
                                                    onChange={(event) => onUpdateLayer(layer.id, "waveform", event.target.value)}
                                                >
                                                    {WAVEFORMS.map((waveform) => (
                                                        <MenuItem key={waveform} value={waveform}>
                                                            {waveform}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>

                                            <TinySlider
                                                label="Gain"
                                                value={layer.gain}
                                                min={0}
                                                max={1.4}
                                                step={0.01}
                                                display={formatPercent(layer.gain)}
                                                onChange={(value) => onUpdateLayer(layer.id, "gain", value)}
                                            />

                                            <TinySlider
                                                label="Octave"
                                                value={layer.octave}
                                                min={-3}
                                                max={3}
                                                step={1}
                                                display={`${layer.octave}`}
                                                onChange={(value) => onUpdateLayer(layer.id, "octave", value)}
                                            />

                                            <TinySlider
                                                label="Detune"
                                                value={layer.detune}
                                                min={-100}
                                                max={100}
                                                step={1}
                                                display={`${layer.detune} cents`}
                                                onChange={(value) => onUpdateLayer(layer.id, "detune", value)}
                                            />

                                            <TinySlider
                                                label="Unison"
                                                value={layer.unison}
                                                min={1}
                                                max={9}
                                                step={1}
                                                display={`${layer.unison} voice(s)`}
                                                onChange={(value) => onUpdateLayer(layer.id, "unison", value)}
                                            />

                                            <TinySlider
                                                label="Spread"
                                                value={layer.spread}
                                                min={0}
                                                max={80}
                                                step={1}
                                                display={`${layer.spread} cents`}
                                                onChange={(value) => onUpdateLayer(layer.id, "spread", value)}
                                            />
                                        </Stack>
                                    </Box>
                                ))}
                            </DesignerSection>
                        </Grid>
                    </Grid>
                </Stack>
            </CardContent>
        </Card>
    );
}

function MixerPanel({ mixerChannels, onMixerChange }) {
    return (
        <Card sx={glassCardSx}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack spacing={2.5}>
                    <PanelTitle
                        icon={<TuneRounded />}
                        title="Mixer"
                        description="Route drums, bass, music, and Archive samples through simple gain, pan, mute, solo, and filter controls."
                    />

                    <Grid container spacing={2}>
                        {mixerChannels.map((channel) => (
                            <Grid item xs={12} md={6} xl={4} key={channel.id}>
                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: 4,
                                        border: "1px solid rgba(255,255,255,.1)",
                                        bgcolor: "rgba(255,255,255,.04)",
                                    }}
                                >
                                    <Stack spacing={1.6}>
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                                            <Box>
                                                <Typography sx={{ fontWeight: 950 }}>{channel.name}</Typography>
                                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,.52)" }}>
                                                    {channel.id}
                                                </Typography>
                                            </Box>

                                            <Stack direction="row" spacing={1}>
                                                <IconButton
                                                    onClick={() => onMixerChange(channel.id, "muted", !channel.muted)}
                                                    sx={{
                                                        ...iconButtonSx,
                                                        bgcolor: channel.muted ? "rgba(255,95,87,.24)" : iconButtonSx.bgcolor,
                                                    }}
                                                >
                                                    {channel.muted ? <VolumeOffRounded /> : <VolumeUpRounded />}
                                                </IconButton>

                                                {channel.id !== "master" && (
                                                    <Button
                                                        onClick={() => onMixerChange(channel.id, "solo", !channel.solo)}
                                                        variant={channel.solo ? "contained" : "outlined"}
                                                        sx={channel.solo ? primaryPillSx : outlinePillSx}
                                                    >
                                                        Solo
                                                    </Button>
                                                )}
                                            </Stack>
                                        </Stack>

                                        <TinySlider
                                            label="Volume"
                                            value={channel.volume}
                                            min={0}
                                            max={1.5}
                                            step={0.01}
                                            display={formatPercent(channel.volume)}
                                            onChange={(value) => onMixerChange(channel.id, "volume", value)}
                                        />

                                        <TinySlider
                                            label="Pan"
                                            value={channel.pan}
                                            min={-1}
                                            max={1}
                                            step={0.01}
                                            display={channel.pan.toFixed(2)}
                                            onChange={(value) => onMixerChange(channel.id, "pan", value)}
                                        />

                                        <FormControl size="small" fullWidth sx={darkSelectSx}>
                                            <InputLabel>Filter</InputLabel>
                                            <Select
                                                label="Filter"
                                                value={channel.filterType}
                                                onChange={(event) => onMixerChange(channel.id, "filterType", event.target.value)}
                                            >
                                                {FILTER_TYPES.map((type) => (
                                                    <MenuItem key={type} value={type}>
                                                        {type}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>

                                        <TinySlider
                                            label="Cutoff"
                                            value={channel.cutoff}
                                            min={40}
                                            max={20000}
                                            step={10}
                                            display={`${Math.round(channel.cutoff)} Hz`}
                                            onChange={(value) => onMixerChange(channel.id, "cutoff", value)}
                                        />

                                        <TinySlider
                                            label="Q"
                                            value={channel.q}
                                            min={0.1}
                                            max={20}
                                            step={0.1}
                                            display={channel.q.toFixed(1)}
                                            onChange={(value) => onMixerChange(channel.id, "q", value)}
                                        />
                                    </Stack>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Stack>
            </CardContent>
        </Card>
    );
}

function HelpPanel() {
    return (
        <Grid container spacing={2}>
            {[
                {
                    icon: <AutoAwesomeRounded />,
                    title: "Better oscillators",
                    text: "Use warmSaw, softSquare, organ, bell, superSaw, unison, spread, pitch drops, filter envelope, and drive for richer generated sounds.",
                },
                {
                    icon: <LibraryMusicRounded />,
                    title: "Archive kit workflow",
                    text: "Search Archive.org from the Archive Kits tab, preview samples, then add a whole kit, a category, or a single pad.",
                },
                {
                    icon: <WavesRounded />,
                    title: "Soundboard control",
                    text: "Every Archive sample becomes a controllable pad with envelope, pitch, filter, mixer route, delay, and reverb controls.",
                },
            ].map((item) => (
                <Grid item xs={12} md={4} key={item.title}>
                    <Card sx={glassCardSx}>
                        <CardContent>
                            <Stack spacing={1}>
                                <Box sx={sectionIconSx}>{item.icon}</Box>
                                <Typography sx={{ fontWeight: 950 }}>{item.title}</Typography>
                                <Typography sx={{ color: "rgba(255,255,255,.62)", lineHeight: 1.7 }}>
                                    {item.text}
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
}

function PanelTitle({ icon, title, description, action }) {
    return (
        <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
        >
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={sectionIconSx}>{icon}</Box>

                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 950 }}>
                        {title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,.58)" }}>
                        {description}
                    </Typography>
                </Box>
            </Stack>

            {action}
        </Stack>
    );
}

function DesignerSection({ title, children, action }) {
    return (
        <Box
            sx={{
                p: 1.5,
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,.1)",
                bgcolor: "rgba(255,255,255,.04)",
                height: "100%",
            }}
        >
            <Stack spacing={1.4}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Typography sx={{ fontWeight: 950 }}>{title}</Typography>
                    {action}
                </Stack>
                {children}
            </Stack>
        </Box>
    );
}

function TinySlider({ label, value, min, max, step, display, onChange }) {
    return (
        <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,.68)", fontWeight: 850 }}>
                    {label}
                </Typography>
                <Typography variant="caption" sx={{ color: "#9ee8ff", fontWeight: 950 }}>
                    {display ?? value}
                </Typography>
            </Stack>

            <Slider
                size="small"
                value={Number(value) || 0}
                min={min}
                max={max}
                step={step}
                onChange={(event, nextValue) => onChange(Array.isArray(nextValue) ? nextValue[0] : nextValue)}
                sx={{
                    color: "#9ee8ff",
                    "& .MuiSlider-thumb": {
                        boxShadow: "0 0 0 8px rgba(158,232,255,.08)",
                    },
                    "& .MuiSlider-rail": {
                        color: "rgba(255,255,255,.22)",
                    },
                }}
            />
        </Box>
    );
}

const glassCardSx = {
    borderRadius: 5,
    border: "1px solid rgba(255,255,255,.1)",
    bgcolor: "rgba(255,255,255,.055)",
    color: "#fff",
    boxShadow: "0 24px 80px rgba(0,0,0,.35)",
    backdropFilter: "blur(20px)",
};

const sectionIconSx = {
    width: 44,
    height: 44,
    borderRadius: 3,
    display: "grid",
    placeItems: "center",
    color: "#06101f",
    bgcolor: "#9ee8ff",
    flexShrink: 0,
};

const primaryPillSx = {
    borderRadius: 999,
    bgcolor: "#9ee8ff",
    color: "#06101f",
    fontWeight: 950,
    "&:hover": {
        bgcolor: "#7edfff",
    },
};

const outlinePillSx = {
    borderRadius: 999,
    color: "rgba(255,255,255,.84)",
    borderColor: "rgba(255,255,255,.18)",
    fontWeight: 850,
    "&:hover": {
        borderColor: "rgba(158,232,255,.5)",
        bgcolor: "rgba(158,232,255,.08)",
    },
};

const iconButtonSx = {
    color: "#fff",
    bgcolor: "rgba(255,255,255,.08)",
    border: "1px solid rgba(255,255,255,.08)",
    "&:hover": {
        bgcolor: "rgba(255,255,255,.14)",
    },
};

const darkTextFieldSx = {
    "& .MuiInputLabel-root": {
        color: "rgba(255,255,255,.58)",
    },
    "& .MuiOutlinedInput-root": {
        color: "#fff",
        borderRadius: 3,
        bgcolor: "rgba(255,255,255,.055)",
        "& fieldset": {
            borderColor: "rgba(255,255,255,.14)",
        },
        "&:hover fieldset": {
            borderColor: "rgba(158,232,255,.35)",
        },
        "&.Mui-focused fieldset": {
            borderColor: "#9ee8ff",
        },
    },
};

const darkSelectSx = {
    "& .MuiInputLabel-root": {
        color: "rgba(255,255,255,.58)",
    },
    "& .MuiOutlinedInput-root": {
        color: "#fff",
        borderRadius: 3,
        bgcolor: "rgba(255,255,255,.055)",
        "& fieldset": {
            borderColor: "rgba(255,255,255,.14)",
        },
        "&:hover fieldset": {
            borderColor: "rgba(158,232,255,.35)",
        },
        "&.Mui-focused fieldset": {
            borderColor: "#9ee8ff",
        },
    },
    "& .MuiSvgIcon-root": {
        color: "#fff",
    },
};
