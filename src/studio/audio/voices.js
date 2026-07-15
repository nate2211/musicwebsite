import { midiToFrequency } from "./musicTheory";
import { normalizeSynthPatch } from "./synthDefaults";
import {
  applyWaveform,
  createNoiseBuffer,
  createSaturationCurve,
  divisionToSeconds,
} from "./waveforms";

const EPSILON = 0.0001;

function safeStop(node, time) {
  try {
    node.stop(time);
  } catch (_) {
    // AudioScheduledSourceNode may already be stopped.
  }
}

function scheduleEnvelope(param, envelope, time, duration, peak = 1) {
  const attack = Math.max(0.001, envelope.attack ?? 0.01);
  const hold = Math.max(0, envelope.hold ?? 0);
  const decay = Math.max(0.001, envelope.decay ?? 0.15);
  const sustain = Math.max(0.001, Math.min(1, envelope.sustain ?? 0.7));
  const release = Math.max(0.01, envelope.release ?? 0.25);
  const noteEnd = time + Math.max(0.02, duration);
  const attackEnd = time + attack;
  const holdEnd = attackEnd + hold;
  const decayEnd = Math.min(noteEnd, holdEnd + decay);

  param.cancelScheduledValues(time);
  param.setValueAtTime(EPSILON, time);
  if (envelope.curve === "linear") {
    param.linearRampToValueAtTime(Math.max(EPSILON, peak), attackEnd);
    param.setValueAtTime(Math.max(EPSILON, peak), holdEnd);
    param.linearRampToValueAtTime(Math.max(EPSILON, peak * sustain), decayEnd);
  } else {
    param.exponentialRampToValueAtTime(Math.max(EPSILON, peak), attackEnd);
    param.setValueAtTime(Math.max(EPSILON, peak), holdEnd);
    param.exponentialRampToValueAtTime(Math.max(EPSILON, peak * sustain), decayEnd);
  }
  param.setValueAtTime(Math.max(EPSILON, peak * sustain), noteEnd);
  param.exponentialRampToValueAtTime(EPSILON, noteEnd + release);
  return { noteEnd, release, stopTime: noteEnd + release + 0.08 };
}

function createBitcrusherCurve(amount = 0) {
  const size = 4096;
  const curve = new Float32Array(size);
  const bits = Math.max(3, Math.round(16 - amount * 12));
  const steps = 2 ** bits;
  for (let i = 0; i < size; i += 1) {
    const x = (i / (size - 1)) * 2 - 1;
    curve[i] = Math.round(x * steps) / steps;
  }
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
  const cutoff = Math.max(20, Math.min(20000, (settings.cutoff ?? 8000) * keyMultiplier * brightMultiplier));
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
  const bpm = transport.bpm || 120;
  const macros = patch.macros;
  const character = Math.max(0, Math.min(1, macros.character ?? 0));
  const brightness = Math.max(0, Math.min(1, macros.brightness ?? 0.5));
  const motion = Math.max(0, Math.min(1, macros.motion ?? 0));
  const width = Math.max(0, Math.min(1, (patch.stereo ?? 0.3) * 0.7 + (macros.width ?? 0.4) * 0.6));
  const velocityAmp = (1 - patch.velocityToAmp) + patch.velocityToAmp * Math.max(0.05, velocity);
  const amp = context.createGain();
  const outputPan = context.createStereoPanner();
  const sourceSum = context.createGain();
  const ringNode = context.createGain();
  const preFilterDrive = context.createWaveShaper();
  const crusher = context.createWaveShaper();
  const filterMix = context.createGain();
  const sourceNodes = [];
  const oscillatorNodes = [];
  const panners = [];

  sourceSum.gain.setValueAtTime(0.58, time);
  ringNode.gain.setValueAtTime(1, time);
  preFilterDrive.curve = createSaturationCurve(
    Math.min(1, (patch.voiceFx.saturation ?? 0) + character * 0.55),
  );
  preFilterDrive.oversample = "4x";
  crusher.curve = createBitcrusherCurve(patch.voiceFx.bitcrush ?? 0);
  crusher.oversample = "none";

  sourceSum.connect(ringNode).connect(preFilterDrive);

  const first = createVoiceFilter(context, patch.filter1, time, midi, brightness);
  const second = createVoiceFilter(context, patch.filter2, time, midi, brightness);
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

  createChorus(context, filterMix, crusher, patch, time, time + duration + patch.ampEnv.release + 1, sourceNodes);
  crusher.connect(amp).connect(outputPan).connect(destination);

  const envelope = scheduleEnvelope(
    amp.gain,
    patch.ampEnv,
    time,
    duration,
    Math.max(0.01, velocityAmp),
  );
  outputPan.pan.setValueAtTime(0, time);

  const baseFrequency = midiToFrequency(midi) * 2 ** ((patch.masterTune || 0) / 1200);
  const unisonCount = Math.max(1, Math.min(9, Math.round(patch.unison || 1)));
  const oscillatorDefinitions = [patch.oscA, patch.oscB, patch.oscC];

  oscillatorDefinitions.forEach((oscSettings) => {
    if (!oscSettings?.enabled || (oscSettings.level ?? 0) <= 0) return;
    for (let voiceIndex = 0; voiceIndex < unisonCount; voiceIndex += 1) {
      const oscillator = context.createOscillator();
      const oscillatorGain = context.createGain();
      const panner = context.createStereoPanner();
      const voicePosition = unisonCount === 1 ? 0 : voiceIndex / (unisonCount - 1) * 2 - 1;
      const detuneSpread = voicePosition * (patch.detune ?? 7);
      const randomDrift = (Math.random() * 2 - 1) * (patch.voiceDrift ?? 0);
      const octave = oscSettings.octave ?? 0;
      const semitone = oscSettings.semitone ?? 0;
      const frequency = baseFrequency * 2 ** ((octave * 12 + semitone) / 12);
      const fine = (oscSettings.fine ?? 0) + detuneSpread + randomDrift;

      applyWaveform(context, oscillator, oscSettings.waveform || "sawtooth");
      oscillator.frequency.setValueAtTime(frequency, time);
      oscillator.detune.setValueAtTime(fine, time);
      oscillatorGain.gain.setValueAtTime(
        Math.max(0, oscSettings.level ?? 0.5) / Math.sqrt(unisonCount),
        time,
      );
      panner.pan.setValueAtTime(
        Math.max(-1, Math.min(1, (oscSettings.pan ?? 0) + voicePosition * width)),
        time,
      );

      const pitchAmount = patch.pitchEnv.amount ?? 0;
      if (Math.abs(pitchAmount) > 0.001) {
        oscillator.detune.setValueAtTime(fine + pitchAmount * 100, time);
        oscillator.detune.linearRampToValueAtTime(
          fine,
          time + Math.max(0.002, patch.pitchEnv.attack ?? 0.001) + Math.max(0.005, patch.pitchEnv.decay ?? 0.08),
        );
      }

      oscillator.connect(oscillatorGain).connect(panner).connect(sourceSum);
      oscillator.start(time);
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
    sub.frequency.setValueAtTime(baseFrequency * 2 ** (patch.sub.octave ?? -1), time);
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

  if (patch.fm?.enabled && (patch.fm.amount ?? 0) > 0 && oscillatorNodes.length) {
    const fmOscillator = context.createOscillator();
    const fmDepth = context.createGain();
    fmOscillator.type = "sine";
    fmOscillator.frequency.setValueAtTime(baseFrequency * Math.max(0.05, patch.fm.ratio ?? 2), time);
    fmDepth.gain.setValueAtTime(baseFrequency * (patch.fm.amount ?? 0) * 1.6, time);
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
    ringOscillator.frequency.setValueAtTime(baseFrequency * Math.max(0.05, patch.ring.ratio ?? 1), time);
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
    const attack = Math.max(0.001, patch.filterEnv.attack ?? 0.005);
    const hold = Math.max(0, patch.filterEnv.hold ?? 0);
    const decay = Math.max(0.005, patch.filterEnv.decay ?? 0.3);
    const release = Math.max(0.01, patch.filterEnv.release ?? 0.4);
    const noteEnd = time + Math.max(0.02, duration);

    filter.frequency.cancelScheduledValues(time);
    filter.frequency.setValueAtTime(Math.max(20, baseCutoff), time);
    filter.frequency.exponentialRampToValueAtTime(maxCutoff, time + attack);
    filter.frequency.setValueAtTime(maxCutoff, time + attack + hold);
    filter.frequency.exponentialRampToValueAtTime(sustainCutoff, time + attack + hold + decay);
    filter.frequency.setValueAtTime(sustainCutoff, noteEnd);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, baseCutoff), noteEnd + release);
    filter.Q.setValueAtTime(Math.max(0.001, settings.resonance ?? 0.7), time);
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

  return {
    stop(when = context.currentTime) {
      amp.gain.cancelScheduledValues(when);
      amp.gain.setTargetAtTime(EPSILON, when, 0.015);
      sourceNodes.forEach((node) => safeStop(node, when + 0.08));
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
  const sample = track.reverse ? reverseBuffer(context, buffer) : buffer;
  const start = Math.max(0, Math.min(sample.duration - 0.01, track.startOffset || 0));
  const end = Math.max(start + 0.01, Math.min(sample.duration, track.endOffset || sample.duration));
  const duration = end - start;
  const attack = Math.max(0.001, track.sampleAttack ?? 0.001);
  const release = Math.max(0.005, track.sampleRelease ?? 0.04);

  source.buffer = sample;
  source.playbackRate.setValueAtTime(2 ** ((track.pitch || 0) / 12), time);
  filter.type = track.sampleFilterType || "lowpass";
  filter.frequency.setValueAtTime(track.sampleCutoff || 20000, time);
  filter.Q.setValueAtTime(track.sampleResonance || 0.2, time);
  panner.pan.setValueAtTime(track.samplePan || 0, time);
  gain.gain.setValueAtTime(EPSILON, time);
  gain.gain.exponentialRampToValueAtTime(Math.max(EPSILON, velocity), time + attack);
  gain.gain.setValueAtTime(Math.max(EPSILON, velocity), time + Math.max(attack, duration - release));
  gain.gain.exponentialRampToValueAtTime(EPSILON, time + duration);

  source.connect(filter).connect(gain).connect(panner).connect(destination);
  source.start(time, start, duration);
  safeStop(source, time + duration + 0.05);
  return source;
}

function reverseBuffer(context, buffer) {
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
  return reversed;
}
