import { midiToFrequency } from "./musicTheory";
import { normalizeSynthPatch } from "./synthDefaults";
import { createStereoWidthStage } from "./effects";
import {
  AUDIO_EPSILON,
  chooseHighNoteWaveform,
  highNoteHeadroom,
  safeFrequency,
  safeMidi,
  scheduleSafeEnvelope,
  scheduleSafeFilterEnvelope,
} from "./audioSafety";
import {
  applyWaveform,
  createNoiseBuffer,
  createSaturationCurve,
  divisionToSeconds,
} from "./waveforms";

const EPSILON = AUDIO_EPSILON;
const bitcrusherCurveCache = new Map();
const reversedBufferCache = new WeakMap();

function safeStop(node, time) {
  try {
    node.stop(time);
  } catch (_) {
    // AudioScheduledSourceNode may already be stopped.
  }
}

function scheduleEnvelope(param, envelope, time, duration, peak = 1) {
  return scheduleSafeEnvelope(param, envelope, time, duration, peak);
}

function createBitcrusherCurve(amount = 0) {
  const bits = Math.max(3, Math.round(16 - Math.max(0, Number(amount) || 0) * 12));
  if (bitcrusherCurveCache.has(bits)) return bitcrusherCurveCache.get(bits);
  const size = 4096;
  const curve = new Float32Array(size);
  const steps = 2 ** bits;
  for (let i = 0; i < size; i += 1) {
    const x = (i / (size - 1)) * 2 - 1;
    curve[i] = Math.round(x * steps) / steps;
  }
  bitcrusherCurveCache.set(bits, curve);
  return curve;
}

function calculateLfoRate(lfo, bpm) {
  if (lfo.sync) {
    const seconds = divisionToSeconds(lfo.division, bpm);
    return seconds > 0 ? 1 / seconds : 1;
  }
  return Math.max(0.01, lfo.rate ?? 1);
}

function attachLfo(context, lfo, patch, targets, time, stopTime, bpm, sourceNodes) {
  if (!lfo?.enabled || Math.abs(lfo.amount ?? 0) < 0.0001) return;
  const oscillator = context.createOscillator();
  const depth = context.createGain();
  applyWaveform(context, oscillator, lfo.waveform || "sine");
  oscillator.frequency.setValueAtTime(calculateLfoRate(lfo, bpm), time);

  const amount = lfo.amount ?? 0;
  switch (lfo.target) {
    case "filter":
      depth.gain.setValueAtTime(Math.max(10, patch.filter1.cutoff * amount * 0.8), time);
      targets.filters.forEach((filter) => depth.connect(filter.frequency));
      break;
    case "amp":
      depth.gain.setValueAtTime(amount * 0.18, time);
      depth.connect(targets.amp.gain);
      break;
    case "pan":
      depth.gain.setValueAtTime(Math.min(1, amount), time);
      if (targets.pan) depth.connect(targets.pan.pan);
      break;
    case "fm":
      depth.gain.setValueAtTime(amount * 100, time);
      targets.oscillators.forEach((oscillatorNode) => depth.connect(oscillatorNode.frequency));
      break;
    case "width":
      depth.gain.setValueAtTime(amount * 0.35, time);
      targets.panners.forEach((panner) => depth.connect(panner.pan));
      break;
    case "pitch":
    default:
      depth.gain.setValueAtTime(amount * 100, time);
      targets.oscillators.forEach((oscillatorNode) => depth.connect(oscillatorNode.detune));
      break;
  }

  oscillator.connect(depth);
  oscillator.start(time);
  safeStop(oscillator, stopTime);
  sourceNodes.push(oscillator);
}

function createVoiceFilter(context, settings, time, midi, brightness = 0) {
  const filter = context.createBiquadFilter();
  filter.type = settings.type || "lowpass";
  const keyMultiplier = 2 ** (((midi - 60) / 12) * (settings.keyTrack ?? 0));
  const brightMultiplier = 0.45 + brightness * 1.25;
  const cutoff = safeFrequency(context, (settings.cutoff ?? 8000) * keyMultiplier * brightMultiplier, 20, 0.44);
  filter.frequency.setValueAtTime(cutoff, time);
  filter.Q.setValueAtTime(Math.max(0.0001, settings.resonance ?? 0.7), time);
  if (["lowshelf", "highshelf", "peaking"].includes(filter.type)) {
    filter.gain.setValueAtTime(settings.gain ?? 0, time);
  }
  return { filter, cutoff };
}

function createChorus(context, source, destination, patch, time, stopTime, sourceNodes) {
  const amount = Math.max(0, Math.min(1, patch.voiceFx.chorus ?? 0));
  if (amount <= 0.001) {
    source.connect(destination);
    return;
  }

  const dry = context.createGain();
  const wet = context.createGain();
  const delay = context.createDelay(0.05);
  const lfo = context.createOscillator();
  const depth = context.createGain();
  dry.gain.setValueAtTime(1, time);
  wet.gain.setValueAtTime(amount * 0.72, time);
  delay.delayTime.setValueAtTime(0.012, time);
  lfo.frequency.setValueAtTime(Math.max(0.02, patch.voiceFx.chorusRate ?? 0.32), time);
  depth.gain.setValueAtTime(Math.max(0.0001, patch.voiceFx.chorusDepth ?? 0.006), time);

  source.connect(dry).connect(destination);
  source.connect(delay).connect(wet).connect(destination);
  lfo.connect(depth).connect(delay.delayTime);
  lfo.start(time);
  safeStop(lfo, stopTime);
  sourceNodes.push(lfo);
}

export function scheduleSynthVoice(
  context,
  destination,
  rawPreset,
  midi,
  velocity,
  time,
  duration,
  transport = {},
) {
  const patch = normalizeSynthPatch(rawPreset);
  const safeNoteMidi = safeMidi(midi, 0, 127);
  const voiceGain = Math.max(0.025, Math.min(1, Number(transport.voiceGain ?? 1)));
  const highNoteGain = highNoteHeadroom(safeNoteMidi);
  const bpm = transport.bpm || 120;
  const noteEnvelope = transport.noteEnvelope || {};
  const transient = Math.max(0, Math.min(1, Number(patch.transient ?? 0.5)));
  const transientScale = 2 ** ((0.5 - transient) * 1.4);
  const ampEnvelope = {
    ...patch.ampEnv,
    attack: Math.max(0.001, (patch.ampEnv.attack ?? 0.008) * transientScale),
    decay: Math.max(0.005, (patch.ampEnv.decay ?? 0.18) * (0.72 + transient * 0.56)),
    ...(Number.isFinite(noteEnvelope.attack) ? { attack: noteEnvelope.attack } : {}),
    ...(Number.isFinite(noteEnvelope.decay) ? { decay: noteEnvelope.decay } : {}),
    ...(Number.isFinite(noteEnvelope.sustain) ? { sustain: noteEnvelope.sustain } : {}),
    ...(Number.isFinite(noteEnvelope.release) ? { release: noteEnvelope.release } : {}),
  };
  const noteGain = Math.max(0.05, Math.min(1.5, Number(noteEnvelope.gain ?? 1)));
  const notePan = Math.max(-1, Math.min(1, Number(noteEnvelope.pan ?? 0)));
  const noteStereo = Math.max(0, Math.min(2, Number(noteEnvelope.stereo ?? 1)));
  const macros = patch.macros;
  const timbre = Math.max(0, Math.min(1, Number(patch.timbre ?? 0.5)));
  const harmonics = Math.max(0, Math.min(1, Number(patch.harmonics ?? 0.22)));
  const character = Math.max(0, Math.min(1, (macros.character ?? 0) * 0.72 + harmonics * 0.28));
  const brightness = Math.max(0, Math.min(1, (macros.brightness ?? 0.5) * 0.72 + timbre * 0.28));
  const motion = Math.max(0, Math.min(1, macros.motion ?? 0));
  const width = Math.max(0, Math.min(2, ((patch.stereo ?? 0.3) * 0.7 + (macros.width ?? 0.4) * 0.6) * noteStereo));
  const safeVelocity = Math.max(0.01, Math.min(1, Number(velocity) || 0.8));
  const velocityAmp = (1 - patch.velocityToAmp) + patch.velocityToAmp * safeVelocity;
  const amp = context.createGain();
  const outputPan = context.createStereoPanner();
  const noteWidthStage = createStereoWidthStage(context);
  const sourceSum = context.createGain();
  const ringNode = context.createGain();
  const preFilterDrive = context.createWaveShaper();
  const crusher = context.createWaveShaper();
  const filterMix = context.createGain();
  const sourceNodes = [];
  const oscillatorNodes = [];
  const panners = [];

  const energyDefinitions = [
    { ...patch.oscA, sourceKind: "core" },
    { ...patch.oscB, sourceKind: "core" },
    { ...patch.oscC, sourceKind: "core" },
    ...(patch.layers || []).map((layer) => ({ ...layer, sourceKind: "layer" })),
  ];
  const baseQualityVoiceCap = transport.quality === "economy" ? 4 : (transport.quality === "studio" ? 9 : 7);
  const complexityScale = Math.max(0.35, Math.min(1, Number(transport.complexityScale ?? 1)));
  // Under heavy multitrack load, reduce duplicated unison oscillators rather
  // than dropping pitch events or allowing the audio callback to underrun.
  const qualityVoiceCap = Math.max(1, Math.floor(baseQualityVoiceCap * complexityScale));
  const highRegisterCap = safeNoteMidi >= 112 ? 1 : (safeNoteMidi >= 100 ? 2 : (safeNoteMidi >= 88 ? 4 : qualityVoiceCap));
  const oscillatorEnergy = energyDefinitions
    .filter((source) => source?.enabled && (source.level ?? 0) > 0)
    .reduce((sum, source) => {
      const requested = Math.max(1, Math.round(source.sourceKind === "layer" ? (source.unison || 1) : (patch.unison || 1)));
      const voices = Math.max(1, Math.min(highRegisterCap, qualityVoiceCap, requested));
      const level = Math.max(0, Number(source.level ?? 0));
      return sum + level * level * voices;
    }, 0);
  const auxiliaryEnergy = (patch.sub?.enabled ? Number(patch.sub.level || 0) ** 2 : 0)
    + (patch.noise?.enabled ? Number(patch.noise.level || 0) ** 2 : 0)
    + (patch.textureLayer?.enabled ? Number(patch.textureLayer.level || 0) ** 2 : 0);
  const sourceNormalization = 1 / Math.sqrt(Math.max(0.36, oscillatorEnergy + auxiliaryEnergy));
  sourceSum.gain.setValueAtTime((patch.softWarm ? 0.44 : 0.48) * sourceNormalization, time);
  ringNode.gain.setValueAtTime(1, time);
  preFilterDrive.curve = createSaturationCurve(
    Math.min(1, (patch.voiceFx.saturation ?? 0) + character * 0.55),
  );
  preFilterDrive.oversample = "4x";
  crusher.curve = createBitcrusherCurve(patch.voiceFx.bitcrush ?? 0);
  crusher.oversample = "none";

  sourceSum.connect(ringNode).connect(preFilterDrive);

  const first = createVoiceFilter(context, patch.filter1, time, safeNoteMidi, brightness);
  const second = createVoiceFilter(context, patch.filter2, time, safeNoteMidi, brightness);
  const activeFilters = [];

  if (patch.filterRouting === "parallel" && patch.filter2.enabled) {
    const firstGain = context.createGain();
    const secondGain = context.createGain();
    firstGain.gain.setValueAtTime(1 - (patch.filterBlend ?? 0.5), time);
    secondGain.gain.setValueAtTime(patch.filterBlend ?? 0.5, time);
    preFilterDrive.connect(first.filter).connect(firstGain).connect(filterMix);
    preFilterDrive.connect(second.filter).connect(secondGain).connect(filterMix);
    activeFilters.push(first.filter, second.filter);
  } else {
    let cursor = preFilterDrive;
    if (patch.filter1.enabled !== false) {
      cursor.connect(first.filter);
      cursor = first.filter;
      activeFilters.push(first.filter);
    }
    if (patch.filter2.enabled) {
      cursor.connect(second.filter);
      cursor = second.filter;
      activeFilters.push(second.filter);
    }
    cursor.connect(filterMix);
  }

  createChorus(context, filterMix, crusher, patch, time, time + duration + ampEnvelope.release + 1, sourceNodes);

  const softTone = patch.softTone || {};
  const lowCut = context.createBiquadFilter();
  const warmthShelf = context.createBiquadFilter();
  const mudDip = context.createBiquadFilter();
  const clarityBell = context.createBiquadFilter();
  const presenceDip = context.createBiquadFilter();
  const velvetShelf = context.createBiquadFilter();
  const airShelf = context.createBiquadFilter();
  const airFilter = context.createBiquadFilter();
  const body = Math.max(0, Math.min(1, Number(patch.body ?? 0.5)));
  const air = Math.max(0, Math.min(1, Number(patch.air ?? 0.42)));
  const highRegisterTame = Math.max(0, Math.min(1, (safeNoteMidi - 84) / 36));

  lowCut.type = "highpass";
  lowCut.frequency.setValueAtTime(Math.max(18, softTone.lowCut ?? 34 + body * 16), time);
  lowCut.Q.setValueAtTime(0.55, time);

  warmthShelf.type = "lowshelf";
  warmthShelf.frequency.setValueAtTime(190, time);
  warmthShelf.gain.setValueAtTime((softTone.warmthDb ?? 0.55) + (body - 0.5) * 1.8, time);

  mudDip.type = "peaking";
  mudDip.frequency.setValueAtTime(softTone.mudFrequency ?? 360, time);
  mudDip.Q.setValueAtTime(0.82, time);
  mudDip.gain.setValueAtTime(softTone.mudDipDb ?? -0.75, time);

  clarityBell.type = "peaking";
  clarityBell.frequency.setValueAtTime(softTone.clarityFrequency ?? 1450, time);
  clarityBell.Q.setValueAtTime(0.72, time);
  clarityBell.gain.setValueAtTime(
    (softTone.clarityDb ?? 0.35) + timbre * 0.18 - highRegisterTame * 0.16,
    time,
  );

  presenceDip.type = "peaking";
  presenceDip.frequency.setValueAtTime(softTone.presenceFrequency ?? 2950, time);
  presenceDip.Q.setValueAtTime(0.78, time);
  presenceDip.gain.setValueAtTime((softTone.presenceDipDb ?? -1.8) - (1 - timbre) * 1.15, time);

  velvetShelf.type = "highshelf";
  velvetShelf.frequency.setValueAtTime(softTone.velvetFrequency ?? 6200, time);
  velvetShelf.gain.setValueAtTime(softTone.velvetDb ?? -0.55, time);

  airShelf.type = "highshelf";
  airShelf.frequency.setValueAtTime(9800, time);
  airShelf.gain.setValueAtTime(
    (softTone.airShelfDb ?? 0.25) + (air - 0.5) * 1.7 - highRegisterTame * 0.65,
    time,
  );

  airFilter.type = "lowpass";
  const requestedAirCutoff = Math.max(7600, (softTone.airCutoff ?? 14500) + (air - 0.5) * 2800);
  airFilter.frequency.setValueAtTime(
    safeFrequency(context, requestedAirCutoff * (1 - highRegisterTame * 0.16), 1200, 0.42),
    time,
  );
  airFilter.Q.setValueAtTime(0.38, time);

  crusher.connect(lowCut).connect(warmthShelf).connect(mudDip).connect(clarityBell).connect(presenceDip).connect(velvetShelf).connect(airShelf).connect(airFilter).connect(amp);
  amp.connect(noteWidthStage.input);
  noteWidthStage.setWidth(width, time);
  noteWidthStage.output.connect(outputPan).connect(destination);

  const envelope = scheduleEnvelope(
    amp.gain,
    ampEnvelope,
    time,
    duration,
    Math.max(0.008, velocityAmp * noteGain * voiceGain * highNoteGain * (softTone.outputTrim ?? 1)),
  );
  outputPan.pan.setValueAtTime(notePan, time);

  const pitchSemitones = Number(patch.pitchSemitones || 0);
  const fineCents = Number(patch.masterTune || 0) + Number(patch.pitchFine || 0);
  const baseFrequency = safeFrequency(context, midiToFrequency(safeNoteMidi + pitchSemitones) * 2 ** (fineCents / 1200), 8, 0.42);
  const oscillatorDefinitions = [
    { ...patch.oscA, sourceKind: "core" },
    { ...patch.oscB, sourceKind: "core" },
    { ...patch.oscC, sourceKind: "core" },
    ...(patch.layers || []).map((layer) => ({ ...layer, sourceKind: "layer" })),
  ];

  oscillatorDefinitions.forEach((oscSettings) => {
    if (!oscSettings?.enabled || (oscSettings.level ?? 0) <= 0) return;
    const requestedUnison = Math.max(1, Math.round(
      oscSettings.sourceKind === "layer" ? (oscSettings.unison || 1) : (patch.unison || 1),
    ));
    const highNoteUnisonLimit = safeNoteMidi >= 112 ? 1 : (safeNoteMidi >= 100 ? 2 : (safeNoteMidi >= 88 ? 4 : qualityVoiceCap));
    const sourceUnison = Math.max(1, Math.min(highNoteUnisonLimit, qualityVoiceCap, requestedUnison));
    const sourceDetune = oscSettings.sourceKind === "layer"
      ? (oscSettings.detune ?? patch.detune ?? 7)
      : (patch.detune ?? 7);
    const sourceStereo = oscSettings.sourceKind === "layer"
      ? Math.max(0, Math.min(1, oscSettings.stereo ?? width))
      : width;
    const sourceStart = time + Math.max(0, Math.min(0.25, oscSettings.delay || 0));

    for (let voiceIndex = 0; voiceIndex < sourceUnison; voiceIndex += 1) {
      const oscillator = context.createOscillator();
      const oscillatorGain = context.createGain();
      const panner = context.createStereoPanner();
      const voicePosition = sourceUnison === 1 ? 0 : voiceIndex / (sourceUnison - 1) * 2 - 1;
      const detuneSpread = voicePosition * sourceDetune;
      const randomDrift = (Math.random() * 2 - 1) * (patch.voiceDrift ?? 0);
      const octave = oscSettings.octave ?? 0;
      const semitone = oscSettings.semitone ?? 0;
      const frequency = safeFrequency(context, baseFrequency * 2 ** ((octave * 12 + semitone) / 12), 8, 0.42);
      const fine = (oscSettings.fine ?? 0) + detuneSpread + randomDrift;

      applyWaveform(context, oscillator, chooseHighNoteWaveform(oscSettings.waveform || "sawtooth", frequency, context));
      oscillator.frequency.setValueAtTime(frequency, sourceStart);
      oscillator.detune.setValueAtTime(fine, sourceStart);
      oscillatorGain.gain.setValueAtTime(
        (Math.max(0, oscSettings.level ?? 0.5) / Math.sqrt(sourceUnison)) * highNoteGain,
        sourceStart,
      );
      panner.pan.setValueAtTime(
        Math.max(-1, Math.min(1, (oscSettings.pan ?? 0) + voicePosition * sourceStereo)),
        sourceStart,
      );

      const pitchAmount = patch.pitchEnv.amount ?? 0;
      if (Math.abs(pitchAmount) > 0.001) {
        oscillator.detune.setValueAtTime(fine + pitchAmount * 100, sourceStart);
        oscillator.detune.linearRampToValueAtTime(
          fine,
          sourceStart + Math.max(0.002, patch.pitchEnv.attack ?? 0.001) + Math.max(0.005, patch.pitchEnv.decay ?? 0.08),
        );
      }

      if (oscSettings.sourceKind === "layer" && (oscSettings.motion ?? 0) > 0.001) {
        const layerLfo = context.createOscillator();
        const detuneDepth = context.createGain();
        const panDepth = context.createGain();
        layerLfo.type = "sine";
        layerLfo.frequency.setValueAtTime(Math.max(0.01, oscSettings.motionRate ?? 0.15), sourceStart);
        detuneDepth.gain.setValueAtTime((oscSettings.motion ?? 0) * 18, sourceStart);
        panDepth.gain.setValueAtTime((oscSettings.motion ?? 0) * 0.22, sourceStart);
        layerLfo.connect(detuneDepth).connect(oscillator.detune);
        layerLfo.connect(panDepth).connect(panner.pan);
        layerLfo.start(sourceStart);
        safeStop(layerLfo, envelope.stopTime);
        sourceNodes.push(layerLfo);
      }

      oscillator.connect(oscillatorGain).connect(panner).connect(sourceSum);
      oscillator.start(sourceStart);
      safeStop(oscillator, envelope.stopTime);
      oscillatorNodes.push(oscillator);
      panners.push(panner);
      sourceNodes.push(oscillator);
    }
  });

  if (patch.sub?.enabled && (patch.sub.level ?? 0) > 0) {
    const sub = context.createOscillator();
    const subGain = context.createGain();
    applyWaveform(context, sub, patch.sub.waveform || "sine");
    sub.frequency.setValueAtTime(safeFrequency(context, baseFrequency * 2 ** (patch.sub.octave ?? -1), 8, 0.42), time);
    subGain.gain.setValueAtTime(patch.sub.level, time);
    sub.connect(subGain).connect(sourceSum);
    sub.start(time);
    safeStop(sub, envelope.stopTime);
    oscillatorNodes.push(sub);
    sourceNodes.push(sub);
  }

  if (patch.noise?.enabled && (patch.noise.level ?? 0) > 0) {
    const noise = context.createBufferSource();
    const noiseGain = context.createGain();
    const noisePan = context.createStereoPanner();
    noise.buffer = createNoiseBuffer(
      context,
      patch.noise.color || "pink",
      Math.max(2, duration + patch.ampEnv.release + 0.2),
    );
    noise.loop = true;
    noiseGain.gain.setValueAtTime(patch.noise.level, time);
    noisePan.pan.setValueAtTime((Math.random() * 2 - 1) * (patch.noise.stereo ?? 0), time);
    noise.connect(noiseGain).connect(noisePan).connect(sourceSum);
    noise.start(time);
    safeStop(noise, envelope.stopTime);
    sourceNodes.push(noise);
  }

  if (patch.textureLayer?.enabled && (patch.textureLayer.level ?? 0) > 0) {
    const texture = context.createBufferSource();
    const textureGain = context.createGain();
    const texturePan = context.createStereoPanner();
    const textureHighpass = context.createBiquadFilter();
    const textureLowpass = context.createBiquadFilter();
    texture.buffer = createNoiseBuffer(
      context,
      patch.textureLayer.color || "pink",
      Math.max(3, duration + patch.ampEnv.release + 0.5),
    );
    texture.loop = true;
    textureHighpass.type = "highpass";
    textureHighpass.frequency.setValueAtTime(safeFrequency(context, Math.max(20, patch.textureLayer.highpass ?? 180), 20, 0.44), time);
    textureHighpass.Q.setValueAtTime(Math.max(0.001, patch.textureLayer.resonance ?? 0.5), time);
    textureLowpass.type = "lowpass";
    textureLowpass.frequency.setValueAtTime(safeFrequency(context, patch.textureLayer.lowpass ?? 9800, 200, 0.44), time);
    textureLowpass.Q.setValueAtTime(Math.max(0.001, patch.textureLayer.resonance ?? 0.5), time);
    textureGain.gain.setValueAtTime(Math.max(0, patch.textureLayer.level ?? 0.035), time);
    texturePan.pan.setValueAtTime(0, time);
    texture.connect(textureHighpass).connect(textureLowpass).connect(textureGain).connect(texturePan).connect(sourceSum);

    if ((patch.textureLayer.motion ?? 0) > 0.001) {
      const textureLfo = context.createOscillator();
      const texturePanDepth = context.createGain();
      const textureFilterDepth = context.createGain();
      textureLfo.type = "sine";
      textureLfo.frequency.setValueAtTime(Math.max(0.01, patch.textureLayer.motionRate ?? 0.09), time);
      texturePanDepth.gain.setValueAtTime(
        Math.min(1, (patch.textureLayer.stereo ?? 0.65) * (patch.textureLayer.motion ?? 0.18)),
        time,
      );
      textureFilterDepth.gain.setValueAtTime(
        Math.max(20, (patch.textureLayer.lowpass ?? 9800) * (patch.textureLayer.motion ?? 0.18) * 0.16),
        time,
      );
      textureLfo.connect(texturePanDepth).connect(texturePan.pan);
      textureLfo.connect(textureFilterDepth).connect(textureLowpass.frequency);
      textureLfo.start(time);
      safeStop(textureLfo, envelope.stopTime);
      sourceNodes.push(textureLfo);
    }

    texture.start(time);
    safeStop(texture, envelope.stopTime);
    sourceNodes.push(texture);
  }

  if (patch.fm?.enabled && (patch.fm.amount ?? 0) > 0 && oscillatorNodes.length) {
    const fmOscillator = context.createOscillator();
    const fmDepth = context.createGain();
    fmOscillator.type = "sine";
    fmOscillator.frequency.setValueAtTime(safeFrequency(context, baseFrequency * Math.max(0.05, patch.fm.ratio ?? 2), 8, 0.42), time);
    fmDepth.gain.setValueAtTime(Math.min(context.sampleRate * 0.12, baseFrequency * (patch.fm.amount ?? 0) * 1.25 * highNoteGain), time);
    fmOscillator.connect(fmDepth);
    oscillatorNodes.forEach((oscillator) => fmDepth.connect(oscillator.frequency));
    fmOscillator.start(time);
    safeStop(fmOscillator, envelope.stopTime);
    sourceNodes.push(fmOscillator);
  }

  if (patch.ring?.enabled && (patch.ring.amount ?? 0) > 0) {
    const ringOscillator = context.createOscillator();
    const ringDepth = context.createGain();
    ringNode.gain.setValueAtTime(1 - patch.ring.amount, time);
    ringOscillator.frequency.setValueAtTime(safeFrequency(context, baseFrequency * Math.max(0.05, patch.ring.ratio ?? 1), 8, 0.42), time);
    ringDepth.gain.setValueAtTime(patch.ring.amount, time);
    ringOscillator.connect(ringDepth).connect(ringNode.gain);
    ringOscillator.start(time);
    safeStop(ringOscillator, envelope.stopTime);
    sourceNodes.push(ringOscillator);
  }

  const filterVelocity = 1 + (velocity - 0.5) * patch.velocityToFilter;
  activeFilters.forEach((filter, index) => {
    const settings = index === 0 ? patch.filter1 : patch.filter2;
    const baseCutoff = index === 0 ? first.cutoff : second.cutoff;
    const amount = (patch.filterEnv.amount ?? 0) * filterVelocity;
    const maxCutoff = Math.max(20, Math.min(20000, baseCutoff * 2 ** (amount * 6)));
    const sustainCutoff = Math.max(20, Math.min(20000, baseCutoff * 2 ** (amount * 6 * (patch.filterEnv.sustain ?? 0.3))));
    scheduleSafeFilterEnvelope(filter.frequency, {
      startValue: Math.max(20, baseCutoff),
      peakValue: safeFrequency(context, maxCutoff, 20, 0.44),
      sustainValue: safeFrequency(context, sustainCutoff, 20, 0.44),
      attack: patch.filterEnv.attack ?? 0.005,
      hold: patch.filterEnv.hold ?? 0,
      decay: patch.filterEnv.decay ?? 0.3,
      release: patch.filterEnv.release ?? 0.4,
      time,
      duration,
    });
    filter.Q.setValueAtTime(Math.max(0.001, Math.min(12, settings.resonance ?? 0.7)), time);
  });

  const targets = {
    amp,
    pan: outputPan,
    filters: activeFilters,
    oscillators: oscillatorNodes,
    panners,
  };
  const lfo1 = { ...patch.lfo1, amount: (patch.lfo1.amount ?? 0) + motion * 0.15 };
  const lfo2 = { ...patch.lfo2, amount: (patch.lfo2.amount ?? 0) + motion * 0.08 };
  attachLfo(context, lfo1, patch, targets, time, envelope.stopTime, bpm, sourceNodes);
  attachLfo(context, lfo2, patch, targets, time, envelope.stopTime, bpm, sourceNodes);
  attachLfo(context, {
    enabled: Math.abs(patch.pitchLfoDepth ?? 0) > 0.0001,
    waveform: "sine",
    rate: Math.max(0.01, patch.pitchLfoRate ?? 5.2),
    sync: false,
    amount: Math.max(-1, Math.min(1, (patch.pitchLfoDepth ?? 0) / 100)),
    target: "pitch",
  }, patch, targets, time, envelope.stopTime, bpm, sourceNodes);

  return {
    startedAt: time,
    endTime: envelope.stopTime,
    midi: safeNoteMidi,
    velocity: safeVelocity,
    cost: Math.max(1, oscillatorNodes.length + Math.ceil(sourceNodes.length * 0.35)),
    priority: safeVelocity * voiceGain * highNoteGain,
    stop(when = context.currentTime) {
      const releaseAt = Math.max(context.currentTime, when);
      try {
        amp.gain.cancelAndHoldAtTime?.(releaseAt);
      } catch (_) {
        amp.gain.cancelScheduledValues(releaseAt);
        amp.gain.setValueAtTime(Math.max(EPSILON, amp.gain.value || EPSILON), releaseAt);
      }
      amp.gain.setTargetAtTime(EPSILON, releaseAt, 0.012);
      sourceNodes.forEach((node) => safeStop(node, releaseAt + 0.07));
    },
  };
}

export function scheduleSampleVoice(
  context,
  destination,
  buffer,
  time,
  velocity = 1,
  trackOrPitch = 0,
  startOffset = 0,
  reverse = false,
) {
  const track = typeof trackOrPitch === "object"
    ? trackOrPitch
    : { pitch: trackOrPitch, startOffset, reverse };
  const source = context.createBufferSource();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  const panner = context.createStereoPanner();
  const widthStage = createStereoWidthStage(context);
  const sample = track.reverse ? reverseBuffer(context, buffer) : buffer;
  const selectedSlice = Number.isInteger(track.sliceIndex)
    ? (track.sampleSlices || [])[track.sliceIndex]
    : null;
  const rawStart = selectedSlice?.start ?? track.startOffset ?? 0;
  const rawEnd = selectedSlice?.end ?? track.endOffset ?? sample.duration;
  const start = Math.max(0, Math.min(sample.duration - 0.01, rawStart));
  const end = Math.max(start + 0.01, Math.min(sample.duration, rawEnd));
  const playbackRate = Math.max(1 / 32, Math.min(32, 2 ** ((track.pitch || 0) / 12)));
  const sliceDuration = end - start;
  const requestedOutputDuration = Number.isFinite(track.noteDurationSeconds)
    ? Math.max(0.01, track.noteDurationSeconds)
    : null;
  const loopEnabled = Boolean(track.sampleLoopEnabled && requestedOutputDuration != null);
  const loopStart = Math.max(start, Math.min(end - 0.005, selectedSlice?.start ?? track.sampleLoopStart ?? start));
  const loopEnd = Math.max(loopStart + 0.005, Math.min(end, selectedSlice?.end ?? track.sampleLoopEnd ?? end));
  const noteEnvelope = track.noteEnvelope || {};
  const gateDuration = requestedOutputDuration == null
    ? Math.max(0.01, sliceDuration / playbackRate)
    : requestedOutputDuration;
  const attack = Math.min(gateDuration * 0.8, Math.max(0.001, noteEnvelope.attack ?? track.sampleAttack ?? 0.001));
  const decay = Math.min(gateDuration * 0.8, Math.max(0.001, noteEnvelope.decay ?? 0.04));
  const sustain = Math.max(0.01, Math.min(1, noteEnvelope.sustain ?? 1));
  const release = Math.max(0.005, Math.min(8, noteEnvelope.release ?? track.sampleRelease ?? 0.04));
  const noteGain = Math.max(0.05, Math.min(1.5, Number(noteEnvelope.gain ?? 1)));
  const voiceGain = Math.max(0.025, Math.min(1, Number(track.voiceGain ?? 1)));
  const peak = Math.max(EPSILON, Math.min(1, Number(velocity) || 0.8) * noteGain * voiceGain);
  const requestedSourceDuration = (gateDuration + release) * playbackRate;
  const sourceDuration = loopEnabled
    ? requestedSourceDuration
    : Math.min(sliceDuration, requestedSourceDuration);

  source.buffer = sample;
  source.loop = loopEnabled;
  if (loopEnabled) {
    source.loopStart = loopStart;
    source.loopEnd = loopEnd;
  }
  source.playbackRate.setValueAtTime(playbackRate, time);
  filter.type = track.sampleFilterType || "lowpass";
  filter.frequency.setValueAtTime(safeFrequency(context, track.sampleCutoff || 20000, 20, 0.44), time);
  filter.Q.setValueAtTime(Math.max(0.001, Math.min(8, track.sampleResonance || 0.2)), time);
  const notePan = Math.max(-1, Math.min(1, Number(noteEnvelope.pan ?? 0)));
  const noteStereo = Math.max(0, Math.min(2, Number(noteEnvelope.stereo ?? 1)));
  panner.pan.setValueAtTime(Math.max(-1, Math.min(1, (track.samplePan || 0) + notePan)), time);
  widthStage.setWidth(noteStereo, time);
  const sampleEnvelope = scheduleSafeEnvelope(gain.gain, {
    attack,
    decay,
    sustain,
    release,
    curve: "exponential",
  }, time, gateDuration, peak);

  source.connect(filter).connect(gain).connect(widthStage.input);
  widthStage.output.connect(panner).connect(destination);
  source.start(time, start, sourceDuration);
  safeStop(source, sampleEnvelope.stopTime);
  return {
    source,
    startedAt: time,
    endTime: sampleEnvelope.stopTime,
    velocity: Math.max(0.01, Math.min(1, Number(velocity) || 0.8)),
    cost: 1,
    priority: Math.max(0.01, Math.min(1, Number(velocity) || 0.8)) * voiceGain,
    stop(when = context.currentTime) {
      const releaseAt = Math.max(context.currentTime, when);
      try { gain.gain.cancelAndHoldAtTime?.(releaseAt); } catch (_) { gain.gain.cancelScheduledValues(releaseAt); }
      gain.gain.setTargetAtTime(EPSILON, releaseAt, 0.01);
      safeStop(source, releaseAt + 0.06);
    },
  };
}

function reverseBuffer(context, buffer) {
  if (reversedBufferCache.has(buffer)) return reversedBufferCache.get(buffer);
  const reversed = context.createBuffer(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate,
  );
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const source = buffer.getChannelData(channel);
    const target = reversed.getChannelData(channel);
    for (let i = 0; i < source.length; i += 1) {
      target[i] = source[source.length - i - 1];
    }
  }
  reversedBufferCache.set(buffer, reversed);
  return reversed;
}
