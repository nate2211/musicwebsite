export const SYNTH_DEFAULTS = {
  engineMode: "subtractive",
  polyphony: 16,
  mono: false,
  legato: false,
  portamento: 0.035,
  masterTune: 0,
  voiceDrift: 2.5,
  velocityToAmp: 0.72,
  velocityToFilter: 0.35,
  keyTracking: 0.42,
  unison: 1,
  detune: 7,
  stereo: 0.35,
  phaseRandom: 0.15,

  oscA: {
    enabled: true,
    waveform: "sawtooth",
    octave: 0,
    semitone: 0,
    fine: 0,
    level: 0.72,
    pan: -0.08,
    pulseWidth: 0.5,
    phase: 0,
  },
  oscB: {
    enabled: true,
    waveform: "square",
    octave: 0,
    semitone: 0,
    fine: 7,
    level: 0.28,
    pan: 0.08,
    pulseWidth: 0.5,
    phase: 0.25,
  },
  oscC: {
    enabled: false,
    waveform: "triangle",
    octave: 1,
    semitone: 0,
    fine: -7,
    level: 0.12,
    pan: 0,
    pulseWidth: 0.5,
    phase: 0.5,
  },
  sub: {
    enabled: true,
    waveform: "sine",
    octave: -1,
    level: 0.18,
  },
  noise: {
    enabled: false,
    color: "pink",
    level: 0,
    stereo: 0.35,
  },

  ampEnv: {
    attack: 0.008,
    hold: 0,
    decay: 0.18,
    sustain: 0.72,
    release: 0.28,
    curve: "exponential",
  },
  filter1: {
    enabled: true,
    type: "lowpass",
    cutoff: 7800,
    resonance: 0.8,
    drive: 0.05,
    keyTrack: 0.35,
  },
  filter2: {
    enabled: false,
    type: "highpass",
    cutoff: 120,
    resonance: 0.4,
    drive: 0,
    keyTrack: 0,
  },
  filterRouting: "serial",
  filterBlend: 0.5,
  filterEnv: {
    attack: 0.006,
    hold: 0,
    decay: 0.32,
    sustain: 0.28,
    release: 0.42,
    amount: 0.38,
  },
  pitchEnv: {
    attack: 0.001,
    decay: 0.08,
    amount: 0,
  },

  fm: {
    enabled: false,
    source: "B",
    target: "A",
    ratio: 2,
    amount: 0,
  },
  ring: {
    enabled: false,
    amount: 0,
    ratio: 1,
  },

  lfo1: {
    enabled: true,
    waveform: "sine",
    rate: 4.5,
    sync: false,
    division: "1/4",
    amount: 0,
    target: "pitch",
    phase: 0,
  },
  lfo2: {
    enabled: false,
    waveform: "triangle",
    rate: 0.35,
    sync: false,
    division: "1/2",
    amount: 0,
    target: "filter",
    phase: 0.25,
  },

  macros: {
    character: 0.25,
    brightness: 0.58,
    motion: 0.18,
    width: 0.42,
  },
  voiceFx: {
    chorus: 0,
    chorusRate: 0.32,
    chorusDepth: 0.006,
    bitcrush: 0,
    saturation: 0.04,
  },

  arp: {
    enabled: false,
    mode: "up",
    rate: "1/16",
    octaves: 1,
    gate: 0.72,
  },
};

const legacyOsc = (preset, letter) => {
  const upper = letter.toUpperCase();
  const isA = upper === "A";
  const waveform = isA
    ? preset.waveform
    : preset[`osc${upper}Waveform`] ?? preset.osc2Waveform;
  const mix = isA ? undefined : preset[`osc${upper}Mix`] ?? preset.osc2Mix;
  const detune = isA ? undefined : preset[`osc${upper}Detune`] ?? preset.osc2Detune;
  const output = {};
  if (waveform != null) output.waveform = waveform;
  if (mix != null) output.level = mix;
  if (detune != null) output.semitone = detune;
  return output;
};

export function normalizeSynthPatch(input = {}) {
  const legacy = {
    oscA: legacyOsc(input, "A"),
    oscB: legacyOsc(input, "B"),
    sub: typeof input.sub === "number" ? {
      enabled: input.sub > 0,
      level: input.sub,
    } : {},
    noise: typeof input.noise === "number" ? {
      enabled: input.noise > 0,
      level: input.noise,
    } : {},
    ampEnv: {
      attack: input.attack,
      decay: input.decay,
      sustain: input.sustain,
      release: input.release,
    },
    filter1: {
      type: input.filterType,
      cutoff: input.cutoff,
      resonance: input.resonance,
      drive: input.drive,
    },
    filterEnv: {
      attack: input.filterAttack,
      decay: input.filterDecay,
      amount: input.filterEnv,
    },
    voiceFx: {
      saturation: input.drive,
    },
    lfo1: {
      enabled: (input.vibratoDepth ?? 0) > 0,
      rate: input.vibratoRate,
      amount: (input.vibratoDepth ?? 0) / 100,
      target: "pitch",
    },
    portamento: input.portamento,
    unison: input.unison,
    detune: input.detune,
    stereo: input.stereo,
  };

  const merge = (base, oldValue, newValue) => ({
    ...base,
    ...(oldValue || {}),
    ...(newValue || {}),
  });

  return {
    ...SYNTH_DEFAULTS,
    ...legacy,
    ...input,
    oscA: merge(SYNTH_DEFAULTS.oscA, legacy.oscA, input.oscA),
    oscB: merge(SYNTH_DEFAULTS.oscB, legacy.oscB, input.oscB),
    oscC: merge(SYNTH_DEFAULTS.oscC, null, input.oscC),
    sub: merge(SYNTH_DEFAULTS.sub, legacy.sub, input.sub),
    noise: merge(SYNTH_DEFAULTS.noise, legacy.noise, input.noise),
    ampEnv: merge(SYNTH_DEFAULTS.ampEnv, legacy.ampEnv, input.ampEnv),
    filter1: merge(SYNTH_DEFAULTS.filter1, legacy.filter1, input.filter1),
    filter2: merge(SYNTH_DEFAULTS.filter2, null, input.filter2),
    filterEnv: merge(SYNTH_DEFAULTS.filterEnv, legacy.filterEnv, input.filterEnv),
    pitchEnv: merge(SYNTH_DEFAULTS.pitchEnv, null, input.pitchEnv),
    fm: merge(SYNTH_DEFAULTS.fm, null, input.fm),
    ring: merge(SYNTH_DEFAULTS.ring, null, input.ring),
    lfo1: merge(SYNTH_DEFAULTS.lfo1, legacy.lfo1, input.lfo1),
    lfo2: merge(SYNTH_DEFAULTS.lfo2, null, input.lfo2),
    macros: merge(SYNTH_DEFAULTS.macros, null, input.macros),
    voiceFx: merge(SYNTH_DEFAULTS.voiceFx, legacy.voiceFx, input.voiceFx),
    arp: merge(SYNTH_DEFAULTS.arp, null, input.arp),
  };
}

export const SYNTH_WAVEFORMS = [
  "sine",
  "triangle",
  "sawtooth",
  "square",
  "pulse25",
  "pulse12",
  "warmSaw",
  "organ",
  "hollow",
  "digital",
  "metallic",
  "vowel",
];

export const FILTER_TYPES = [
  "lowpass",
  "highpass",
  "bandpass",
  "notch",
  "lowshelf",
  "highshelf",
  "peaking",
  "allpass",
];

export const LFO_TARGETS = [
  { value: "pitch", label: "Pitch" },
  { value: "filter", label: "Filter cutoff" },
  { value: "amp", label: "Amplitude" },
  { value: "pan", label: "Pan" },
  { value: "fm", label: "FM amount" },
  { value: "width", label: "Stereo width" },
];
