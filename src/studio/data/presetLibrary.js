import { INSTRUMENT_PRESETS } from "./instrumentPresets.js";
import { normalizeSynthPatch } from "../audio/synthDefaults.js";

const SOFT_WARM_CATEGORY_PROFILE = {
  "808": { brightness: 0.24, cutoff: 3400, attack: 0.006, release: 0.24, lowCut: 24, airCutoff: 9000, presenceDip: -1.4, warmth: 0.8, outputTrim: 0.82 },
  Bass: { brightness: 0.28, cutoff: 4400, attack: 0.01, release: 0.32, lowCut: 28, airCutoff: 9400, presenceDip: -1.8, warmth: 0.9, outputTrim: 0.8 },
  Keys: { brightness: 0.38, cutoff: 6800, attack: 0.018, release: 0.78, lowCut: 42, airCutoff: 10800, presenceDip: -2.0, warmth: 0.7, outputTrim: 0.78 },
  Pluck: { brightness: 0.4, cutoff: 7200, attack: 0.008, release: 0.48, lowCut: 52, airCutoff: 10600, presenceDip: -2.4, warmth: 0.45, outputTrim: 0.74 },
  Bell: { brightness: 0.4, cutoff: 7600, attack: 0.006, release: 1.55, lowCut: 70, airCutoff: 11000, presenceDip: -2.8, warmth: 0.35, outputTrim: 0.7 },
  Lead: { brightness: 0.34, cutoff: 6100, attack: 0.014, release: 0.54, lowCut: 58, airCutoff: 10000, presenceDip: -2.7, warmth: 0.55, outputTrim: 0.72 },
  Pad: { brightness: 0.3, cutoff: 5600, attack: 0.38, release: 2.9, lowCut: 48, airCutoff: 9800, presenceDip: -2.3, warmth: 0.8, outputTrim: 0.7 },
  Synth: { brightness: 0.34, cutoff: 6200, attack: 0.025, release: 0.86, lowCut: 48, airCutoff: 10200, presenceDip: -2.3, warmth: 0.65, outputTrim: 0.74 },
  Brass: { brightness: 0.34, cutoff: 5800, attack: 0.06, release: 0.82, lowCut: 55, airCutoff: 9600, presenceDip: -2.5, warmth: 0.85, outputTrim: 0.72 },
  Flute: { brightness: 0.38, cutoff: 7200, attack: 0.04, release: 0.76, lowCut: 95, airCutoff: 11200, presenceDip: -1.9, warmth: 0.25, outputTrim: 0.72 },
  Texture: { brightness: 0.3, cutoff: 5600, attack: 0.32, release: 2.8, lowCut: 75, airCutoff: 9400, presenceDip: -2.4, warmth: 0.5, outputTrim: 0.66 },
  Chord: { brightness: 0.34, cutoff: 6200, attack: 0.045, release: 1.25, lowCut: 48, airCutoff: 10000, presenceDip: -2.4, warmth: 0.75, outputTrim: 0.7 },
  Arp: { brightness: 0.38, cutoff: 6900, attack: 0.01, release: 0.42, lowCut: 60, airCutoff: 10400, presenceDip: -2.4, warmth: 0.45, outputTrim: 0.7 },
  FX: { brightness: 0.34, cutoff: 6200, attack: 0.045, release: 1.5, lowCut: 70, airCutoff: 9800, presenceDip: -2.6, warmth: 0.35, outputTrim: 0.66 },
  Atmosphere: { brightness: 0.28, cutoff: 5200, attack: 0.55, release: 3.7, lowCut: 65, airCutoff: 9200, presenceDip: -2.4, warmth: 0.7, outputTrim: 0.64 },
  Cinematic: { brightness: 0.3, cutoff: 5600, attack: 0.3, release: 3.1, lowCut: 48, airCutoff: 9600, presenceDip: -2.6, warmth: 0.85, outputTrim: 0.66 },
  Hybrid: { brightness: 0.32, cutoff: 5900, attack: 0.06, release: 1.25, lowCut: 52, airCutoff: 9800, presenceDip: -2.8, warmth: 0.65, outputTrim: 0.68 },
  Choir: { brightness: 0.3, cutoff: 5200, attack: 0.28, release: 2.7, lowCut: 85, airCutoff: 9000, presenceDip: -2.2, warmth: 0.7, outputTrim: 0.66 },
  World: { brightness: 0.34, cutoff: 6200, attack: 0.035, release: 1.05, lowCut: 55, airCutoff: 10200, presenceDip: -2.1, warmth: 0.55, outputTrim: 0.7 },
  Motion: { brightness: 0.3, cutoff: 5700, attack: 0.12, release: 1.8, lowCut: 60, airCutoff: 9600, presenceDip: -2.5, warmth: 0.55, outputTrim: 0.66 },
  default: { brightness: 0.34, cutoff: 6200, attack: 0.022, release: 0.9, lowCut: 48, airCutoff: 10000, presenceDip: -2.3, warmth: 0.65, outputTrim: 0.72 },
};

function softenWaveform(waveform, index) {
  if (waveform === "sawtooth") return "warmSaw";
  if (["square", "pulse25", "pulse12"].includes(waveform)) return index === 0 ? "hollow" : "triangle";
  if (waveform === "metallic") return "glass";
  if (waveform === "shimmer" && index > 0) return "air";
  return waveform;
}

export function warmDigitalPreset(rawPreset) {
  const patch = normalizeSynthPatch(rawPreset);
  const profile = SOFT_WARM_CATEGORY_PROFILE[patch.category] || SOFT_WARM_CATEGORY_PROFILE.default;
  const softenOscillator = (oscillator, index) => ({
    ...oscillator,
    waveform: softenWaveform(oscillator.waveform, index),
    level: Math.min(index === 0 ? 0.68 : index === 1 ? 0.34 : 0.24, oscillator.level ?? 0),
    fine: Math.max(-12, Math.min(12, oscillator.fine || 0)),
  });
  const softenLayer = (layer, index) => ({
    ...layer,
    level: Math.min(0.16, layer.level ?? 0),
    detune: Math.min(12, layer.detune ?? 6),
    stereo: Math.min(0.58, layer.stereo ?? 0.35),
    waveform: softenWaveform(layer.waveform, index + 1),
    delay: Math.max(layer.delay || 0, 0.012 + index * 0.012),
    motion: Math.min(0.22, layer.motion ?? 0),
  });
  const softenLfo = (lfo) => ({
    ...lfo,
    amount: Math.max(-0.16, Math.min(0.16, lfo?.amount || 0)),
  });

  return {
    ...patch,
    id: rawPreset.id,
    name: rawPreset.name,
    category: rawPreset.category,
    author: rawPreset.author,
    tags: [...new Set([...(rawPreset.tags || []), "warm", "digital", "soft", "light", "smooth"])],
    description: `${rawPreset.description || "Original factory instrument."} Soft Warm voicing rounds sharp highs, relaxes transients, and keeps the patch light and musical.`,
    oscA: softenOscillator(patch.oscA, 0),
    oscB: softenOscillator(patch.oscB, 1),
    oscC: softenOscillator(patch.oscC, 2),
    layers: (patch.layers || []).map(softenLayer),
    sub: { ...patch.sub, level: Math.min(0.2, patch.sub?.level || 0) },
    noise: { ...patch.noise, level: Math.min(0.035, patch.noise?.level || 0), stereo: Math.min(0.35, patch.noise?.stereo || 0) },
    textureLayer: {
      ...patch.textureLayer,
      level: Math.min(0.03, patch.textureLayer?.level || 0),
      lowpass: Math.min(8200, patch.textureLayer?.lowpass || 8200),
      resonance: Math.min(0.8, patch.textureLayer?.resonance || 0.4),
      motion: Math.min(0.16, patch.textureLayer?.motion || 0),
    },
    ampEnv: {
      ...patch.ampEnv,
      attack: Math.max(profile.attack, patch.ampEnv?.attack || 0.001),
      decay: Math.max(0.12, patch.ampEnv?.decay || 0.08),
      sustain: Math.min(0.82, Math.max(0.28, patch.ampEnv?.sustain ?? 0.65)),
      release: Math.max(profile.release, patch.ampEnv?.release || 0.1),
    },
    filter1: {
      ...patch.filter1,
      cutoff: Math.min(profile.cutoff, patch.filter1?.cutoff || profile.cutoff),
      resonance: Math.min(1.55, patch.filter1?.resonance || 0.7),
      drive: Math.min(0.075, Math.max(0.01, patch.filter1?.drive || 0)),
    },
    filter2: {
      ...patch.filter2,
      cutoff: Math.min(Math.max(180, profile.cutoff * 0.72), patch.filter2?.cutoff || profile.cutoff),
      resonance: Math.min(1.2, patch.filter2?.resonance || 0.5),
      drive: Math.min(0.045, Math.max(0, patch.filter2?.drive || 0)),
    },
    filterEnv: {
      ...patch.filterEnv,
      amount: Math.max(-0.24, Math.min(0.34, patch.filterEnv?.amount || 0)),
      attack: Math.max(0.008, patch.filterEnv?.attack || 0.005),
    },
    pitchEnv: {
      ...patch.pitchEnv,
      amount: Math.max(-5, Math.min(5, patch.pitchEnv?.amount || 0)),
    },
    fm: { ...patch.fm, amount: Math.min(0.075, patch.fm?.amount || 0) },
    ring: { ...patch.ring, amount: Math.min(0.055, patch.ring?.amount || 0) },
    lfo1: softenLfo(patch.lfo1),
    lfo2: softenLfo(patch.lfo2),
    voiceFx: {
      ...patch.voiceFx,
      bitcrush: Math.min(0.012, patch.voiceFx?.bitcrush || 0),
      saturation: Math.min(0.085, Math.max(0.018, patch.voiceFx?.saturation || 0)),
      chorus: Math.min(0.3, patch.voiceFx?.chorus || 0),
      chorusDepth: Math.min(0.0045, patch.voiceFx?.chorusDepth || 0.003),
    },
    macros: {
      ...patch.macros,
      brightness: Math.min(profile.brightness, patch.macros?.brightness ?? profile.brightness),
      character: Math.min(0.42, patch.macros?.character ?? 0.24),
      motion: Math.min(0.38, patch.macros?.motion ?? 0.18),
    },
    unison: Math.min(5, patch.unison || 1),
    detune: Math.min(12, patch.detune || 0),
    stereo: Math.min(0.64, patch.stereo ?? 0.35),
    voiceDrift: Math.min(3, patch.voiceDrift || 0),
    softTone: {
      lowCut: profile.lowCut,
      warmthDb: profile.warmth,
      presenceFrequency: 3150,
      presenceDipDb: profile.presenceDip,
      airCutoff: profile.airCutoff,
      outputTrim: profile.outputTrim,
    },
    warmDigital: true,
    softWarm: true,
  };
}

const WARM_FACTORY_PRESETS = INSTRUMENT_PRESETS.map(warmDigitalPreset);

export function getAllPresets(project) {
  return [...WARM_FACTORY_PRESETS, ...(project?.customPresets || [])];
}

export function resolveTrackPreset(project, track) {
  const preset = getAllPresets(project).find((entry) => entry.id === track?.presetId)
    || WARM_FACTORY_PRESETS[0];
  return normalizeSynthPatch({ ...preset, ...(track?.synth || {}) });
}

export function makeCustomPreset(name, patch, source = "User") {
  return {
    ...normalizeSynthPatch(patch),
    id: `user-preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: name?.trim() || "Untitled Patch",
    category: "User",
    description: "Custom patch created in MusicStudioLab Synth Lab.",
    author: source,
    tags: ["user", "custom", "original"],
    createdAt: new Date().toISOString(),
  };
}

export function importPresetPayload(payload, fallbackName = "Imported Patch") {
  const source = payload?.patch || payload?.preset || payload;
  const name = payload?.name || source?.name || fallbackName;
  return makeCustomPreset(name, source, payload?.author || "Imported");
}
