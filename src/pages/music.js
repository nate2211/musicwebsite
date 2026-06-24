import React from "react";
import {
    Box,
    Container,
    Stack,
    Tab,
    Tabs,
    Typography,
} from "@mui/material";
import {
    BlurOnRounded,
    GridOnRounded,
    PianoRounded,
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
import Seo from "../components/seo";

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
    const playlistTimersRef = React.useRef([]);
    const activeHtmlAudioRef = React.useRef([]);
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
        "Ready. Draw C0-C9 piano-roll notes, choose initial note length, play the pattern, rasterize it, and arrange it."
    );

    const selectedSound = React.useMemo(
        () => sounds.find((sound) => sound.id === selectedSoundId),
        [sounds, selectedSoundId]
    );

    const selectedLane = React.useMemo(
        () => playlistLanes.find((lane) => lane.id === selectedLaneId),
        [playlistLanes, selectedLaneId]
    );

    const selectedClip = React.useMemo(
        () => clips.find((clip) => clip.id === selectedClipId),
        [clips, selectedClipId]
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

    const setSafeBpm = React.useCallback((nextBpm) => {
        const safeBpm = clampNumber(Number(nextBpm) || 128, 40, 240);
        setBpm(safeBpm);
    }, []);

    const setSafeNoteLengthSteps = React.useCallback((nextLength) => {
        setNoteLengthSteps(clampNumber(Math.round(Number(nextLength) || 1), 1, PATTERN_STEPS));
    }, []);

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

    const registerSource = React.useCallback((source, targetRef = activeSourcesRef) => {
        targetRef.current.push(source);

        source.onended = () => {
            targetRef.current = targetRef.current.filter((item) => item !== source);
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

    const stopHtmlAudio = React.useCallback(() => {
        activeHtmlAudioRef.current.forEach((audio) => {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch {
                // Ignore.
            }
        });

        activeHtmlAudioRef.current = [];
    }, []);

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
        playlistTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
        playlistTimersRef.current = [];

        stopActiveSources();
        stopHtmlAudio();
        setPlaylistPlaying(false);
    }, [stopActiveSources, stopHtmlAudio]);

    React.useEffect(() => {
        return () => {
            stopPattern();
            stopPlaylist();
            stopSoundAudition();
            stopActiveSources();
            stopHtmlAudio();
        };
    }, [stopActiveSources, stopHtmlAudio, stopPattern, stopPlaylist, stopSoundAudition]);

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
        const length = Math.floor(sampleRate * seconds);
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
        ({
            context,
            sound,
            frequency,
            when,
            destination,
            registerTo = activeSourcesRef,
            forcedHoldSeconds = null,
        }) => {
            if (!sound) return 0;

            const envelope = sound.envelope;
            const fx = sound.fx;
            const filterSettings = sound.filter;
            const hold = forcedHoldSeconds ?? getSoundHoldSeconds(sound);
            const totalDuration = estimateSoundDurationSeconds(sound, hold);

            const voiceBus = context.createGain();
            const filter = context.createBiquadFilter();
            const amp = context.createGain();

            filter.type = filterSettings.type || "lowpass";
            filter.frequency.setValueAtTime(filterSettings.cutoff || 8000, when);
            filter.Q.value = filterSettings.q || 0.8;

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

                registerSource(oscillator, registerTo);
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

                registerSource(noise, registerTo);
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

            const duration = playDesignedSound({
                context,
                sound,
                frequency: sound.rootFrequency || note("C4"),
                when: context.currentTime + 0.02,
                destination: output,
                registerTo: soundAuditionSourcesRef,
            });

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

    const playPatternNoteList = React.useCallback(
        (context, notes, destination, startOffsetSeconds = 0) => {
            notes.forEach((pianoNote) => {
                const sound = sounds.find((item) => item.id === pianoNote.soundId);
                if (!sound) return;

                const when = context.currentTime + startOffsetSeconds + pianoNote.startStep * stepSeconds;
                const output = createMixerInput(context, sound.mixerChannelId, destination);
                const forcedHoldSeconds = Math.max(stepSeconds, pianoNote.lengthSteps * stepSeconds);

                playDesignedSound({
                    context,
                    sound,
                    frequency: pianoNote.note || sound.rootFrequency || note("C4"),
                    when,
                    destination: output,
                    registerTo: activeSourcesRef,
                    forcedHoldSeconds,
                });
            });
        },
        [createMixerInput, playDesignedSound, sounds, stepSeconds]
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

                    playDesignedSound({
                        context,
                        sound,
                        frequency: pianoNote.note || sound.rootFrequency || note("C4"),
                        when,
                        destination: output,
                        registerTo: activeSourcesRef,
                        forcedHoldSeconds,
                    });
                });
        },
        [createMixerInput, pattern.notes, playDesignedSound, sounds, stepSeconds]
    );

    const playPattern = React.useCallback(async () => {
        const context = await getAudioContext();

        stopPattern();
        stopPlaylist();

        patternStepRef.current = 0;
        setPatternPlaying(true);
        setActivePanel("pattern");
        setStatus("Piano-roll pattern playing with selected note lengths.");

        const tick = () => {
            const stepIndex = patternStepRef.current;
            setCurrentPatternStep(stepIndex);
            playPatternStep(context, stepIndex, context.destination);
            patternStepRef.current = (stepIndex + 1) % PATTERN_STEPS;
        };

        tick();
        patternTimerRef.current = window.setInterval(tick, stepSeconds * 1000);
    }, [getAudioContext, playPatternStep, stepSeconds, stopPattern, stopPlaylist]);

    const pausePattern = React.useCallback(() => {
        if (patternTimerRef.current) {
            window.clearInterval(patternTimerRef.current);
            patternTimerRef.current = null;
        }

        setPatternPlaying(false);
        setStatus("Pattern paused.");
    }, []);

    const addPianoNote = React.useCallback(({ soundId, note: noteFrequency, startStep, lengthSteps }) => {
        if (!soundId) return;

        const safeStart = clampNumber(Number(startStep) || 0, 0, PATTERN_STEPS - 1);
        const safeLength = clampNumber(
            Math.round(Number(lengthSteps) || 1),
            1,
            PATTERN_STEPS - safeStart
        );

        const newNote = {
            id: createId(),
            soundId,
            note: noteFrequency,
            startStep: safeStart,
            lengthSteps: safeLength,
        };

        setPattern((current) => ({
            ...current,
            notes: [...current.notes, newNote],
        }));

        setSelectedPianoNoteId(newNote.id);
        setActivePanel("pattern");
        setStatus(
            `Added note at step ${safeStart + 1} with length ${safeLength}. Same-key notes are preserved.`
        );
    }, []);

    const deletePianoNote = React.useCallback((noteId) => {
        if (!noteId) return;

        setPattern((current) => ({
            ...current,
            notes: current.notes.filter((item) => item.id !== noteId),
        }));

        setSelectedPianoNoteId(null);
        setStatus("Deleted selected piano-roll note.");
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
                        lengthSteps: clampNumber(item.lengthSteps + delta, 1, maxLength),
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
                        startStep: clampNumber(
                            item.startStep + delta,
                            0,
                            PATTERN_STEPS - item.lengthSteps
                        ),
                    };
                }),
            }));
        },
        [selectedPianoNoteId]
    );

    const duplicateSelectedNote = React.useCallback(() => {
        if (!selectedPianoNoteId) return;

        setPattern((current) => {
            const target = current.notes.find((item) => item.id === selectedPianoNoteId);
            if (!target) return current;

            const duplicated = {
                ...target,
                id: createId(),
                startStep: clampNumber(
                    target.startStep + target.lengthSteps,
                    0,
                    PATTERN_STEPS - target.lengthSteps
                ),
            };

            setSelectedPianoNoteId(duplicated.id);

            return {
                ...current,
                notes: [...current.notes, duplicated],
            };
        });

        setStatus("Duplicated selected piano-roll note.");
    }, [selectedPianoNoteId]);

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
            const nextSound = sounds.find((sound) => sound.id !== soundId);

            if (activeSoundId === soundId) {
                stopSoundAudition();
            }

            setSounds((current) => current.filter((sound) => sound.id !== soundId));

            setPattern((current) => ({
                ...current,
                notes: current.notes.filter((pianoNote) => pianoNote.soundId !== soundId),
            }));

            setSelectedSoundId((current) => (current === soundId ? nextSound?.id || null : current));
            setSelectedPianoSoundId((current) =>
                current === soundId ? nextSound?.id || null : current
            );

            setSelectedPianoNoteId(null);
            setStatus(`Deleted sound and removed its piano-roll notes: ${target?.name || "sound"}.`);
        },
        [activeSoundId, sounds, stopSoundAudition]
    );

    const duplicateSound = React.useCallback(
        (soundId) => {
            const target = sounds.find((sound) => sound.id === soundId);
            if (!target) return;

            const duplicated = {
                ...clonePlain(target),
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
        const newChannel = {
            id: createId(),
            name: `Mixer ${mixerChannels.length}`,
            volume: 0.85,
            pan: 0,
            muted: false,
            solo: false,
            filterType: "allpass",
            cutoff: 18000,
            q: 0.8,
            fxWet: 0,
        };

        setMixerChannels((current) => [...current, newChannel]);
        setSelectedMixerChannelId(newChannel.id);
        setActivePanel("mixer");
        setStatus(`Added mixer track: ${newChannel.name}.`);
    }, [mixerChannels.length]);

    const updateLane = React.useCallback((laneId, field, value) => {
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
    }, []);

    const addLane = React.useCallback(() => {
        const newLane = {
            id: createId(),
            name: `Playlist Track ${playlistLanes.length + 1}`,
            mixerChannelId: "mix-audio-1",
        };

        setPlaylistLanes((current) => [...current, newLane]);
        setSelectedLaneId(newLane.id);
        setActivePanel("playlist");
        setStatus(`Added playlist track: ${newLane.name}.`);
    }, [playlistLanes.length]);

    const duplicateLane = React.useCallback(
        (laneId) => {
            const lane = playlistLanes.find((item) => item.id === laneId);
            if (!lane) return;

            const duplicatedLane = {
                ...lane,
                id: createId(),
                name: `${lane.name} Copy`,
            };

            const duplicatedClips = clips
                .filter((clip) => clip.laneId === laneId)
                .map((clip) => ({
                    ...clonePlain(clip),
                    id: createId(),
                    laneId: duplicatedLane.id,
                    name: `${clip.name} Copy`,
                }));

            setPlaylistLanes((current) => [...current, duplicatedLane]);
            setClips((current) => [...current, ...duplicatedClips]);
            setSelectedLaneId(duplicatedLane.id);
            setActivePanel("playlist");
            setStatus(`Duplicated playlist track: ${lane.name}.`);
        },
        [clips, playlistLanes]
    );

    const rasterizePattern = React.useCallback(() => {
        const targetLane = selectedLane || playlistLanes[0];
        const patternBars = PATTERN_STEPS / STEPS_PER_BAR;
        const nextStart = findNextClipStart(clips, targetLane.id, patternBars);

        const clip = {
            id: createId(),
            name: `${pattern.name} Clip`,
            sourceType: "pattern",
            laneId: targetLane.id,
            mixerChannelId: targetLane.mixerChannelId,
            startBar: clampNumber(nextStart, 0, PLAYLIST_BARS - 1),
            lengthBars: patternBars,
            trimStartSeconds: 0,
            trimEndSeconds: 0,
            patternSnapshot: clonePlain(pattern),
        };

        setClips((current) => [...current, clip]);
        setSelectedClipId(clip.id);
        setActivePanel("playlist");
        setStatus(`Rasterized ${pattern.notes.length} notes to playlist.`);
    }, [clips, pattern, playlistLanes, selectedLane]);

    const uploadFiles = React.useCallback(
        (fileList) => {
            const files = Array.from(fileList || []);
            if (!files.length) return;

            const targetLane = selectedLane || playlistLanes.find((lane) => lane.id === "lane-audio") || playlistLanes[0];

            const newClips = files.map((file, index) => {
                const url = URL.createObjectURL(file);
                const baseLengthBars = 2;
                const startBar = clampNumber(
                    findNextClipStart(clips, targetLane.id, baseLengthBars) + index * baseLengthBars,
                    0,
                    PLAYLIST_BARS - 1
                );

                return {
                    id: createId(),
                    name: file.name,
                    sourceType: "audio",
                    laneId: targetLane.id,
                    mixerChannelId: targetLane.mixerChannelId,
                    startBar,
                    lengthBars: baseLengthBars,
                    durationSeconds: baseLengthBars * secondsPerBar,
                    trimStartSeconds: 0,
                    trimEndSeconds: 0,
                    fileName: file.name,
                    url,
                };
            });

            setClips((current) => [...current, ...newClips]);
            setSelectedClipId(newClips[0]?.id || null);
            setActivePanel("playlist");
            setStatus(`Uploaded ${files.length} audio file(s) to the playlist.`);

            newClips.forEach((clip) => {
                if (!clip.url) return;

                const audio = new Audio(clip.url);

                audio.addEventListener("loadedmetadata", () => {
                    if (!Number.isFinite(audio.duration)) return;

                    setClips((current) =>
                        current.map((item) =>
                            item.id === clip.id
                                ? {
                                    ...item,
                                    durationSeconds: audio.duration,
                                    lengthBars: Math.max(0.25, secondsToBars(audio.duration, secondsPerBar)),
                                }
                                : item
                        )
                    );
                });
            });
        },
        [clips, playlistLanes, secondsPerBar, selectedLane]
    );

    const previewClip = React.useCallback(
        async (clip) => {
            if (!clip) return;

            if (clip.sourceType === "pattern") {
                const context = await getAudioContext();
                playPatternNoteList(
                    context,
                    clip.patternSnapshot?.notes || [],
                    context.destination,
                    0
                );
                setStatus(`Previewing pattern clip: ${clip.name}.`);
                return;
            }

            if (clip.url) {
                const audio = new Audio(clip.url);
                audio.currentTime = Math.max(0, clip.trimStartSeconds || 0);
                audio.volume = 0.9;
                activeHtmlAudioRef.current.push(audio);
                await audio.play();
                setStatus(`Previewing audio clip: ${clip.name}.`);
            }
        },
        [getAudioContext, playPatternNoteList]
    );

    const playPlaylist = React.useCallback(async () => {
        if (!clips.length) {
            setStatus("Playlist is empty. Rasterize a pattern or upload audio first.");
            return;
        }

        stopPattern();
        stopPlaylist();

        const context = await getAudioContext();
        const startedAt = context.currentTime;

        clips.forEach((clip) => {
            const lane =
                playlistLanes.find((item) => item.id === clip.laneId) ||
                playlistLanes[0];

            const startDelayMs = Math.max(0, clip.startBar * secondsPerBar * 1000);

            const timerId = window.setTimeout(() => {
                if (clip.sourceType === "pattern") {
                    playPatternNoteList(
                        context,
                        clip.patternSnapshot?.notes || [],
                        context.destination,
                        Math.max(0, startedAt + clip.startBar * secondsPerBar - context.currentTime)
                    );
                }

                if (clip.sourceType === "audio" && clip.url) {
                    const audio = new Audio(clip.url);
                    audio.currentTime = Math.max(0, clip.trimStartSeconds || 0);
                    audio.volume = getLaneVolume(mixerChannels, lane.mixerChannelId);
                    activeHtmlAudioRef.current.push(audio);
                    audio.play().catch(() => {});
                }
            }, startDelayMs);

            playlistTimersRef.current.push(timerId);
        });

        const playlistEndMs =
            Math.max(
                ...clips.map((clip) => {
                    const clipLengthSeconds =
                        clip.sourceType === "pattern"
                            ? (clip.lengthBars || 1) * secondsPerBar
                            : clip.durationSeconds || (clip.lengthBars || 1) * secondsPerBar;

                    return (clip.startBar * secondsPerBar + clipLengthSeconds) * 1000;
                })
            ) + 500;

        const stopTimerId = window.setTimeout(() => {
            setPlaylistPlaying(false);
            stopHtmlAudio();
            playlistTimersRef.current = [];
        }, playlistEndMs);

        playlistTimersRef.current.push(stopTimerId);

        setPlaylistPlaying(true);
        setActivePanel("playlist");
        setStatus("Playlist playing.");
    }, [
        clips,
        getAudioContext,
        mixerChannels,
        playPatternNoteList,
        playlistLanes,
        secondsPerBar,
        stopHtmlAudio,
        stopPattern,
        stopPlaylist,
    ]);

    const selectClip = React.useCallback((clipId) => {
        setSelectedClipId(clipId);
    }, []);

    const moveClip = React.useCallback(
        (clipIdOrDelta, maybeDelta) => {
            const clipId = typeof clipIdOrDelta === "string" ? clipIdOrDelta : selectedClipId;
            const delta = typeof clipIdOrDelta === "number" ? clipIdOrDelta : maybeDelta;

            if (!clipId || !delta) return;

            setClips((current) =>
                current.map((clip) =>
                    clip.id === clipId
                        ? {
                            ...clip,
                            startBar: clampNumber(clip.startBar + delta, 0, PLAYLIST_BARS - 1),
                        }
                        : clip
                )
            );
        },
        [selectedClipId]
    );

    const copyClip = React.useCallback(() => {
        if (!selectedClip) return;

        setClipboardClip(clonePlain(selectedClip));
        setStatus(`Copied clip: ${selectedClip.name}.`);
    }, [selectedClip]);

    const cutClip = React.useCallback(() => {
        if (!selectedClip) return;

        setClipboardClip(clonePlain(selectedClip));
        setClips((current) => current.filter((clip) => clip.id !== selectedClip.id));
        setSelectedClipId(null);
        setStatus(`Cut clip: ${selectedClip.name}.`);
    }, [selectedClip]);

    const pasteClip = React.useCallback(() => {
        if (!clipboardClip) return;

        const targetLane = selectedLane || playlistLanes[0];

        const pasted = {
            ...clonePlain(clipboardClip),
            id: createId(),
            name: `${clipboardClip.name} Paste`,
            laneId: targetLane.id,
            mixerChannelId: targetLane.mixerChannelId,
            startBar: clampNumber((clipboardClip.startBar || 0) + 1, 0, PLAYLIST_BARS - 1),
        };

        setClips((current) => [...current, pasted]);
        setSelectedClipId(pasted.id);
        setStatus(`Pasted clip: ${pasted.name}.`);
    }, [clipboardClip, playlistLanes, selectedLane]);

    const duplicateClip = React.useCallback(() => {
        if (!selectedClip) return;

        const duplicated = {
            ...clonePlain(selectedClip),
            id: createId(),
            name: `${selectedClip.name} Copy`,
            startBar: clampNumber(selectedClip.startBar + 1, 0, PLAYLIST_BARS - 1),
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

    const trimSelectedClipStart = React.useCallback(
        (delta) => {
            if (!selectedClip) return;

            setClips((current) =>
                current.map((clip) => {
                    if (clip.id !== selectedClip.id) return clip;

                    const fullSeconds =
                        clip.sourceType === "pattern"
                            ? (clip.lengthBars || 1) * secondsPerBar
                            : clip.durationSeconds || (clip.lengthBars || 1) * secondsPerBar;

                    const currentEnd = clip.trimEndSeconds || 0;
                    const nextStart = clampNumber(
                        (clip.trimStartSeconds || 0) + delta,
                        0,
                        Math.max(0, fullSeconds - currentEnd - 0.05)
                    );

                    return {
                        ...clip,
                        trimStartSeconds: nextStart,
                    };
                })
            );
        },
        [secondsPerBar, selectedClip]
    );

    const trimSelectedClipEnd = React.useCallback(
        (delta) => {
            if (!selectedClip) return;

            setClips((current) =>
                current.map((clip) => {
                    if (clip.id !== selectedClip.id) return clip;

                    const fullSeconds =
                        clip.sourceType === "pattern"
                            ? (clip.lengthBars || 1) * secondsPerBar
                            : clip.durationSeconds || (clip.lengthBars || 1) * secondsPerBar;

                    const currentStart = clip.trimStartSeconds || 0;
                    const nextEnd = clampNumber(
                        (clip.trimEndSeconds || 0) + delta,
                        0,
                        Math.max(0, fullSeconds - currentStart - 0.05)
                    );

                    return {
                        ...clip,
                        trimEndSeconds: nextEnd,
                    };
                })
            );
        },
        [secondsPerBar, selectedClip]
    );

    const exportWav = React.useCallback(() => {
        setStatus("WAV export placeholder ready. Add offline rendering next if you want true bounced audio output.");
    }, []);

    const exportMp3 = React.useCallback(() => {
        setStatus("MP3 export placeholder ready. Browsers need an MP3 encoder library or server conversion.");
    }, []);

    return (
        <GradientPage>
            <Seo
                title="Music Studio"
                path="/music"
                description="MusicStudioLab is a browser-based WebAudio studio with a sound designer, advanced piano roll, mixer, playlist arranger, and export controls."
                keywords="music studio, WebAudio, piano roll, sound designer, synth, playlist, mixer, browser DAW"
            />

            <AppNavBar />

            <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
                <BackHomeButton />

                <SectionHeader
                    eyebrow="Browser DAW"
                    title="Music Studio"
                    description="Design oscillator sounds, draw C0-C9 piano-roll notes, choose initial note lengths, play patterns, rasterize clips, arrange tracks, and mix everything in one browser workspace."
                />

                <Stack spacing={2.5}>
                    <StudioTransport
                        bpm={bpm}
                        onBpmChange={setSafeBpm}
                        onExportWav={exportWav}
                        onExportMp3={exportMp3}
                    />

                    <StatusCard status={status} />

                    <Box
                        sx={{
                            p: 1,
                            borderRadius: 4,
                            bgcolor: "rgba(255,255,255,.045)",
                            border: "1px solid rgba(255,255,255,.08)",
                        }}
                    >
                        <Tabs
                            value={activePanel}
                            onChange={(_, nextPanel) => setActivePanel(nextPanel)}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                minHeight: 48,
                                "& .MuiTab-root": {
                                    color: "rgba(255,255,255,.58)",
                                    fontWeight: 900,
                                    borderRadius: 999,
                                    minHeight: 44,
                                    textTransform: "none",
                                },
                                "& .Mui-selected": {
                                    color: "#06101f !important",
                                    bgcolor: "#9ee8ff",
                                },
                                "& .MuiTabs-indicator": {
                                    display: "none",
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
                                icon={<PianoRounded />}
                                iconPosition="start"
                                label="Piano Roll"
                            />
                            <Tab
                                value="mixer"
                                icon={<TuneRounded />}
                                iconPosition="start"
                                label="Mixer"
                            />
                            <Tab
                                value="playlist"
                                icon={<GridOnRounded />}
                                iconPosition="start"
                                label="Playlist"
                            />
                        </Tabs>
                    </Box>

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
                            onNoteLengthStepsChange={setSafeNoteLengthSteps}
                            onAddPianoNote={addPianoNote}
                            onSelectPianoNote={setSelectedPianoNoteId}
                            onDeletePianoNote={deletePianoNote}
                            onResizeSelectedNote={resizeSelectedNote}
                            onMoveSelectedNote={moveSelectedNote}
                            onClearPattern={clearPattern}
                            onRasterizePattern={rasterizePattern}
                            onDuplicateSelectedNote={duplicateSelectedNote}
                            onDeselectPianoNote={() => setSelectedPianoNoteId(null)}
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
                            onSelectClip={selectClip}
                            onLaneChange={updateLane}
                            onAddLane={addLane}
                            onDuplicateLane={duplicateLane}
                            onUploadFiles={uploadFiles}
                            onRasterizePattern={rasterizePattern}
                            onPreviewClip={previewClip}
                            onMoveClip={moveClip}
                            onCopyClip={copyClip}
                            onCutClip={cutClip}
                            onPasteClip={pasteClip}
                            onDuplicateClip={duplicateClip}
                            onDeleteClip={deleteClip}
                            onTrimClipStart={trimSelectedClipStart}
                            onTrimClipEnd={trimSelectedClipEnd}
                        />
                    )}

                    <Typography
                        variant="caption"
                        sx={{
                            color: "rgba(255,255,255,.42)",
                            textAlign: "center",
                            pb: 2,
                        }}
                    >
                        Tip: repeated notes on the same key are allowed. Select a note to move, resize, duplicate, deselect, or delete it.
                    </Typography>
                </Stack>
            </Container>
        </GradientPage>
    );
}

function estimateSoundDurationSeconds(sound, forcedHoldSeconds = null) {
    const envelope = sound?.envelope || {};
    const hold = forcedHoldSeconds ?? getSoundHoldSeconds(sound);

    return (
        Math.max(envelope.attack || 0.001, 0.001) +
        Math.max(envelope.decay || 0.001, 0.001) +
        hold +
        Math.max(envelope.release || 0.02, 0.02) +
        getFxTailSeconds(sound)
    );
}

function getSoundHoldSeconds(sound) {
    if (!sound) return 0.18;

    if (sound.type === "drum") return 0.04;
    if (sound.type === "soundscape" || sound.type === "pad") return 1.4;
    if (sound.type === "bass") return 0.34;
    return 0.45;
}

function getFxTailSeconds(sound) {
    if (!sound?.fx) return 0;

    const delayTail =
        sound.fx.delayMix > 0.001 && sound.fx.delayTime > 0.001
            ? sound.fx.delayTime * (1 + sound.fx.delayFeedback * 2)
            : 0;

    const reverbTail = sound.fx.reverbMix > 0.001 ? 0.65 + sound.fx.reverbMix * 1.5 : 0;

    return Math.max(delayTail, reverbTail);
}

function clonePlain(value) {
    return JSON.parse(JSON.stringify(value));
}

function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
}

function findNextClipStart(clips, laneId, lengthBars) {
    const laneClips = clips.filter((clip) => clip.laneId === laneId);

    if (!laneClips.length) return 0;

    const farthestEnd = laneClips.reduce(
        (max, clip) => Math.max(max, (clip.startBar || 0) + (clip.lengthBars || lengthBars)),
        0
    );

    return clampNumber(farthestEnd, 0, PLAYLIST_BARS - 1);
}

function getLaneVolume(mixerChannels, mixerChannelId) {
    const channel = mixerChannels.find((item) => item.id === mixerChannelId);
    const master = mixerChannels.find((item) => item.id === "master");

    if (!channel) return 0.85;
    if (channel.muted) return 0;

    const masterVolume = master?.muted ? 0 : master?.volume ?? 1;

    return clampNumber((channel.volume || 0.85) * masterVolume, 0, 1);
}