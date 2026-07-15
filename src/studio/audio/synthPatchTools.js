import { normalizeSynthPatch, SYNTH_WAVEFORMS } from "./synthDefaults";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const jitter = (value, amount, min, max) => clamp(value + (Math.random() * 2 - 1) * amount, min, max);

export function mutatePatch(input, intensity = 0.25) {
  const patch = normalizeSynthPatch(input);
  const mutateOsc = (oscillator) => ({
    ...oscillator,
    waveform: Math.random() < intensity * 0.35
      ? SYNTH_WAVEFORMS[Math.floor(Math.random() * SYNTH_WAVEFORMS.length)]
      : oscillator.waveform,
    fine: Math.round(jitter(oscillator.fine || 0, 18 * intensity, -50, 50)),
    level: jitter(oscillator.level || 0, 0.25 * intensity, 0, 1),
    pan: jitter(oscillator.pan || 0, 0.5 * intensity, -1, 1),
  });

  return {
    ...patch,
    unison: Math.round(jitter(patch.unison, 4 * intensity, 1, 9)),
    detune: jitter(patch.detune, 18 * intensity, 0, 40),
    stereo: jitter(patch.stereo, 0.5 * intensity, 0, 1),
    voiceDrift: jitter(patch.voiceDrift, 8 * intensity, 0, 15),
    oscA: mutateOsc(patch.oscA),
    oscB: mutateOsc(patch.oscB),
    oscC: mutateOsc(patch.oscC),
    ampEnv: {
      ...patch.ampEnv,
      attack: jitter(patch.ampEnv.attack, 0.2 * intensity, 0.001, 3),
      decay: jitter(patch.ampEnv.decay, 0.4 * intensity, 0.01, 4),
      sustain: jitter(patch.ampEnv.sustain, 0.3 * intensity, 0.01, 1),
      release: jitter(patch.ampEnv.release, 0.8 * intensity, 0.02, 8),
    },
    filter1: {
      ...patch.filter1,
      cutoff: jitter(patch.filter1.cutoff, 9000 * intensity, 40, 20000),
      resonance: jitter(patch.filter1.resonance, 8 * intensity, 0, 24),
      drive: jitter(patch.filter1.drive, 0.4 * intensity, 0, 1),
    },
    filterEnv: {
      ...patch.filterEnv,
      amount: jitter(patch.filterEnv.amount, 0.65 * intensity, -1, 1),
      attack: jitter(patch.filterEnv.attack, 0.2 * intensity, 0.001, 3),
      decay: jitter(patch.filterEnv.decay, 0.5 * intensity, 0.01, 5),
    },
    fm: {
      ...patch.fm,
      enabled: Math.random() < intensity * 0.4 ? !patch.fm.enabled : patch.fm.enabled,
      amount: jitter(patch.fm.amount, 0.45 * intensity, 0, 1),
      ratio: jitter(patch.fm.ratio, 3 * intensity, 0.125, 12),
    },
    macros: {
      character: Math.random(),
      brightness: Math.random(),
      motion: Math.random(),
      width: Math.random(),
    },
  };
}

export function randomizePatch() {
  const randomWave = () => SYNTH_WAVEFORMS[Math.floor(Math.random() * SYNTH_WAVEFORMS.length)];
  const patch = normalizeSynthPatch({});
  return {
    ...patch,
    unison: 1 + Math.floor(Math.random() * 7),
    detune: Math.random() * 28,
    stereo: Math.random(),
    voiceDrift: Math.random() * 9,
    oscA: { ...patch.oscA, waveform: randomWave(), level: 0.55 + Math.random() * 0.4 },
    oscB: {
      ...patch.oscB,
      enabled: Math.random() > 0.12,
      waveform: randomWave(),
      octave: [-1, 0, 0, 0, 1][Math.floor(Math.random() * 5)],
      semitone: [-12, 0, 0, 3, 4, 5, 7, 12][Math.floor(Math.random() * 8)],
      level: Math.random() * 0.55,
      fine: Math.round((Math.random() * 2 - 1) * 18),
    },
    oscC: {
      ...patch.oscC,
      enabled: Math.random() > 0.55,
      waveform: randomWave(),
      octave: [-1, 0, 1, 2][Math.floor(Math.random() * 4)],
      semitone: [0, 3, 4, 5, 7, 10, 12][Math.floor(Math.random() * 7)],
      level: Math.random() * 0.3,
    },
    sub: { ...patch.sub, enabled: Math.random() > 0.35, level: Math.random() * 0.35 },
    noise: {
      ...patch.noise,
      enabled: Math.random() > 0.58,
      color: ["white", "pink", "brown", "blue"][Math.floor(Math.random() * 4)],
      level: Math.random() * 0.16,
    },
    ampEnv: {
      ...patch.ampEnv,
      attack: 0.001 + Math.random() ** 3 * 1.2,
      decay: 0.04 + Math.random() * 1.2,
      sustain: 0.08 + Math.random() * 0.9,
      release: 0.04 + Math.random() * 2.4,
    },
    filter1: {
      ...patch.filter1,
      type: ["lowpass", "lowpass", "bandpass", "highpass", "notch"][Math.floor(Math.random() * 5)],
      cutoff: 120 + Math.random() ** 0.45 * 18800,
      resonance: Math.random() * 12,
      drive: Math.random() * 0.65,
    },
    filterEnv: {
      ...patch.filterEnv,
      amount: Math.random() * 1.6 - 0.4,
      attack: 0.001 + Math.random() * 0.45,
      decay: 0.04 + Math.random() * 1.5,
      sustain: Math.random(),
      release: 0.05 + Math.random() * 2,
    },
    fm: {
      ...patch.fm,
      enabled: Math.random() > 0.62,
      ratio: 0.5 + Math.floor(Math.random() * 12) * 0.5,
      amount: Math.random() * 0.65,
    },
    ring: {
      ...patch.ring,
      enabled: Math.random() > 0.76,
      ratio: 0.25 + Math.random() * 4,
      amount: Math.random() * 0.6,
    },
    lfo1: {
      ...patch.lfo1,
      enabled: Math.random() > 0.2,
      target: ["pitch", "filter", "amp", "pan"][Math.floor(Math.random() * 4)],
      rate: 0.1 + Math.random() * 10,
      amount: Math.random() * 0.35,
    },
    lfo2: {
      ...patch.lfo2,
      enabled: Math.random() > 0.5,
      target: ["filter", "pitch", "pan", "fm"][Math.floor(Math.random() * 4)],
      rate: 0.05 + Math.random() * 4,
      amount: Math.random() * 0.3,
    },
    macros: {
      character: Math.random(),
      brightness: Math.random(),
      motion: Math.random(),
      width: Math.random(),
    },
  };
}

export function interpolatePatch(aInput, bInput, amount) {
  const a = normalizeSynthPatch(aInput);
  const b = normalizeSynthPatch(bInput);
  const mix = clamp(amount, 0, 1);
  const lerp = (left, right) => left + (right - left) * mix;
  const interpolateObject = (left, right) => {
    const output = { ...left };
    Object.keys(right).forEach((key) => {
      if (typeof left[key] === "number" && typeof right[key] === "number") {
        output[key] = lerp(left[key], right[key]);
      } else if (mix >= 0.5) {
        output[key] = right[key];
      }
    });
    return output;
  };

  return {
    ...a,
    ...(mix >= 0.5 ? b : {}),
    unison: Math.round(lerp(a.unison, b.unison)),
    detune: lerp(a.detune, b.detune),
    stereo: lerp(a.stereo, b.stereo),
    oscA: interpolateObject(a.oscA, b.oscA),
    oscB: interpolateObject(a.oscB, b.oscB),
    oscC: interpolateObject(a.oscC, b.oscC),
    sub: interpolateObject(a.sub, b.sub),
    noise: interpolateObject(a.noise, b.noise),
    ampEnv: interpolateObject(a.ampEnv, b.ampEnv),
    filter1: interpolateObject(a.filter1, b.filter1),
    filter2: interpolateObject(a.filter2, b.filter2),
    filterEnv: interpolateObject(a.filterEnv, b.filterEnv),
    pitchEnv: interpolateObject(a.pitchEnv, b.pitchEnv),
    fm: interpolateObject(a.fm, b.fm),
    ring: interpolateObject(a.ring, b.ring),
    lfo1: interpolateObject(a.lfo1, b.lfo1),
    lfo2: interpolateObject(a.lfo2, b.lfo2),
    macros: interpolateObject(a.macros, b.macros),
    voiceFx: interpolateObject(a.voiceFx, b.voiceFx),
  };
}
