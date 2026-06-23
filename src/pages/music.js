import React from "react";
import {
    Box,
    Chip,
    Container,
    Grid,
    Paper,
    Stack,
    Tab,
    Tabs,
    Typography,
} from "@mui/material";
import {
    BlurOnRounded,
    GraphicEqRounded,
    GridOnRounded,
    LibraryMusicRounded,
    TuneRounded,
} from "@mui/icons-material";
import {
    AppNavBar,
    BackHomeButton,
    GradientPage,
    NOTE_OPTIONS,
    PatternMixer,
    PlaylistMixer,
    SectionHeader,
    SoundDesigner,
    StatusCard,
    StudioTransport,
    TrackMixer,
    secondsToBars,
} from "../components/components";

const createId = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const PATTERN_STEPS = 32;
const STEPS_PER_BAR = 16;
const STEPS_PER_BEAT = 4;
const BEATS_PER_BAR = 4;
const PLAYLIST_BARS = 16;

const note = (label) => NOTE_OPTIONS.find((item) => item.label === label)?.value || 261.63;

const initialMixerChannels = [
    {
        id: "master",
        name: "Master",
        volume: 0.95,
        pan: 0,
        muted: false,
        solo: false,
        filterType: "allpass",
        cutoff: 18000,
        q: 0.8,
        fxWet: 0,
    },
    {
        id: "mix-drums",
        name: "Drums",
        volume: 0.9,
        pan: 0,
        muted: false,
        solo: false,
        filterType: "lowpass",
        cutoff: 12000,
        q: 0.8,
        fxWet: 0.04,
    },
    {
        id: "mix-bass",
        name: "Bass",
        volume: 0.82,
        pan: 0,
        muted: false,
        solo: false,
        filterType: "lowpass",
        cutoff: 5200,
        q: 1.1,
        fxWet: 0.02,
    },
    {
        id: "mix-lead",
        name: "Lead / Pads",
        volume: 0.76,
        pan: 0.08,
        muted: false,
        solo: false,
        filterType: "lowpass",
        cutoff: 9000,
        q: 0.9,
        fxWet: 0.14,
    },
    {
        id: "mix-audio-1",
        name: "Audio 1",
        volume: 0.88,
        pan: 0,
        muted: false,
        solo: false,
        filterType: "allpass",
        cutoff: 18000,
        q: 0.7,
        fxWet: 0,
    },
];

const initialSounds = [
    {
        id: "sound-kick",
        name: "Sub Kick",
        type: "drum",
        mixerChannelId: "mix-drums",
        masterGain: 0.92,
        noiseLevel: 0.02,
        rootFrequency: note("C1"),
        envelope: {
            attack: 0.001,
            decay: 0.12,
            sustain: 0.22,
            release: 0.12,
        },
        filter: {
            type: "lowpass",
            cutoff: 1600,
            q: 0.9,
        },
        fx: {
            delayTime: 0,
            delayFeedback: 0,
            delayMix: 0,
            reverbMix: 0.02,
        },
        layers: [
            {
                id: "layer-kick-1",
                waveform: "sine",
                octave: -1,
                detune: 0,
                gain: 1,
            },
        ],
    },
    {
        id: "sound-snare",
        name: "Noise Snare",
        type: "drum",
        mixerChannelId: "mix-drums",
        masterGain: 0.78,
        noiseLevel: 0.65,
        rootFrequency: note("G3"),
        envelope: {
            attack: 0.001,
            decay: 0.08,
            sustain: 0.14,
            release: 0.1,
        },
        filter: {
            type: "bandpass",
            cutoff: 2600,
            q: 1.6,
        },
        fx: {
            delayTime: 0.08,
            delayFeedback: 0.12,
            delayMix: 0.05,
            reverbMix: 0.08,
        },
        layers: [
            {
                id: "layer-snare-1",
                waveform: "triangle",
                octave: 0,
                detune: -30,
                gain: 0.28,
            },
        ],
    },
    {
        id: "sound-bass",
        name: "Saw Bass",
        type: "bass",
        mixerChannelId: "mix-bass",
        masterGain: 0.72,
        noiseLevel: 0,
        rootFrequency: note("C2"),
        envelope: {
            attack: 0.01,
            decay: 0.18,
            sustain: 0.62,
            release: 0.18,
        },
        filter: {
            type: "lowpass",
            cutoff: 3200,
            q: 1.4,
        },
        fx: {
            delayTime: 0,
            delayFeedback: 0,
            delayMix: 0,
            reverbMix: 0.02,
        },
        layers: [
            {
                id: "layer-bass-1",
                waveform: "sawtooth",
                octave: -1,
                detune: 0,
                gain: 0.85,
            },
            {
                id: "layer-bass-2",
                waveform: "square",
                octave: -1,
                detune: -7,
                gain: 0.24,
            },
        ],
    },
    {
        id: "sound-lead",
        name: "Glass Lead",
        type: "synth",
        mixerChannelId: "mix-lead",
        masterGain: 0.64,
        noiseLevel: 0.01,
        rootFrequency: note("G4"),
        envelope: {
            attack: 0.02,
            decay: 0.18,
            sustain: 0.72,
            release: 0.32,
        },
        filter: {
            type: "lowpass",
            cutoff: 8200,
            q: 0.8,
        },
        fx: {
            delayTime: 0.24,
            delayFeedback: 0.28,
            delayMix: 0.24,
            reverbMix: 0.2,
        },
        layers: [
            {
                id: "layer-lead-1",
                waveform: "triangle",
                octave: 0,
                detune: 0,
                gain: 0.72,
            },
            {
                id: "layer-lead-2",
                waveform: "sine",
                octave: 1,
                detune: 9,
                gain: 0.22,
            },
        ],
    },
    {
        id: "sound-pad",
        name: "Dream Soundscape",
        type: "soundscape",
        mixerChannelId: "mix-lead",
        masterGain: 0.52,
        noiseLevel: 0.06,
        rootFrequency: note("C4"),
        envelope: {
            attack: 1.2,
            decay: 0.8,
            sustain: 0.7,
            release: 2.8,
        },
        filter: {
            type: "lowpass",
            cutoff: 6500,
            q: 0.55,
        },
        fx: {
            delayTime: 0.38,
            delayFeedback: 0.36,
            delayMix: 0.18,
            reverbMix: 0.54,
        },
        layers: [
            {
                id: "layer-pad-1",
                waveform: "sawtooth",
                octave: 0,
                detune: -9,
                gain: 0.32,
            },
            {
                id: "layer-pad-2",
                waveform: "triangle",
                octave: 0,
                detune: 11,
                gain: 0.34,
            },
            {
                id: "layer-pad-3",
                waveform: "sine",
                octave: 1,
                detune: 3,
                gain: 0.18,
            },
        ],
    },
];

const initialPlaylistLanes = [
    {
        id: "lane-patterns",
        name: "Pattern Clips",
        mixerChannelId: "mix-lead",
    },
    {
        id: "lane-audio",
        name: "Audio Clips",
        mixerChannelId: "mix-audio-1",
    },
    {
        id: "lane-soundscapes",
        name: "Soundscapes",
        mixerChannelId: "mix-lead",
    },
];

function createInitialPattern() {
    return {
        id: "pattern-1",
        name: "Pattern 1",
        notes: [],
    };
}

export default function Music() {
    const audioContextRef = React.useRef(null);
    const patternTimerRef = React.useRef(null);
    const patternStepRef = React.useRef(0);
    const activeSourcesRef = React.useRef([]);
    const soundAuditionSourcesRef = React.useRef([]);
    const soundAuditionTimerRef = React.useRef(null);
    const playlistStopTimerRef = React.useRef(null);
    const reverbCacheRef = React.useRef(new WeakMap());

    const [bpm, setBpm] = React.useState(128);
    const [sounds, setSounds] = React.useState(initialSounds);
    const [selectedSoundId, setSelectedSoundId] = React.useState("sound-lead");
    const [selectedPianoSoundId, setSelectedPianoSoundId] = React.useState("sound-lead");
    const [selectedPianoNoteId, setSelectedPianoNoteId] = React.useState(null);
    const [noteLengthSteps, setNoteLengthSteps] = React.useState(4);
    const [activeSoundId, setActiveSoundId] = React.useState(null);
    const [soundPlaying, setSoundPlaying] = React.useState(false);
    const [pattern, setPattern] = React.useState(createInitialPattern);
    const [mixerChannels, setMixerChannels] = React.useState(initialMixerChannels);
    const [playlistLanes, setPlaylistLanes] = React.useState(initialPlaylistLanes);
    const [clips, setClips] = React.useState([]);
    const [selectedMixerChannelId, setSelectedMixerChannelId] = React.useState("mix-lead");
    const [selectedLaneId, setSelectedLaneId] = React.useState("lane-patterns");
    const [selectedClipId, setSelectedClipId] = React.useState(null);
    const [clipboardClip, setClipboardClip] = React.useState(null);
    const [patternPlaying, setPatternPlaying] = React.useState(false);
    const [playlistPlaying, setPlaylistPlaying] = React.useState(false);
    const [currentPatternStep, setCurrentPatternStep] = React.useState(null);
    const [activePanel, setActivePanel] = React.useState("pattern");
    const [status, setStatus] = React.useState(
        "Ready. Draw C0-C9 piano-roll notes, choose note length, play the pattern, rasterize it, and arrange it."
    );

    const selectedLane = React.useMemo(
        () => playlistLanes.find((lane) => lane.id === selectedLaneId),
        [playlistLanes, selectedLaneId]
    );

    const selectedClip = React.useMemo(
        () => clips.find((clip) => clip.id === selectedClipId),
        [clips, selectedClipId]
    );

    const selectedSound = React.useMemo(
        () => sounds.find((sound) => sound.id === selectedSoundId),
        [sounds, selectedSoundId]
    );

    const secondsPerBar = React.useMemo(() => BEATS_PER_BAR * (60 / bpm), [bpm]);
    const stepSeconds = React.useMemo(() => 60 / bpm / STEPS_PER_BEAT, [bpm]);

    const selectedSoundDurationSeconds = React.useMemo(() => {
        if (!selectedSound) return 0;
        return estimateSoundDurationSeconds(selectedSound);
    }, [selectedSound]);

    const mixerSoloActive = React.useMemo(
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

    const registerSoundAuditionSource = React.useCallback((source) => {
        soundAuditionSourcesRef.current.push(source);

        source.onended = () => {
            soundAuditionSourcesRef.current = soundAuditionSourcesRef.current.filter(
                (item) => item !== source
            );
        };
    }, []);

    const stopSourceList = React.useCallback((listRef) => {
        listRef.current.forEach((source) => {
            try {
                source.stop();
            } catch {
                // Already stopped.
            }
        });

        listRef.current = [];
    }, []);

    const stopActiveSources = React.useCallback(() => {
        stopSourceList(activeSourcesRef);
    }, [stopSourceList]);

    const stopSoundAudition = React.useCallback(() => {
        if (soundAuditionTimerRef.current) {
            window.clearTimeout(soundAuditionTimerRef.current);
            soundAuditionTimerRef.current = null;
        }

        stopSourceList(soundAuditionSourcesRef);
        setSoundPlaying(false);
        setActiveSoundId(null);
    }, [stopSourceList]);

    const stopPattern = React.useCallback(() => {
        if (patternTimerRef.current) {
            window.clearInterval(patternTimerRef.current);
            patternTimerRef.current = null;
        }

        patternStepRef.current = 0;
        setCurrentPatternStep(null);
        setPatternPlaying(false);
    }, []);

    const stopPlaylist = React.useCallback(() => {
        if (playlistStopTimerRef.current) {
            window.clearTimeout(playlistStopTimerRef.current);
            playlistStopTimerRef.current = null;
        }

        stopActiveSources();
        setPlaylistPlaying(false);
    }, [stopActiveSources]);

    const createNoiseBuffer = React.useCallback((context, duration = 1) => {
        const sampleRate = context.sampleRate;
        const length = Math.max(1, Math.floor(sampleRate * duration));
        const buffer = context.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i += 1) {
            data[i] = Math.random() * 2 - 1;
        }

        return buffer;
    }, []);

    const createImpulseResponse = React.useCallback((context) => {
        const cached = reverbCacheRef.current.get(context);

        if (cached) return cached;

        const seconds = 2.2;
        const decay = 2.3;
        const sampleRate = context.sampleRate;
        const length = sampleRate * seconds;
        const impulse = context.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel += 1) {
            const data = impulse.getChannelData(channel);

            for (let i = 0; i < length; i += 1) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
            }
        }

        reverbCacheRef.current.set(context, impulse);
        return impulse;
    }, []);

    const createMasterInput = React.useCallback(
        (context, destination) => {
            const master =
                mixerChannels.find((channel) => channel.id === "master") ||
                initialMixerChannels[0];

            const filter = context.createBiquadFilter();
            filter.type = master.filterType || "allpass";
            filter.frequency.value = master.cutoff || 18000;
            filter.Q.value = master.q || 0.7;

            const gain = context.createGain();
            gain.gain.value = master.muted ? 0 : master.volume;

            filter.connect(gain);

            if (context.createStereoPanner) {
                const panner = context.createStereoPanner();
                panner.pan.value = master.pan || 0;
                gain.connect(panner);
                panner.connect(destination);
            } else {
                gain.connect(destination);
            }

            return filter;
        },
        [mixerChannels]
    );

    const createMixerInput = React.useCallback(
        (context, mixerChannelId, destination) => {
            const masterInput = createMasterInput(context, destination);

            if (mixerChannelId === "master") {
                return masterInput;
            }

            const channel =
                mixerChannels.find((item) => item.id === mixerChannelId) ||
                mixerChannels.find((item) => item.id === "mix-audio-1") ||
                mixerChannels[0];

            const filter = context.createBiquadFilter();
            filter.type = channel.filterType || "allpass";
            filter.frequency.value = channel.cutoff || 18000;
            filter.Q.value = channel.q || 0.7;

            const gain = context.createGain();
            const forcedMute =
                channel.muted || (mixerSoloActive && channel.id !== "master" && !channel.solo);

            gain.gain.value = forcedMute ? 0 : channel.volume;

            filter.connect(gain);

            if (context.createStereoPanner) {
                const panner = context.createStereoPanner();
                panner.pan.value = channel.pan || 0;
                gain.connect(panner);
                panner.connect(masterInput);
            } else {
                gain.connect(masterInput);
            }

            return filter;
        },
        [createMasterInput, mixerChannels, mixerSoloActive]
    );

    const playDesignedSound = React.useCallback(
        (
            context,
            sound,
            frequency,
            when,
            destination,
            registerFn = registerSource,
            forcedHoldSeconds = null
        ) => {
            if (!sound) return 0;

            const envelope = sound.envelope;
            const fx = sound.fx;
            const filterSettings = sound.filter;
            const hold = forcedHoldSeconds ?? getSoundHoldSeconds(sound);
            const totalDuration = estimateSoundDurationSeconds(sound, hold);

            const voiceBus = context.createGain();
            const filter = context.createBiquadFilter();

            filter.type = filterSettings.type || "lowpass";
            filter.frequency.setValueAtTime(filterSettings.cutoff || 8000, when);
            filter.Q.value = filterSettings.q || 0.8;

            const amp = context.createGain();

            amp.gain.setValueAtTime(0.0001, when);
            amp.gain.exponentialRampToValueAtTime(
                Math.max(sound.masterGain, 0.0001),
                when + Math.max(envelope.attack, 0.001)
            );
            amp.gain.exponentialRampToValueAtTime(
                Math.max(sound.masterGain * envelope.sustain, 0.0001),
                when + envelope.attack + Math.max(envelope.decay, 0.001)
            );
            amp.gain.setValueAtTime(
                Math.max(sound.masterGain * envelope.sustain, 0.0001),
                when + envelope.attack + envelope.decay + hold
            );
            amp.gain.exponentialRampToValueAtTime(
                0.0001,
                when + envelope.attack + envelope.decay + hold + envelope.release
            );

            voiceBus.connect(filter);
            filter.connect(amp);
            amp.connect(destination);

            if (fx.delayMix > 0.001 && fx.delayTime > 0.001) {
                const delay = context.createDelay(2);
                const feedback = context.createGain();
                const delayWet = context.createGain();

                delay.delayTime.value = fx.delayTime;
                feedback.gain.value = fx.delayFeedback;
                delayWet.gain.value = fx.delayMix;

                amp.connect(delay);
                delay.connect(feedback);
                feedback.connect(delay);
                delay.connect(delayWet);
                delayWet.connect(destination);
            }

            if (fx.reverbMix > 0.001) {
                const convolver = context.createConvolver();
                const reverbWet = context.createGain();

                convolver.buffer = createImpulseResponse(context);
                reverbWet.gain.value = fx.reverbMix;

                amp.connect(convolver);
                convolver.connect(reverbWet);
                reverbWet.connect(destination);
            }

            sound.layers.forEach((layer) => {
                const oscillator = context.createOscillator();
                const layerGain = context.createGain();

                oscillator.type = layer.waveform;
                oscillator.frequency.value = frequency * Math.pow(2, layer.octave || 0);
                oscillator.detune.value = layer.detune || 0;
                layerGain.gain.value = layer.gain || 0;

                oscillator.connect(layerGain);
                layerGain.connect(voiceBus);

                oscillator.start(when);
                oscillator.stop(when + totalDuration);

                registerFn(oscillator);
            });

            if (sound.noiseLevel > 0.001) {
                const noise = context.createBufferSource();
                const noiseGain = context.createGain();
                const noiseFilter = context.createBiquadFilter();

                noise.buffer = createNoiseBuffer(context, totalDuration);
                noise.loop = false;

                noiseGain.gain.value = sound.noiseLevel;
                noiseFilter.type = sound.type === "drum" ? "bandpass" : "lowpass";
                noiseFilter.frequency.value =
                    sound.type === "drum" ? filterSettings.cutoff || 2500 : 6500;
                noiseFilter.Q.value = sound.type === "drum" ? 1.6 : 0.7;

                noise.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(voiceBus);

                noise.start(when);
                noise.stop(when + totalDuration);

                registerFn(noise);
            }

            return totalDuration;
        },
        [createImpulseResponse, createNoiseBuffer, registerSource]
    );

    const playSoundAudition = React.useCallback(
        async (sound) => {
            if (!sound) return;

            stopSoundAudition();

            const context = await getAudioContext();
            const output = createMixerInput(context, sound.mixerChannelId, context.destination);
            const duration = playDesignedSound(
                context,
                sound,
                sound.rootFrequency || note("C4"),
                context.currentTime + 0.02,
                output,
                registerSoundAuditionSource
            );

            setSoundPlaying(true);
            setActiveSoundId(sound.id);
            setActivePanel("sound");
            setStatus(
                `Playing sound: ${sound.name}. Estimated length ${duration.toFixed(2)}s / ${secondsToBars(
                    duration,
                    secondsPerBar
                ).toFixed(2)} bars.`
            );

            soundAuditionTimerRef.current = window.setTimeout(() => {
                setSoundPlaying(false);
                setActiveSoundId(null);
                soundAuditionTimerRef.current = null;
            }, Math.max(250, duration * 1000 + 100));
        },
        [
            createMixerInput,
            getAudioContext,
            playDesignedSound,
            registerSoundAuditionSource,
            secondsPerBar,
            stopSoundAudition,
        ]
    );

    const pauseSoundAudition = React.useCallback(
        (sound) => {
            stopSoundAudition();
            setStatus(`Paused sound: ${sound?.name || "selected sound"}.`);
        },
        [stopSoundAudition]
    );

    const playPatternStep = React.useCallback(
        (context, stepIndex, destination = context.destination) => {
            const when = context.currentTime + 0.01;

            pattern.notes
                .filter((pianoNote) => pianoNote.startStep === stepIndex)
                .forEach((pianoNote) => {
                    const sound = sounds.find((item) => item.id === pianoNote.soundId);
                    if (!sound) return;

                    const output = createMixerInput(context, sound.mixerChannelId, destination);
                    const forcedHoldSeconds = Math.max(stepSeconds, pianoNote.lengthSteps * stepSeconds);

                    playDesignedSound(
                        context,
                        sound,
                        pianoNote.note || sound.rootFrequency || note("C4"),
                        when,
                        output,
                        registerSource,
                        forcedHoldSeconds
                    );
                });
        },
        [createMixerInput, pattern.notes, playDesignedSound, registerSource, sounds, stepSeconds]
    );

    const schedulePatternNotesOffline = React.useCallback(
        (context, destination) => {
            pattern.notes.forEach((pianoNote) => {
                const sound = sounds.find((item) => item.id === pianoNote.soundId);
                if (!sound) return;

                const when = pianoNote.startStep * stepSeconds;
                const forcedHoldSeconds = Math.max(stepSeconds, pianoNote.lengthSteps * stepSeconds);

                playDesignedSound(
                    context,
                    sound,
                    pianoNote.note || sound.rootFrequency || note("C4"),
                    when,
                    destination,
                    () => {},
                    forcedHoldSeconds
                );
            });
        },
        [pattern.notes, playDesignedSound, sounds, stepSeconds]
    );

    const playPattern = React.useCallback(async () => {
        const context = await getAudioContext();

        stopPattern();
        patternStepRef.current = 0;
        setPatternPlaying(true);
        setActivePanel("pattern");
        setStatus("Piano-roll pattern playing with note lengths.");

        const tick = () => {
            const stepIndex = patternStepRef.current;
            setCurrentPatternStep(stepIndex);
            playPatternStep(context, stepIndex, context.destination);
            patternStepRef.current = (stepIndex + 1) % PATTERN_STEPS;
        };

        tick();
        patternTimerRef.current = window.setInterval(tick, stepSeconds * 1000);
    }, [getAudioContext, playPatternStep, stepSeconds, stopPattern]);

    const pausePattern = React.useCallback(() => {
        if (patternTimerRef.current) {
            window.clearInterval(patternTimerRef.current);
            patternTimerRef.current = null;
        }

        setPatternPlaying(false);
        setStatus("Pattern paused.");
    }, []);

    const addPianoNote = React.useCallback(
        ({ soundId, note, startStep, lengthSteps }) => {
            if (!soundId) return;

            const safeStart = Math.max(0, Math.min(PATTERN_STEPS - 1, startStep));
            const safeLength = Math.max(1, Math.min(PATTERN_STEPS - safeStart, lengthSteps));

            setPattern((current) => {
                const existing = current.notes.find(
                    (item) =>
                        item.soundId === soundId &&
                        item.startStep === safeStart &&
                        Math.abs(item.note - note) < 0.001
                );

                if (existing) {
                    setSelectedPianoNoteId(null);

                    return {
                        ...current,
                        notes: current.notes.filter((item) => item.id !== existing.id),
                    };
                }

                const newNote = {
                    id: createId(),
                    soundId,
                    note,
                    startStep: safeStart,
                    lengthSteps: safeLength,
                };

                setSelectedPianoNoteId(newNote.id);

                return {
                    ...current,
                    notes: [...current.notes, newNote],
                };
            });
        },
        []
    );

    const deletePianoNote = React.useCallback((noteId) => {
        if (!noteId) return;

        setPattern((current) => ({
            ...current,
            notes: current.notes.filter((item) => item.id !== noteId),
        }));

        setSelectedPianoNoteId(null);
    }, []);

    const resizeSelectedNote = React.useCallback(
        (delta) => {
            if (!selectedPianoNoteId) return;

            setPattern((current) => ({
                ...current,
                notes: current.notes.map((item) => {
                    if (item.id !== selectedPianoNoteId) return item;

                    const maxLength = PATTERN_STEPS - item.startStep;

                    return {
                        ...item,
                        lengthSteps: Math.max(1, Math.min(maxLength, item.lengthSteps + delta)),
                    };
                }),
            }));
        },
        [selectedPianoNoteId]
    );

    const moveSelectedNote = React.useCallback(
        (delta) => {
            if (!selectedPianoNoteId) return;

            setPattern((current) => ({
                ...current,
                notes: current.notes.map((item) => {
                    if (item.id !== selectedPianoNoteId) return item;

                    return {
                        ...item,
                        startStep: Math.max(
                            0,
                            Math.min(PATTERN_STEPS - item.lengthSteps, item.startStep + delta)
                        ),
                    };
                }),
            }));
        },
        [selectedPianoNoteId]
    );

    const clearPattern = React.useCallback(() => {
        stopPattern();

        setPattern({
            id: "pattern-1",
            name: "Pattern 1",
            notes: [],
        });

        setSelectedPianoNoteId(null);
        setStatus("Piano roll cleared.");
    }, [stopPattern]);

    const createSound = React.useCallback(() => {
        const newSound = {
            id: createId(),
            name: `New Sound ${sounds.length + 1}`,
            type: "synth",
            mixerChannelId: "mix-lead",
            masterGain: 0.65,
            noiseLevel: 0,
            rootFrequency: note("C4"),
            envelope: {
                attack: 0.02,
                decay: 0.18,
                sustain: 0.68,
                release: 0.35,
            },
            filter: {
                type: "lowpass",
                cutoff: 7800,
                q: 0.8,
            },
            fx: {
                delayTime: 0.18,
                delayFeedback: 0.22,
                delayMix: 0.12,
                reverbMix: 0.16,
            },
            layers: [
                {
                    id: createId(),
                    waveform: "sawtooth",
                    octave: 0,
                    detune: 0,
                    gain: 0.72,
                },
            ],
        };

        setSounds((current) => [...current, newSound]);
        setSelectedSoundId(newSound.id);
        setSelectedPianoSoundId(newSound.id);
        setActivePanel("sound");
        setStatus(`Created sound: ${newSound.name}.`);
    }, [sounds.length]);

    const deleteSound = React.useCallback(
        (soundId) => {
            if (!soundId || sounds.length <= 1) return;

            const target = sounds.find((sound) => sound.id === soundId);

            if (activeSoundId === soundId) {
                stopSoundAudition();
            }

            setSounds((current) => current.filter((sound) => sound.id !== soundId));

            setPattern((current) => ({
                ...current,
                notes: current.notes.filter((pianoNote) => pianoNote.soundId !== soundId),
            }));

            setSelectedSoundId((current) => {
                if (current !== soundId) return current;
                const nextSound = sounds.find((sound) => sound.id !== soundId);
                return nextSound?.id || null;
            });

            setSelectedPianoSoundId((current) => {
                if (current !== soundId) return current;
                const nextSound = sounds.find((sound) => sound.id !== soundId);
                return nextSound?.id || null;
            });

            setStatus(`Deleted sound and removed its piano-roll notes: ${target?.name || "sound"}.`);
        },
        [activeSoundId, sounds, stopSoundAudition]
    );

    const duplicateSound = React.useCallback(
        (soundId) => {
            const target = sounds.find((sound) => sound.id === soundId);
            if (!target) return;

            const duplicated = {
                ...structuredCloneSafe(target),
                id: createId(),
                name: `${target.name} Copy`,
                layers: target.layers.map((layer) => ({
                    ...layer,
                    id: createId(),
                })),
            };

            setSounds((current) => [...current, duplicated]);
            setSelectedSoundId(duplicated.id);
            setSelectedPianoSoundId(duplicated.id);
            setActivePanel("sound");
            setStatus(`Duplicated sound: ${target.name}.`);
        },
        [sounds]
    );

    const updateSound = React.useCallback((soundId, field, value) => {
        setSounds((current) =>
            current.map((sound) =>
                sound.id === soundId
                    ? {
                        ...sound,
                        [field]: value,
                    }
                    : sound
            )
        );
    }, []);

    const updateEnvelope = React.useCallback((soundId, field, value) => {
        setSounds((current) =>
            current.map((sound) =>
                sound.id === soundId
                    ? {
                        ...sound,
                        envelope: {
                            ...sound.envelope,
                            [field]: value,
                        },
                    }
                    : sound
            )
        );
    }, []);

    const updateFilter = React.useCallback((soundId, field, value) => {
        setSounds((current) =>
            current.map((sound) =>
                sound.id === soundId
                    ? {
                        ...sound,
                        filter: {
                            ...sound.filter,
                            [field]: value,
                        },
                    }
                    : sound
            )
        );
    }, []);

    const updateFx = React.useCallback((soundId, field, value) => {
        setSounds((current) =>
            current.map((sound) =>
                sound.id === soundId
                    ? {
                        ...sound,
                        fx: {
                            ...sound.fx,
                            [field]: value,
                        },
                    }
                    : sound
            )
        );
    }, []);

    const updateLayer = React.useCallback((soundId, layerId, field, value) => {
        setSounds((current) =>
            current.map((sound) =>
                sound.id === soundId
                    ? {
                        ...sound,
                        layers: sound.layers.map((layer) =>
                            layer.id === layerId
                                ? {
                                    ...layer,
                                    [field]: value,
                                }
                                : layer
                        ),
                    }
                    : sound
            )
        );
    }, []);

    const addLayer = React.useCallback((soundId) => {
        setSounds((current) =>
            current.map((sound) =>
                sound.id === soundId
                    ? {
                        ...sound,
                        layers: [
                            ...sound.layers,
                            {
                                id: createId(),
                                waveform: "sine",
                                octave: 0,
                                detune: 0,
                                gain: 0.22,
                            },
                        ],
                    }
                    : sound
            )
        );
    }, []);

    const deleteLayer = React.useCallback((soundId, layerId) => {
        setSounds((current) =>
            current.map((sound) => {
                if (sound.id !== soundId || sound.layers.length <= 1) return sound;

                return {
                    ...sound,
                    layers: sound.layers.filter((layer) => layer.id !== layerId),
                };
            })
        );
    }, []);

    const updateMixerChannel = React.useCallback((channelId, field, value) => {
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

    const addMixerChannel = React.useCallback(() => {
        const nextNumber = mixerChannels.filter((channel) => channel.id !== "master").length + 1;
        const newChannel = {
            id: createId(),
            name: `Insert ${nextNumber}`,
            volume: 0.85,
            pan: 0,
            muted: false,
            solo: false,
            filterType: "allpass",
            cutoff: 18000,
            q: 0.7,
            fxWet: 0,
        };

        setMixerChannels((current) => [...current, newChannel]);
        setSelectedMixerChannelId(newChannel.id);
        setActivePanel("mixer");
        setStatus(`Added mixer track: ${newChannel.name}.`);
    }, [mixerChannels]);

    const addPlaylistLane = React.useCallback(() => {
        const nextNumber = playlistLanes.length + 1;
        const newLane = {
            id: createId(),
            name: `Playlist Track ${nextNumber}`,
            mixerChannelId: "mix-audio-1",
        };

        setPlaylistLanes((current) => [...current, newLane]);
        setSelectedLaneId(newLane.id);
        setActivePanel("playlist");
        setStatus(`Added playlist track: ${newLane.name}.`);
    }, [playlistLanes.length]);

    const updatePlaylistLane = React.useCallback((laneId, field, value) => {
        setPlaylistLanes((current) =>
            current.map((lane) =>
                lane.id === laneId
                    ? {
                        ...lane,
                        [field]: value,
                    }
                    : lane
            )
        );

        if (field === "mixerChannelId") {
            setClips((current) =>
                current.map((clip) =>
                    clip.laneId === laneId
                        ? {
                            ...clip,
                            mixerChannelId: value,
                        }
                        : clip
                )
            );
        }
    }, []);

    const renderPatternToBuffer = React.useCallback(async () => {
        const sampleRate = 44100;
        const maxSoundTailSeconds = Math.max(...sounds.map(estimateSoundDurationSeconds), 1);
        const patternSeconds = PATTERN_STEPS * stepSeconds + maxSoundTailSeconds;
        const frameCount = Math.ceil(sampleRate * patternSeconds);

        const offline = new OfflineAudioContext(2, frameCount, sampleRate);
        const masterGain = offline.createGain();
        masterGain.gain.value = 0.9;
        masterGain.connect(offline.destination);

        schedulePatternNotesOffline(offline, masterGain);

        return offline.startRendering();
    }, [schedulePatternNotesOffline, sounds, stepSeconds]);

    const rasterizePatternToPlaylist = React.useCallback(async () => {
        if (!selectedLane) return;

        try {
            stopPattern();

            const renderedBuffer = await renderPatternToBuffer();
            const laneClips = clips.filter((clip) => clip.laneId === selectedLane.id);

            const newClip = {
                id: createId(),
                name: `${pattern.name} Piano Roll Render`,
                laneId: selectedLane.id,
                mixerChannelId: selectedLane.mixerChannelId,
                sourceType: "pattern",
                buffer: renderedBuffer,
                startBar: Math.min(PLAYLIST_BARS - 1, laneClips.length),
                trimStart: 0,
                trimEnd: 0,
            };

            setClips((current) => [...current, newClip]);
            setSelectedClipId(newClip.id);
            setActivePanel("playlist");
            setStatus(
                `Rasterized piano-roll pattern. Length ${renderedBuffer.duration.toFixed(2)}s / ${secondsToBars(
                    renderedBuffer.duration,
                    secondsPerBar
                ).toFixed(2)} bars.`
            );
        } catch (error) {
            console.error(error);
            setStatus("Pattern rasterize failed. Check browser WebAudio support.");
        }
    }, [clips, pattern.name, renderPatternToBuffer, secondsPerBar, selectedLane, stopPattern]);

    const uploadFiles = React.useCallback(
        async (fileList) => {
            if (!fileList || !selectedLane) return;

            try {
                const context = await getAudioContext();
                const files = Array.from(fileList);
                const newClips = [];

                for (const file of files) {
                    const arrayBuffer = await file.arrayBuffer();
                    const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
                    const laneClips = clips.filter((clip) => clip.laneId === selectedLane.id);

                    newClips.push({
                        id: createId(),
                        name: file.name.replace(/\.[^/.]+$/, ""),
                        laneId: selectedLane.id,
                        mixerChannelId: selectedLane.mixerChannelId,
                        sourceType: "audio",
                        buffer: audioBuffer,
                        startBar: Math.min(PLAYLIST_BARS - 1, laneClips.length + newClips.length),
                        trimStart: 0,
                        trimEnd: 0,
                    });
                }

                setClips((current) => [...current, ...newClips]);
                setSelectedClipId(newClips[0]?.id || null);
                setActivePanel("playlist");
                setStatus(`Uploaded ${newClips.length} audio file(s) into ${selectedLane.name}.`);
            } catch (error) {
                console.error(error);
                setStatus("Could not decode that audio file.");
            }
        },
        [clips, getAudioContext, selectedLane]
    );

    const getClipPlayableDuration = React.useCallback((clip) => {
        if (!clip?.buffer) return 0;
        return Math.max(0.05, clip.buffer.duration - clip.trimStart - clip.trimEnd);
    }, []);

    const scheduleClip = React.useCallback(
        (context, clip, when, destination, shouldRegister = true) => {
            if (!clip?.buffer) return 0;

            const source = context.createBufferSource();
            source.buffer = clip.buffer;

            const mixerInput = createMixerInput(context, clip.mixerChannelId, destination);
            source.connect(mixerInput);

            const duration = getClipPlayableDuration(clip);
            source.start(when, clip.trimStart || 0, duration);

            if (shouldRegister) registerSource(source);

            return duration;
        },
        [createMixerInput, getClipPlayableDuration, registerSource]
    );

    const previewClip = React.useCallback(
        async (clip) => {
            const context = await getAudioContext();
            scheduleClip(context, clip, context.currentTime + 0.02, context.destination, true);
            setStatus(`Previewing clip: ${clip.name}.`);
        },
        [getAudioContext, scheduleClip]
    );

    const playPlaylist = React.useCallback(async () => {
        stopPlaylist();

        if (clips.length === 0) {
            setStatus("Playlist has no clips yet. Upload audio or rasterize a pattern first.");
            return;
        }

        const context = await getAudioContext();
        const startAt = context.currentTime + 0.08;
        let longest = 0;

        clips.forEach((clip) => {
            const when = startAt + clip.startBar * secondsPerBar;
            const duration = scheduleClip(context, clip, when, context.destination, true);
            longest = Math.max(longest, clip.startBar * secondsPerBar + duration);
        });

        setPlaylistPlaying(true);
        setActivePanel("playlist");
        setStatus("Playlist Mixer playing through Track Mixer routes.");

        playlistStopTimerRef.current = window.setTimeout(() => {
            setPlaylistPlaying(false);
        }, Math.max(1000, longest * 1000 + 500));
    }, [clips, getAudioContext, scheduleClip, secondsPerBar, stopPlaylist]);

    const moveClip = React.useCallback((clipId, barDelta) => {
        setClips((current) =>
            current.map((clip) =>
                clip.id === clipId
                    ? {
                        ...clip,
                        startBar: Math.max(
                            0,
                            Math.min(PLAYLIST_BARS - 1, Math.round(clip.startBar + barDelta))
                        ),
                    }
                    : clip
            )
        );
    }, []);

    const copyClip = React.useCallback(() => {
        if (!selectedClip) return;

        setClipboardClip({
            ...selectedClip,
            id: null,
        });

        setStatus(`Copied clip: ${selectedClip.name}.`);
    }, [selectedClip]);

    const cutClip = React.useCallback(() => {
        if (!selectedClip) return;

        setClipboardClip({
            ...selectedClip,
            id: null,
        });

        setClips((current) => current.filter((clip) => clip.id !== selectedClip.id));
        setSelectedClipId(null);
        setStatus(`Cut clip: ${selectedClip.name}.`);
    }, [selectedClip]);

    const pasteClip = React.useCallback(() => {
        if (!clipboardClip || !selectedLane) return;

        const pasted = {
            ...clipboardClip,
            id: createId(),
            name: `${clipboardClip.name} Copy`,
            laneId: selectedLane.id,
            mixerChannelId: selectedLane.mixerChannelId,
            startBar: Math.min(PLAYLIST_BARS - 1, Math.round((clipboardClip.startBar || 0) + 1)),
        };

        setClips((current) => [...current, pasted]);
        setSelectedClipId(pasted.id);
        setStatus(`Pasted clip into ${selectedLane.name}.`);
    }, [clipboardClip, selectedLane]);

    const duplicateClip = React.useCallback(() => {
        if (!selectedClip) return;

        const duplicated = {
            ...selectedClip,
            id: createId(),
            name: `${selectedClip.name} Duplicate`,
            startBar: Math.min(PLAYLIST_BARS - 1, Math.round(selectedClip.startBar + 1)),
        };

        setClips((current) => [...current, duplicated]);
        setSelectedClipId(duplicated.id);
        setStatus(`Duplicated clip: ${selectedClip.name}.`);
    }, [selectedClip]);

    const deleteClip = React.useCallback(() => {
        if (!selectedClip) return;

        setClips((current) => current.filter((clip) => clip.id !== selectedClip.id));
        setSelectedClipId(null);
        setStatus(`Deleted clip: ${selectedClip.name}.`);
    }, [selectedClip]);

    const trimClipStart = React.useCallback(
        (amount) => {
            if (!selectedClip) return;

            setClips((current) =>
                current.map((clip) => {
                    if (clip.id !== selectedClip.id) return clip;

                    const nextTrimStart = Math.max(0, clip.trimStart + amount);
                    const maxTrim = Math.max(0, clip.buffer.duration - clip.trimEnd - 0.1);

                    return {
                        ...clip,
                        trimStart: Math.min(nextTrimStart, maxTrim),
                    };
                })
            );

            setStatus("Adjusted selected clip start trim.");
        },
        [selectedClip]
    );

    const trimClipEnd = React.useCallback(
        (amount) => {
            if (!selectedClip) return;

            setClips((current) =>
                current.map((clip) => {
                    if (clip.id !== selectedClip.id) return clip;

                    const nextTrimEnd = Math.max(0, clip.trimEnd + amount);
                    const maxTrim = Math.max(0, clip.buffer.duration - clip.trimStart - 0.1);

                    return {
                        ...clip,
                        trimEnd: Math.min(nextTrimEnd, maxTrim),
                    };
                })
            );

            setStatus("Adjusted selected clip end trim.");
        },
        [selectedClip]
    );

    const duplicateLane = React.useCallback(
        (laneId) => {
            const sourceLane = playlistLanes.find((lane) => lane.id === laneId);
            if (!sourceLane) return;

            const newLaneId = createId();

            const duplicatedLane = {
                ...sourceLane,
                id: newLaneId,
                name: `${sourceLane.name} Copy`,
            };

            const duplicatedClips = clips
                .filter((clip) => clip.laneId === laneId)
                .map((clip) => ({
                    ...clip,
                    id: createId(),
                    laneId: newLaneId,
                    name: `${clip.name} Copy`,
                }));

            setPlaylistLanes((current) => [...current, duplicatedLane]);
            setClips((current) => [...current, ...duplicatedClips]);
            setSelectedLaneId(newLaneId);
            setActivePanel("playlist");
            setStatus(`Copied playlist track: ${sourceLane.name}.`);
        },
        [clips, playlistLanes]
    );

    const renderPlaylistBuffer = React.useCallback(async () => {
        if (clips.length === 0) {
            throw new Error("Nothing to render. Add clips to the playlist first.");
        }

        const sampleRate = 44100;

        const endTime = clips.reduce((max, clip) => {
            const duration = getClipPlayableDuration(clip);
            return Math.max(max, clip.startBar * secondsPerBar + duration);
        }, 1);

        const offline = new OfflineAudioContext(
            2,
            Math.ceil((endTime + 0.5) * sampleRate),
            sampleRate
        );

        clips.forEach((clip) => {
            scheduleClip(
                offline,
                clip,
                clip.startBar * secondsPerBar,
                offline.destination,
                false
            );
        });

        return offline.startRendering();
    }, [clips, getClipPlayableDuration, scheduleClip, secondsPerBar]);

    const exportWav = React.useCallback(async () => {
        try {
            const rendered = await renderPlaylistBuffer();
            const wavArrayBuffer = audioBufferToWav(rendered);
            downloadBlob(
                new Blob([wavArrayBuffer], { type: "audio/wav" }),
                "audiomaster-pianoroll-render.wav"
            );
            setStatus("Exported Playlist Mixer timeline as WAV.");
        } catch (error) {
            console.error(error);
            setStatus(error.message || "WAV export failed.");
        }
    }, [renderPlaylistBuffer]);

    const exportMp3 = React.useCallback(async () => {
        try {
            const rendered = await renderPlaylistBuffer();
            const mp3Blob = await audioBufferToMp3Blob(rendered);
            downloadBlob(mp3Blob, "audiomaster-pianoroll-render.mp3");
            setStatus("Exported Playlist Mixer timeline as MP3.");
        } catch (error) {
            console.error(error);
            setStatus("MP3 export failed. Make sure lamejs is installed.");
        }
    }, [renderPlaylistBuffer]);

    React.useEffect(() => {
        return () => {
            stopSoundAudition();
            stopPattern();
            stopPlaylist();

            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [stopPattern, stopPlaylist, stopSoundAudition]);

    return (
        <GradientPage>
            <AppNavBar />

            <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
                <BackHomeButton />

                <Grid container spacing={2.5} alignItems="stretch" sx={{ mb: 2.5 }}>
                    <Grid item xs={12} lg={8}>
                        <SectionHeader
                            eyebrow="Audio Studio"
                            title="Piano Roll Pattern Mixer"
                            description="Draw notes from C0 to C9, choose note length, play designed sounds, rasterize piano-roll patterns, and arrange the result in the playlist."
                        />
                    </Grid>

                    <Grid item xs={12} lg={4}>
                        <StatusCard status={status} />
                    </Grid>
                </Grid>

                <Stack spacing={2.5}>
                    <StudioTransport
                        bpm={bpm}
                        onBpmChange={(value) =>
                            setBpm(Math.max(40, Math.min(240, value || 128)))
                        }
                        onExportWav={exportWav}
                        onExportMp3={exportMp3}
                    />

                    <StudioStatsBar
                        soundCount={sounds.length}
                        mixerCount={mixerChannels.length}
                        playlistCount={playlistLanes.length}
                        clipCount={clips.length}
                        selectedSound={selectedSound}
                        secondsPerBar={secondsPerBar}
                        selectedSoundDurationSeconds={selectedSoundDurationSeconds}
                        noteCount={pattern.notes.length}
                    />

                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 4,
                            bgcolor: "rgba(255,255,255,.055)",
                            border: "1px solid rgba(255,255,255,.1)",
                            overflow: "hidden",
                            backdropFilter: "blur(18px)",
                        }}
                    >
                        <Tabs
                            value={activePanel}
                            onChange={(_, nextValue) => setActivePanel(nextValue)}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                px: 1.5,
                                minHeight: 58,
                                borderBottom: "1px solid rgba(255,255,255,.1)",
                                "& .MuiTab-root": {
                                    minHeight: 58,
                                    color: "rgba(255,255,255,.68)",
                                    fontWeight: 900,
                                    textTransform: "none",
                                },
                                "& .Mui-selected": {
                                    color: "#9ee8ff !important",
                                },
                                "& .MuiTabs-indicator": {
                                    height: 3,
                                    borderRadius: 99,
                                    bgcolor: "#9ee8ff",
                                },
                            }}
                        >
                            <Tab
                                value="sound"
                                icon={<BlurOnRounded />}
                                iconPosition="start"
                                label="Sound Designer"
                            />
                            <Tab
                                value="pattern"
                                icon={<GridOnRounded />}
                                iconPosition="start"
                                label="Piano Roll"
                            />
                            <Tab
                                value="mixer"
                                icon={<TuneRounded />}
                                iconPosition="start"
                                label="Track Mixer"
                            />
                            <Tab
                                value="playlist"
                                icon={<LibraryMusicRounded />}
                                iconPosition="start"
                                label="Playlist Mixer"
                            />
                        </Tabs>

                        <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
                            {activePanel === "sound" && (
                                <SoundDesigner
                                    sounds={sounds}
                                    mixerChannels={mixerChannels}
                                    selectedSoundId={selectedSoundId}
                                    soundPlaying={soundPlaying}
                                    activeSoundId={activeSoundId}
                                    selectedSoundDurationSeconds={selectedSoundDurationSeconds}
                                    secondsPerBar={secondsPerBar}
                                    onSelectSound={setSelectedSoundId}
                                    onCreateSound={createSound}
                                    onDeleteSound={deleteSound}
                                    onDuplicateSound={duplicateSound}
                                    onPlaySound={playSoundAudition}
                                    onPauseSound={pauseSoundAudition}
                                    onStopSound={stopSoundAudition}
                                    onSoundChange={updateSound}
                                    onEnvelopeChange={updateEnvelope}
                                    onFilterChange={updateFilter}
                                    onFxChange={updateFx}
                                    onLayerChange={updateLayer}
                                    onAddLayer={addLayer}
                                    onDeleteLayer={deleteLayer}
                                />
                            )}

                            {activePanel === "pattern" && (
                                <PatternMixer
                                    pattern={pattern}
                                    sounds={sounds}
                                    mixerChannels={mixerChannels}
                                    selectedPianoSoundId={selectedPianoSoundId}
                                    selectedPianoNoteId={selectedPianoNoteId}
                                    noteLengthSteps={noteLengthSteps}
                                    patternPlaying={patternPlaying}
                                    currentPatternStep={currentPatternStep}
                                    patternSteps={PATTERN_STEPS}
                                    stepsPerBar={STEPS_PER_BAR}
                                    onPlayPattern={playPattern}
                                    onPausePattern={pausePattern}
                                    onStopPattern={stopPattern}
                                    onSelectedPianoSoundChange={setSelectedPianoSoundId}
                                    onNoteLengthStepsChange={setNoteLengthSteps}
                                    onAddPianoNote={addPianoNote}
                                    onSelectPianoNote={setSelectedPianoNoteId}
                                    onDeletePianoNote={deletePianoNote}
                                    onResizeSelectedNote={resizeSelectedNote}
                                    onMoveSelectedNote={moveSelectedNote}
                                    onClearPattern={clearPattern}
                                    onRasterizePattern={rasterizePatternToPlaylist}
                                />
                            )}

                            {activePanel === "mixer" && (
                                <TrackMixer
                                    mixerChannels={mixerChannels}
                                    selectedMixerChannelId={selectedMixerChannelId}
                                    onSelectMixerChannel={setSelectedMixerChannelId}
                                    onMixerChange={updateMixerChannel}
                                    onAddMixerChannel={addMixerChannel}
                                />
                            )}

                            {activePanel === "playlist" && (
                                <PlaylistMixer
                                    lanes={playlistLanes}
                                    clips={clips}
                                    mixerChannels={mixerChannels}
                                    selectedLaneId={selectedLaneId}
                                    selectedClipId={selectedClipId}
                                    clipboardClip={clipboardClip}
                                    playlistPlaying={playlistPlaying}
                                    secondsPerBar={secondsPerBar}
                                    onPlayPlaylist={playPlaylist}
                                    onStopPlaylist={stopPlaylist}
                                    onSelectLane={setSelectedLaneId}
                                    onSelectClip={setSelectedClipId}
                                    onLaneChange={updatePlaylistLane}
                                    onAddLane={addPlaylistLane}
                                    onDuplicateLane={duplicateLane}
                                    onUploadFiles={uploadFiles}
                                    onRasterizePattern={rasterizePatternToPlaylist}
                                    onPreviewClip={previewClip}
                                    onMoveClip={moveClip}
                                    onCopyClip={copyClip}
                                    onCutClip={cutClip}
                                    onPasteClip={pasteClip}
                                    onDuplicateClip={duplicateClip}
                                    onDeleteClip={deleteClip}
                                    onTrimClipStart={trimClipStart}
                                    onTrimClipEnd={trimClipEnd}
                                />
                            )}
                        </Box>
                    </Paper>
                </Stack>
            </Container>
        </GradientPage>
    );
}

function StudioStatsBar({
                            soundCount,
                            mixerCount,
                            playlistCount,
                            clipCount,
                            selectedSound,
                            secondsPerBar,
                            selectedSoundDurationSeconds,
                            noteCount,
                        }) {
    const stats = [
        {
            label: "Sounds",
            value: soundCount,
            icon: <BlurOnRounded fontSize="small" />,
        },
        {
            label: "Piano Notes",
            value: noteCount,
            icon: <GridOnRounded fontSize="small" />,
        },
        {
            label: "Mixer Tracks",
            value: mixerCount,
            icon: <TuneRounded fontSize="small" />,
        },
        {
            label: "Clips",
            value: clipCount,
            icon: <GraphicEqRounded fontSize="small" />,
        },
    ];

    return (
        <Box
            sx={{
                borderRadius: 4,
                p: 1.5,
                bgcolor: "rgba(255,255,255,.055)",
                border: "1px solid rgba(255,255,255,.1)",
                backdropFilter: "blur(18px)",
            }}
        >
            <Grid container spacing={1.5} alignItems="center">
                {stats.map((stat) => (
                    <Grid item xs={6} md={3} key={stat.label}>
                        <Stack
                            direction="row"
                            spacing={1.25}
                            alignItems="center"
                            sx={{
                                height: 54,
                                px: 1.5,
                                borderRadius: 3,
                                bgcolor: "rgba(255,255,255,.045)",
                                border: "1px solid rgba(255,255,255,.08)",
                            }}
                        >
                            <Box
                                sx={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 2,
                                    display: "grid",
                                    placeItems: "center",
                                    color: "#9ee8ff",
                                    bgcolor: "rgba(158,232,255,.1)",
                                }}
                            >
                                {stat.icon}
                            </Box>

                            <Box>
                                <Typography
                                    variant="caption"
                                    sx={{ color: "rgba(255,255,255,.55)" }}
                                >
                                    {stat.label}
                                </Typography>
                                <Typography sx={{ fontWeight: 950, lineHeight: 1 }}>
                                    {stat.value}
                                </Typography>
                            </Box>
                        </Stack>
                    </Grid>
                ))}
            </Grid>

            {selectedSound && (
                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    useFlexGap
                    flexWrap="wrap"
                    sx={{ mt: 1.5 }}
                >
                    <Typography
                        variant="caption"
                        sx={{ color: "rgba(255,255,255,.55)", fontWeight: 800 }}
                    >
                        Selected Sound:
                    </Typography>

                    <Chip
                        size="small"
                        label={selectedSound.name}
                        sx={{
                            color: "#06101f",
                            bgcolor: "#9ee8ff",
                            fontWeight: 900,
                        }}
                    />

                    <Chip
                        size="small"
                        label={selectedSound.type}
                        sx={{
                            color: "#fff",
                            bgcolor: "rgba(255,255,255,.08)",
                            border: "1px solid rgba(255,255,255,.1)",
                        }}
                    />

                    <Chip
                        size="small"
                        label={`${selectedSound.layers.length} oscillator layer(s)`}
                        sx={{
                            color: "#fff",
                            bgcolor: "rgba(255,255,255,.08)",
                            border: "1px solid rgba(255,255,255,.1)",
                        }}
                    />

                    <Chip
                        size="small"
                        label={`Sound length ${selectedSoundDurationSeconds.toFixed(2)}s / ${secondsToBars(
                            selectedSoundDurationSeconds,
                            secondsPerBar
                        ).toFixed(2)} bars`}
                        sx={{
                            color: "#fff",
                            bgcolor: "rgba(179,140,255,.16)",
                            border: "1px solid rgba(179,140,255,.28)",
                        }}
                    />
                </Stack>
            )}
        </Box>
    );
}

function getSoundHoldSeconds(sound) {
    if (!sound) return 0.25;

    if (sound.type === "soundscape" || sound.type === "pad") {
        return 1.2;
    }

    if (sound.type === "drum") {
        return 0.08;
    }

    return 0.25;
}

function estimateSoundDurationSeconds(sound, forcedHoldSeconds = null) {
    if (!sound) return 0;

    const envelope = sound.envelope || {};
    const fx = sound.fx || {};
    const hold = forcedHoldSeconds ?? getSoundHoldSeconds(sound);

    const core =
        Number(envelope.attack || 0) +
        Number(envelope.decay || 0) +
        hold +
        Number(envelope.release || 0);

    const delayTail =
        Number(fx.delayMix || 0) > 0.001
            ? Number(fx.delayTime || 0) * (1 + Number(fx.delayFeedback || 0) * 4)
            : 0;

    const reverbTail = Number(fx.reverbMix || 0) > 0.001 ? 1.25 * Number(fx.reverbMix || 0) : 0;

    return Math.max(0.1, core + delayTail + reverbTail + 0.15);
}

function structuredCloneSafe(value) {
    if (typeof structuredClone === "function") {
        return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
}

function audioBufferToWav(buffer) {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;

    const samples = buffer.length;
    const blockAlign = (numberOfChannels * bitDepth) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples * blockAlign;
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, "data");
    view.setUint32(40, dataSize, true);

    let offset = 44;

    for (let i = 0; i < samples; i += 1) {
        for (let channel = 0; channel < numberOfChannels; channel += 1) {
            const channelData = buffer.getChannelData(channel);
            const sample = Math.max(-1, Math.min(1, channelData[i]));
            view.setInt16(
                offset,
                sample < 0 ? sample * 0x8000 : sample * 0x7fff,
                true
            );
            offset += 2;
        }
    }

    return arrayBuffer;
}

async function audioBufferToMp3Blob(buffer) {
    const module = await import("lamejs");
    const lamejs = module.default || module;
    const Mp3Encoder = lamejs.Mp3Encoder;

    const channels = Math.min(2, buffer.numberOfChannels);
    const sampleRate = buffer.sampleRate;
    const kbps = 128;
    const encoder = new Mp3Encoder(channels, sampleRate, kbps);

    const left = floatTo16Bit(buffer.getChannelData(0));
    const right = channels > 1 ? floatTo16Bit(buffer.getChannelData(1)) : null;

    const blockSize = 1152;
    const mp3Data = [];

    for (let i = 0; i < left.length; i += blockSize) {
        const leftChunk = left.subarray(i, i + blockSize);
        const rightChunk = right ? right.subarray(i, i + blockSize) : null;

        const mp3Buffer =
            channels > 1
                ? encoder.encodeBuffer(leftChunk, rightChunk)
                : encoder.encodeBuffer(leftChunk);

        if (mp3Buffer.length > 0) {
            mp3Data.push(mp3Buffer);
        }
    }

    const endBuffer = encoder.flush();

    if (endBuffer.length > 0) {
        mp3Data.push(endBuffer);
    }

    return new Blob(mp3Data, { type: "audio/mpeg" });
}

function floatTo16Bit(float32Array) {
    const output = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i += 1) {
        const sample = Math.max(-1, Math.min(1, float32Array[i]));
        output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    return output;
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i += 1) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fileName;
    anchor.click();

    URL.revokeObjectURL(url);
}