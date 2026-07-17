import { createSaturationCurve, divisionToSeconds } from "./waveforms";
import { equalPowerGains, safeFrequency, smoothAudioParam, smoothCachedParam } from "./audioSafety";
import { createStereoPannerCompat } from "./browserAudioCompat";

export function distortionCurve(amount = 0) {
  return createSaturationCurve(amount);
}

function createTransparentCeilingCurve(ceiling = 0.955) {
  const size = 8192;
  const curve = new Float32Array(size);
  const safeCeiling = Math.max(0.75, Math.min(0.995, ceiling));
  const knee = safeCeiling * 0.8;
  const room = Math.max(0.000001, safeCeiling - knee);
  for (let index = 0; index < size; index += 1) {
    const x = index / (size - 1) * 2 - 1;
    const sign = x < 0 ? -1 : 1;
    const magnitude = Math.abs(x);
    curve[index] = magnitude <= knee
      ? x
      : sign * Math.min(safeCeiling, knee + room * (1 - Math.exp(-(magnitude - knee) / room)));
  }
  return curve;
}

const ROOM_PRESETS = {
  booth: { seconds: 0.38, decay: 1.35, damp: 7200, preDelay: 0.004 },
  studio: { seconds: 0.82, decay: 1.75, damp: 9000, preDelay: 0.008 },
  chamber: { seconds: 1.65, decay: 2.35, damp: 7800, preDelay: 0.016 },
  hall: { seconds: 2.85, decay: 2.75, damp: 6900, preDelay: 0.024 },
  cathedral: { seconds: 4.6, decay: 3.35, damp: 6100, preDelay: 0.038 },
  plate: { seconds: 2.15, decay: 2.05, damp: 11200, preDelay: 0.011 },
  spring: { seconds: 1.35, decay: 1.55, damp: 8200, preDelay: 0.006 },
  ambient: { seconds: 5.8, decay: 4.1, damp: 5400, preDelay: 0.052 },
};

const IMPULSE_CACHE = new WeakMap();

function cachedRoomImpulse(context, room) {
  let roomMap = IMPULSE_CACHE.get(context);
  if (!roomMap) {
    roomMap = new Map();
    IMPULSE_CACHE.set(context, roomMap);
  }
  if (!roomMap.has(room)) {
    const settings = roomPreset(room);
    roomMap.set(room, createImpulse(context, settings.seconds, settings.decay, false, settings.damp));
  }
  return roomMap.get(room);
}

export function createImpulse(context, seconds = 2.4, decay = 2.6, reverse = false, damping = 9000) {
  const length = Math.max(32, Math.floor(context.sampleRate * seconds));
  const impulse = context.createBuffer(2, length, context.sampleRate);
  const dampingRatio = Math.max(0.05, Math.min(1, damping / 20000));
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    let smoothed = 0;
    for (let index = 0; index < length; index += 1) {
      const position = reverse ? length - index : index;
      const envelope = (1 - position / length) ** decay;
      const noise = Math.random() * 2 - 1;
      smoothed += (noise - smoothed) * dampingRatio;
      data[index] = smoothed * envelope * (channel ? 0.94 : 1);
    }
  }
  return impulse;
}

export function roomPreset(name = "studio") {
  return ROOM_PRESETS[name] || ROOM_PRESETS.studio;
}

export function createStereoWidthStage(context) {
  const input = context.createGain();
  input.channelCount = 2;
  input.channelCountMode = "explicit";
  input.channelInterpretation = "speakers";
  const output = context.createGain();
  const splitter = context.createChannelSplitter(2);
  const merger = context.createChannelMerger(2);
  const leftDirect = context.createGain();
  const rightDirect = context.createGain();
  const leftCross = context.createGain();
  const rightCross = context.createGain();

  input.connect(splitter);
  splitter.connect(leftDirect, 0).connect(merger, 0, 0);
  splitter.connect(leftCross, 0).connect(merger, 0, 1);
  splitter.connect(rightCross, 1).connect(merger, 0, 0);
  splitter.connect(rightDirect, 1).connect(merger, 0, 1);
  merger.connect(output);

  let lastWidth = Number.NaN;
  return {
    input,
    output,
    setWidth(width = 1, time = 0) {
      const safe = Math.max(0, Math.min(2, Number(width) || 0));
      if (Number.isFinite(lastWidth) && Math.abs(lastWidth - safe) < 0.0005) return;
      lastWidth = safe;
      const direct = (1 + safe) * 0.5;
      const cross = (1 - safe) * 0.5;
      [leftDirect.gain, rightDirect.gain].forEach((param) => smoothAudioParam(param, direct, time, 0.018));
      [leftCross.gain, rightCross.gain].forEach((param) => smoothAudioParam(param, cross, time, 0.018));
    },
  };
}

function createMultibandStage(context) {
  const input = context.createGain();
  const output = context.createGain();
  const dry = context.createGain();
  const wet = context.createGain();
  const wetInput = context.createGain();
  const sum = context.createGain();
  wetInput.gain.value = 0;

  // Cascaded Butterworth sections produce Linkwitz-Riley-style 4th-order
  // crossovers, which keep the three bands phase-aligned and avoid the hollow
  // or warped sound caused by single-filter parallel splits.
  const lowFilter = context.createBiquadFilter();
  const lowFilter2 = context.createBiquadFilter();
  const lowComp = context.createDynamicsCompressor();
  const lowGain = context.createGain();
  lowFilter.type = "lowpass";
  lowFilter2.type = "lowpass";

  const midHighpass = context.createBiquadFilter();
  const midHighpass2 = context.createBiquadFilter();
  const midLowpass = context.createBiquadFilter();
  const midLowpass2 = context.createBiquadFilter();
  const midComp = context.createDynamicsCompressor();
  const midGain = context.createGain();
  midHighpass.type = "highpass";
  midHighpass2.type = "highpass";
  midLowpass.type = "lowpass";
  midLowpass2.type = "lowpass";

  const highFilter = context.createBiquadFilter();
  const highFilter2 = context.createBiquadFilter();
  const highComp = context.createDynamicsCompressor();
  const highGain = context.createGain();
  highFilter.type = "highpass";
  highFilter2.type = "highpass";

  [lowFilter, lowFilter2, midHighpass, midHighpass2, midLowpass, midLowpass2, highFilter, highFilter2]
    .forEach((filter) => { filter.Q.value = Math.SQRT1_2; });

  input.connect(dry).connect(output);
  input.connect(wetInput);
  wetInput.connect(lowFilter).connect(lowFilter2).connect(lowComp).connect(lowGain).connect(sum);
  wetInput.connect(midHighpass).connect(midHighpass2).connect(midLowpass).connect(midLowpass2).connect(midComp).connect(midGain).connect(sum);
  wetInput.connect(highFilter).connect(highFilter2).connect(highComp).connect(highGain).connect(sum);
  sum.connect(wet).connect(output);

  return {
    input,
    output,
    dry,
    wet,
    wetInput,
    lowFilter,
    lowFilter2,
    lowComp,
    lowGain,
    midHighpass,
    midHighpass2,
    midLowpass,
    midLowpass2,
    midComp,
    midGain,
    highFilter,
    highFilter2,
    highComp,
    highGain,
  };
}

function configureCompressor(strip, node, settings, prefix, time) {
  smoothCachedParam(strip, `${prefix}.threshold`, node.threshold, settings[`${prefix}Threshold`] ?? -20, time, 0.035);
  smoothCachedParam(strip, `${prefix}.ratio`, node.ratio, settings[`${prefix}Ratio`] ?? 2.5, time, 0.035);
  smoothCachedParam(strip, `${prefix}.attack`, node.attack, settings[`${prefix}Attack`] ?? 0.012, time, 0.035);
  smoothCachedParam(strip, `${prefix}.release`, node.release, settings[`${prefix}Release`] ?? 0.18, time, 0.04);
  smoothCachedParam(strip, `${prefix}.knee`, node.knee, settings[`${prefix}Knee`] ?? 10, time, 0.035);
}

function createRoomSlot(context, room = "studio", initialize = true) {
  const convolver = context.createConvolver();
  const tone = context.createBiquadFilter();
  const wet = context.createGain();
  const settings = roomPreset(room);
  tone.type = "lowpass";
  tone.frequency.value = settings.damp;
  wet.gain.value = 0;
  convolver.buffer = initialize ? cachedRoomImpulse(context, room) : null;
  convolver.connect(tone).connect(wet);
  return { convolver, tone, wet, room };
}

function createDriveSlot(context, amount = 0) {
  const shaper = context.createWaveShaper();
  const wet = context.createGain();
  shaper.curve = distortionCurve(amount);
  shaper.oversample = "4x";
  wet.gain.value = 0;
  shaper.connect(wet);
  return { shaper, wet, amount };
}

export function createChannelStrip(context, destination) {
  const input = context.createGain();
  const inputTrim = context.createGain();
  const timeGate = context.createGain();
  const highpass = context.createBiquadFilter();
  const lowpass = context.createBiquadFilter();
  const low = context.createBiquadFilter();
  const mid = context.createBiquadFilter();
  const high = context.createBiquadFilter();
  const multiband = createMultibandStage(context);
  const compressor = context.createDynamicsCompressor();
  const makeup = context.createGain();
  const driveInput = context.createGain();
  const driveSum = context.createGain();
  const driveSlots = [createDriveSlot(context, 0), createDriveSlot(context, 0)];
  const dry = context.createGain();
  const pan = createStereoPannerCompat(context);
  const gain = context.createGain();
  const widthStage = createStereoWidthStage(context);
  const fxSum = context.createGain();
  const fxHeadroom = context.createGain();
  const fxGuard = context.createDynamicsCompressor();
  const safetyHighpass = context.createBiquadFilter();
  const safetyLowpass = context.createBiquadFilter();
  const safetyLimiter = context.createDynamicsCompressor();
  const safetyClipper = context.createWaveShaper();
  const safetyCeiling = context.createGain();

  highpass.type = "highpass";
  lowpass.type = "lowpass";
  low.type = "lowshelf";
  mid.type = "peaking";
  high.type = "highshelf";
  low.frequency.value = 120;
  mid.frequency.value = 1200;
  mid.Q.value = 0.8;
  high.frequency.value = 7000;

  safetyHighpass.type = "highpass";
  safetyHighpass.frequency.value = 12;
  safetyHighpass.Q.value = 0.55;
  safetyLowpass.type = "lowpass";
  safetyLowpass.frequency.value = safeFrequency(context, 20000, 1000, 0.45);
  safetyLowpass.Q.value = 0.42;
  safetyLimiter.threshold.value = -3;
  safetyLimiter.knee.value = 1.5;
  safetyLimiter.ratio.value = 10;
  safetyLimiter.attack.value = 0.004;
  safetyLimiter.release.value = 0.14;
  fxGuard.threshold.value = -7;
  fxGuard.knee.value = 9;
  fxGuard.ratio.value = 3.2;
  fxGuard.attack.value = 0.004;
  fxGuard.release.value = 0.12;
  safetyClipper.curve = createTransparentCeilingCurve(0.955);
  safetyClipper.oversample = "4x";
  safetyCeiling.gain.value = 0.985;

  driveSlots[0].wet.gain.value = 1;
  driveInput.connect(driveSlots[0].shaper);
  driveInput.connect(driveSlots[1].shaper);
  driveSlots[0].wet.connect(driveSum);
  driveSlots[1].wet.connect(driveSum);

  const chorusSend = context.createGain();
  const chorusDelay = context.createDelay(0.05);
  const chorusWet = context.createGain();
  chorusSend.gain.value = 0;
  const chorusLfo = context.createOscillator();
  const chorusDepth = context.createGain();
  chorusDelay.delayTime.value = 0.012;
  chorusLfo.frequency.value = 0.25;
  chorusDepth.gain.value = 0.006;
  chorusLfo.connect(chorusDepth).connect(chorusDelay.delayTime);
  chorusLfo.start();

  const delaySend = context.createGain();
  const delay = context.createDelay(4);
  const feedback = context.createGain();
  delaySend.gain.value = 0;
  const feedbackHighpass = context.createBiquadFilter();
  const feedbackLowpass = context.createBiquadFilter();
  const delayTone = context.createBiquadFilter();
  const delayWet = context.createGain();
  feedbackHighpass.type = "highpass";
  feedbackHighpass.frequency.value = 120;
  feedbackHighpass.Q.value = 0.55;
  feedbackLowpass.type = "lowpass";
  feedbackLowpass.frequency.value = 9000;
  feedbackLowpass.Q.value = 0.55;
  delayTone.type = "lowpass";

  const reverbSend = context.createGain();
  const reverbPreDelay = context.createDelay(0.2);
  const reverbSlots = [createRoomSlot(context, "studio", true), createRoomSlot(context, "studio", false)];
  reverbSend.gain.value = 0;
  reverbSlots[0].wet.gain.value = 0;
  reverbPreDelay.connect(reverbSlots[0].convolver);
  reverbPreDelay.connect(reverbSlots[1].convolver);

  input
    .connect(inputTrim)
    .connect(timeGate)
    .connect(highpass)
    .connect(lowpass)
    .connect(low)
    .connect(mid)
    .connect(high)
    .connect(multiband.input);
  multiband.output.connect(compressor).connect(makeup).connect(driveInput);

  driveSum.connect(dry).connect(fxSum);
  driveSum.connect(chorusSend).connect(chorusDelay).connect(chorusWet).connect(fxSum);
  driveSum.connect(delaySend).connect(delay);
  delay.connect(feedbackHighpass).connect(feedbackLowpass).connect(feedback).connect(delay);
  delay.connect(delayTone).connect(delayWet).connect(fxSum);
  driveSum.connect(reverbSend).connect(reverbPreDelay);
  reverbSlots.forEach((slot) => slot.wet.connect(fxSum));
  fxSum.connect(fxHeadroom).connect(fxGuard).connect(widthStage.input);
  widthStage.output
    .connect(pan)
    .connect(gain)
    .connect(safetyHighpass)
    .connect(safetyLowpass)
    .connect(safetyLimiter)
    .connect(safetyClipper)
    .connect(safetyCeiling)
    .connect(destination);

  return {
    input,
    inputTrim,
    timeGate,
    highpass,
    lowpass,
    low,
    mid,
    high,
    multiband,
    compressor,
    makeup,
    drive: driveSlots[0].shaper,
    driveInput,
    driveSum,
    driveSlots,
    activeDriveSlot: 0,
    driveAmount: 0,
    dry,
    pan,
    gain,
    widthStage,
    fxSum,
    fxHeadroom,
    fxGuard,
    safetyHighpass,
    safetyLowpass,
    safetyLimiter,
    safetyClipper,
    safetyCeiling,
    chorusSend,
    chorusDelay,
    chorusWet,
    chorusLfo,
    chorusDepth,
    delaySend,
    delay,
    feedback,
    feedbackHighpass,
    feedbackLowpass,
    delayTone,
    delayWet,
    reverbSend,
    reverbPreDelay,
    reverb: reverbSlots[0].convolver,
    reverbTone: reverbSlots[0].tone,
    reverbWet: reverbSlots[0].wet,
    reverbSlots,
    activeRoomSlot: 0,
    roomKey: "studio",
    parameterCache: new Map(),
  };
}

function updateDrive(strip, amount, time) {
  const safeAmount = Math.max(0, Math.min(1, Number(amount) || 0));
  if (Math.abs((strip.driveAmount ?? -1) - safeAmount) < 0.0005) return;
  const nextIndex = strip.activeDriveSlot === 0 ? 1 : 0;
  const previous = strip.driveSlots[strip.activeDriveSlot];
  const next = strip.driveSlots[nextIndex];
  next.shaper.curve = distortionCurve(safeAmount);
  next.shaper.oversample = "4x";
  smoothAudioParam(previous.wet.gain, 0, time, 0.018);
  smoothAudioParam(next.wet.gain, 1, time, 0.018);
  strip.activeDriveSlot = nextIndex;
  strip.drive = next.shaper;
  strip.driveAmount = safeAmount;
}

function updateRoom(strip, room, mix, damping, time) {
  const settings = roomPreset(room);
  if (strip.roomKey !== room) {
    const nextIndex = strip.activeRoomSlot === 0 ? 1 : 0;
    const previous = strip.reverbSlots[strip.activeRoomSlot];
    const next = strip.reverbSlots[nextIndex];
    next.convolver.buffer = cachedRoomImpulse(contextOf(strip), room);
    next.room = room;
    smoothAudioParam(previous.wet.gain, 0, time, 0.045);
    smoothAudioParam(next.wet.gain, mix, time, 0.045);
    strip.parameterCache.set(`reverb.${strip.activeRoomSlot}.mix`, 0);
    strip.parameterCache.set(`reverb.${nextIndex}.mix`, mix);
    strip.activeRoomSlot = nextIndex;
    strip.roomKey = room;
    strip.reverb = next.convolver;
    strip.reverbTone = next.tone;
    strip.reverbWet = next.wet;
  } else {
    strip.reverbSlots.forEach((slot, index) => {
      smoothCachedParam(strip, `reverb.${index}.mix`, slot.wet.gain, index === strip.activeRoomSlot ? mix : 0, time, 0.04);
    });
  }
  strip.reverbSlots.forEach((slot, index) => {
    smoothCachedParam(strip, `reverb.${index}.damping`, slot.tone.frequency, damping, time, 0.045, 0.5);
  });
}

export function updateChannelStrip(strip, track, time = 0, bpm = 120) {
  const mixer = track.mixer || {};
  const effects = track.effects || {};
  const context = contextOf(strip);
  const when = Math.max(context.currentTime, Number(time) || context.currentTime);
  const set = (key, param, value, constant = 0.025, tolerance = 0.0001) => (
    smoothCachedParam(strip, key, param, value, when, constant, tolerance)
  );
  const eqEnabled = effects.eqEnabled !== false;
  const mbEnabled = Boolean(effects.multibandEnabled);
  const delayEnabled = effects.delayEnabled !== false;
  const reverbEnabled = effects.reverbEnabled !== false;
  const stereoEnabled = effects.stereoEnabled !== false;

  set("input.gain", strip.inputTrim.gain, effects.inputGain ?? 1, 0.025);
  if (!effects.timeShaperEnabled) set("time.gate", strip.timeGate.gain, 1, 0.018);
  set("mixer.volume", strip.gain.gain, track.mute ? 0 : Math.max(0, mixer.volume ?? 0.8), 0.025);
  set("mixer.pan", strip.pan.pan, Math.max(-1, Math.min(1, (mixer.pan ?? 0) + (effects.stereoPan ?? 0))), 0.03);
  strip.widthStage.setWidth(stereoEnabled ? Math.max(0, Math.min(track.type === "master" ? 1.3 : 1.6, effects.stereoWidth ?? 1)) : 1, when);

  set("eq.highpass", strip.highpass.frequency, safeFrequency(context, eqEnabled ? (effects.highpass ?? 20) : 20, 10, 0.45), 0.035, 0.5);
  set("eq.lowpass", strip.lowpass.frequency, safeFrequency(context, eqEnabled ? (effects.lowpass ?? 20000) : 20000, 200, 0.45), 0.035, 0.5);
  set("eq.low.frequency", strip.low.frequency, effects.lowFrequency ?? 120, 0.035, 0.5);
  set("eq.low.gain", strip.low.gain, eqEnabled ? (effects.lowGain ?? 0) : 0, 0.03);
  set("eq.mid.gain", strip.mid.gain, eqEnabled ? (effects.midGain ?? 0) : 0, 0.03);
  set("eq.mid.frequency", strip.mid.frequency, safeFrequency(context, effects.midFrequency ?? 1200, 40, 0.45), 0.035, 0.5);
  set("eq.mid.q", strip.mid.Q, Math.max(0.05, Math.min(18, effects.midQ ?? 0.8)), 0.035);
  set("eq.high.frequency", strip.high.frequency, safeFrequency(context, effects.highFrequency ?? 7000, 500, 0.45), 0.035, 0.5);
  set("eq.high.gain", strip.high.gain, eqEnabled ? (effects.highGain ?? 0) : 0, 0.03);

  const lowCross = Math.max(70, Math.min(900, effects.multibandLowCross ?? 180));
  const highCross = Math.max(lowCross + 300, Math.min(12000, effects.multibandHighCross ?? 3200));
  set("mb.low.cross", strip.multiband.lowFilter.frequency, lowCross, 0.055, 0.5);
  set("mb.low.cross.2", strip.multiband.lowFilter2.frequency, lowCross, 0.055, 0.5);
  set("mb.mid.highpass", strip.multiband.midHighpass.frequency, lowCross, 0.055, 0.5);
  set("mb.mid.highpass.2", strip.multiband.midHighpass2.frequency, lowCross, 0.055, 0.5);
  set("mb.mid.lowpass", strip.multiband.midLowpass.frequency, highCross, 0.055, 0.5);
  set("mb.mid.lowpass.2", strip.multiband.midLowpass2.frequency, highCross, 0.055, 0.5);
  set("mb.high.cross", strip.multiband.highFilter.frequency, highCross, 0.055, 0.5);
  set("mb.high.cross.2", strip.multiband.highFilter2.frequency, highCross, 0.055, 0.5);
  configureCompressor(strip, strip.multiband.lowComp, effects, "multibandLow", when);
  configureCompressor(strip, strip.multiband.midComp, effects, "multibandMid", when);
  configureCompressor(strip, strip.multiband.highComp, effects, "multibandHigh", when);
  set("mb.low.makeup", strip.multiband.lowGain.gain, effects.multibandLowMakeup ?? 1, 0.035);
  set("mb.mid.makeup", strip.multiband.midGain.gain, effects.multibandMidMakeup ?? 1, 0.035);
  set("mb.high.makeup", strip.multiband.highGain.gain, effects.multibandHighMakeup ?? 1, 0.035);
  const multibandMix = mbEnabled ? Math.max(0, Math.min(1, effects.multibandMix ?? 1)) : 0;
  const multibandBlend = equalPowerGains(multibandMix);
  // The expensive three-band branch receives silence while bypassed. The old
  // graph continued filtering/compressing every track even at 0% wet.
  set("mb.input", strip.multiband.wetInput.gain, multibandMix > 0.0005 ? 1 : 0, 0.045);
  set("mb.dry", strip.multiband.dry.gain, multibandBlend.dry, 0.055);
  set("mb.wet", strip.multiband.wet.gain, multibandBlend.wet, 0.055);

  set("comp.threshold", strip.compressor.threshold, effects.compThreshold ?? -18, 0.035);
  set("comp.knee", strip.compressor.knee, effects.compKnee ?? 8, 0.035);
  set("comp.ratio", strip.compressor.ratio, effects.compEnabled === false ? 1 : (effects.compRatio ?? 3), 0.035);
  set("comp.attack", strip.compressor.attack, effects.compAttack ?? 0.01, 0.035);
  set("comp.release", strip.compressor.release, effects.compRelease ?? 0.2, 0.04);
  set("comp.makeup", strip.makeup.gain, effects.compEnabled === false ? 1 : (effects.makeupGain ?? 1), 0.03);

  updateDrive(strip, effects.saturationEnabled === false ? 0 : (effects.drive ?? 0), when);
  const chorusMix = effects.chorusEnabled === false ? 0 : Math.max(0, Math.min(1, effects.chorusMix ?? 0));
  set("chorus.send", strip.chorusSend.gain, chorusMix > 0.0005 ? 1 : 0, 0.025);
  set("chorus.mix", strip.chorusWet.gain, chorusMix, 0.03);
  set("chorus.rate", strip.chorusLfo.frequency, chorusMix > 0.0005 ? (effects.chorusRate ?? 0.25) : 0.01, 0.04);
  set("chorus.depth", strip.chorusDepth.gain, chorusMix > 0.0005 ? (effects.chorusDepth ?? 0.006) : 0.00001, 0.04);

  const delaySeconds = effects.delaySync
    ? divisionToSeconds(effects.delayDivision || "1/4", bpm)
    : (effects.delayTime ?? 0.25);
  const delayMix = delayEnabled ? Math.max(0, Math.min(1, effects.delayMix ?? 0)) : 0;
  const delayActive = delayMix > 0.0005;
  set("delay.send", strip.delaySend.gain, delayActive ? 1 : 0, 0.025);
  set("delay.time", strip.delay.delayTime, Math.max(0.01, Math.min(3.8, delaySeconds)), 0.055, 0.0005);
  set("delay.feedback", strip.feedback.gain, delayActive ? Math.max(0, Math.min(0.84, effects.delayFeedback ?? 0.18)) : 0, 0.06);
  set("delay.feedback.hp", strip.feedbackHighpass.frequency, safeFrequency(context, effects.delayFeedbackHighpass ?? 120, 30, 0.4), 0.06, 0.5);
  set("delay.feedback.lp", strip.feedbackLowpass.frequency, safeFrequency(context, effects.delayTone ?? 7600, 500, 0.42), 0.06, 0.5);
  set("delay.tone", strip.delayTone.frequency, safeFrequency(context, effects.delayTone ?? 7600, 300, 0.44), 0.055, 0.5);
  set("delay.mix", strip.delayWet.gain, delayActive ? Math.sin(delayMix * Math.PI * 0.5) * 0.72 : 0, 0.055);

  const room = effects.reverbRoom || "studio";
  const roomSettings = roomPreset(room);
  set("reverb.predelay", strip.reverbPreDelay.delayTime, effects.reverbPreDelay ?? roomSettings.preDelay, 0.045);
  const reverbMix = reverbEnabled ? Math.max(0, Math.min(1, effects.reverbMix ?? 0)) : 0;
  const reverbActive = reverbMix > 0.0005;
  set("reverb.send", strip.reverbSend.gain, reverbActive ? 1 : 0, 0.03);
  updateRoom(
    strip,
    room,
    reverbActive ? Math.sin(reverbMix * Math.PI * 0.5) * 0.72 : 0,
    safeFrequency(context, effects.reverbDamping ?? roomSettings.damp, 300, 0.44),
    when,
  );
  const chorusReturn = chorusMix;
  const delayReturn = delayMix;
  const reverbReturn = reverbMix;
  const parallelEnergy = 1 + chorusReturn ** 2 + delayReturn ** 2 + reverbReturn ** 2;
  set("dry.gain", strip.dry.gain, 1, 0.04);
  set("fx.headroom", strip.fxHeadroom.gain, 1 / Math.sqrt(parallelEnergy), 0.07);

  const isMaster = track.type === "master";
  set("safety.hp", strip.safetyHighpass.frequency, isMaster ? 16 : 12, 0.04, 0.2);
  set("safety.lp", strip.safetyLowpass.frequency, safeFrequency(context, isMaster ? 19800 : 20000, 1000, 0.45), 0.04, 0.5);
  set("safety.threshold", strip.safetyLimiter.threshold, isMaster ? -1.4 : -3, 0.035);
  set("safety.ratio", strip.safetyLimiter.ratio, isMaster ? 14 : 10, 0.035);
  set("safety.attack", strip.safetyLimiter.attack, isMaster ? 0.003 : 0.004, 0.035);
  set("safety.release", strip.safetyLimiter.release, isMaster ? 0.16 : 0.14, 0.055);
  set("fx.guard.threshold", strip.fxGuard.threshold, isMaster ? -6 : -8, 0.055);
  set("fx.guard.ratio", strip.fxGuard.ratio, isMaster ? 3.8 : 3.2, 0.055);
  set("fx.guard.attack", strip.fxGuard.attack, isMaster ? 0.003 : 0.004, 0.055);
  set("fx.guard.release", strip.fxGuard.release, isMaster ? 0.14 : 0.12, 0.065);
  set("safety.ceiling", strip.safetyCeiling.gain, isMaster ? 0.965 : 0.985, 0.055);
}

function contextOf(strip) {
  return strip.input.context;
}

const TIME_PATTERNS = {
  straight: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  half: [1, 1, 1, 1, 1, 1, 1, 1, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12],
  gate: [1, 0.08, 1, 0.08, 1, 0.08, 1, 0.08, 1, 0.08, 1, 0.08, 1, 0.08, 1, 0.08],
  triplet: [1, 0.16, 0.16, 1, 0.16, 0.16, 1, 0.16, 0.16, 1, 0.16, 0.16],
  stutter: [1, 0.2, 0.72, 0.12, 1, 0.2, 0.46, 0.12, 1, 0.2, 0.72, 0.12, 1, 0.2, 0.46, 0.12],
  sidechain: [0.18, 0.42, 0.68, 0.88, 1, 1, 1, 1, 0.18, 0.42, 0.68, 0.88, 1, 1, 1, 1],
  pulse: [1, 0.35, 0.55, 0.35, 1, 0.35, 0.55, 0.35, 1, 0.35, 0.55, 0.35, 1, 0.35, 0.55, 0.35],
};

export function applyTimeShaperAtStep(strip, settings = {}, step = 0, time = 0, stepSeconds = 0.1) {
  if (!strip?.timeGate) return;
  if (!settings.timeShaperEnabled) {
    strip.timeGate.gain.setTargetAtTime(1, time, 0.006);
    return;
  }
  const pattern = TIME_PATTERNS[settings.timeShaperPattern] || TIME_PATTERNS.gate;
  const rate = Math.max(1, Math.min(4, Math.round(settings.timeShaperRate || 1)));
  const index = Math.floor(step * rate) % pattern.length;
  const shape = pattern[index];
  const mix = Math.max(0, Math.min(1, settings.timeShaperMix ?? 1));
  const depth = Math.max(0, Math.min(1, settings.timeShaperDepth ?? 0.85));
  const floor = 1 - depth;
  const target = (1 - mix) + mix * (floor + shape * depth);
  const smooth = Math.max(0.001, Math.min(stepSeconds * 0.45, settings.timeShaperSmooth ?? 0.012));
  smoothAudioParam(strip.timeGate.gain, Math.max(0.0001, target), time, smooth);
}

export function pitchShiftSemitones(track) {
  const effects = track?.effects || {};
  return effects.pitchShiftEnabled === false ? 0 : Number(effects.pitchShiftSemitones || 0);
}

export function masterTrackFromProject(project) {
  const master = project.master || {};
  return {
    id: "master-output",
    type: "master",
    mute: false,
    mixer: {
      volume: (project.masterVolume ?? 0.85) * (10 ** ((master.limiterCeiling ?? -1) / 20)),
      pan: 0,
    },
    effects: {
      inputGain: master.inputGain ?? 1,
      eqEnabled: master.eqEnabled !== false,
      highpass: master.highpass ?? 24,
      lowpass: master.lowpass ?? 19500,
      lowGain: master.lowGain ?? 0.45,
      lowFrequency: master.lowFrequency ?? 145,
      midGain: master.midGain ?? -0.9,
      midFrequency: master.midFrequency ?? 3250,
      midQ: master.midQ ?? 0.88,
      highGain: master.highGain ?? 0.42,
      highFrequency: master.highFrequency ?? 9800,
      multibandEnabled: Boolean(master.multibandEnabled),
      multibandMix: master.multibandMix ?? 1,
      multibandLowCross: master.multibandLowCross ?? 180,
      multibandHighCross: master.multibandHighCross ?? 3200,
      multibandLowThreshold: master.multibandLowThreshold ?? -18,
      multibandMidThreshold: master.multibandMidThreshold ?? -20,
      multibandHighThreshold: master.multibandHighThreshold ?? -22,
      multibandLowRatio: master.multibandLowRatio ?? 2.5,
      multibandMidRatio: master.multibandMidRatio ?? 2.1,
      multibandHighRatio: master.multibandHighRatio ?? 1.8,
      multibandLowMakeup: master.multibandLowMakeup ?? 1,
      multibandMidMakeup: master.multibandMidMakeup ?? 1,
      multibandHighMakeup: master.multibandHighMakeup ?? 1,
      compEnabled: master.compEnabled !== false,
      compThreshold: master.compThreshold ?? -12,
      compRatio: master.compRatio ?? 2,
      compKnee: master.compKnee ?? 12,
      compAttack: master.compAttack ?? 0.02,
      compRelease: master.compRelease ?? 0.26,
      makeupGain: master.makeupGain ?? 1,
      saturationEnabled: master.saturationEnabled !== false,
      drive: master.clipDrive ?? 0.035,
      chorusEnabled: false,
      chorusMix: 0,
      stereoEnabled: master.stereoEnabled !== false,
      stereoWidth: master.stereoWidth ?? 1,
      stereoPan: master.stereoPan ?? 0,
      delayEnabled: Boolean(master.delayEnabled),
      delayMix: master.delayMix ?? 0,
      delaySync: master.delaySync !== false,
      delayDivision: master.delayDivision ?? "1/4",
      delayTime: master.delayTime ?? 0.25,
      delayFeedback: master.delayFeedback ?? 0.1,
      delayFeedbackHighpass: master.delayFeedbackHighpass ?? 120,
      delayTone: master.delayTone ?? 7000,
      reverbEnabled: Boolean(master.reverbEnabled),
      reverbRoom: master.reverbRoom ?? "studio",
      reverbMix: master.reverbMix ?? 0,
      reverbPreDelay: master.reverbPreDelay ?? 0.01,
      reverbDamping: master.reverbDamping ?? 7600,
      timeShaperEnabled: Boolean(master.timeShaperEnabled),
      timeShaperPattern: master.timeShaperPattern ?? "straight",
      timeShaperDepth: master.timeShaperDepth ?? 0,
      timeShaperMix: master.timeShaperMix ?? 0,
      timeShaperRate: master.timeShaperRate ?? 1,
      timeShaperSmooth: master.timeShaperSmooth ?? 0.012,
    },
  };
}
