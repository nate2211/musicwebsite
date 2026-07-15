import { createSaturationCurve } from "./waveforms";

export function distortionCurve(amount = 0) {
  return createSaturationCurve(amount);
}

export function createImpulse(context, seconds = 2.4, decay = 2.6, reverse = false) {
  const length = Math.floor(context.sampleRate * seconds);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      const position = reverse ? length - index : index;
      data[index] = (Math.random() * 2 - 1) * ((1 - position / length) ** decay);
    }
  }
  return impulse;
}

export function createChannelStrip(context, destination) {
  const input = context.createGain();
  const highpass = context.createBiquadFilter();
  const lowpass = context.createBiquadFilter();
  const low = context.createBiquadFilter();
  const mid = context.createBiquadFilter();
  const high = context.createBiquadFilter();
  const compressor = context.createDynamicsCompressor();
  const makeup = context.createGain();
  const drive = context.createWaveShaper();
  const dry = context.createGain();
  const pan = context.createStereoPanner();
  const gain = context.createGain();

  highpass.type = "highpass";
  lowpass.type = "lowpass";
  low.type = "lowshelf";
  mid.type = "peaking";
  high.type = "highshelf";
  low.frequency.value = 120;
  mid.frequency.value = 1200;
  mid.Q.value = 0.8;
  high.frequency.value = 7000;

  const chorusDelay = context.createDelay(0.05);
  const chorusWet = context.createGain();
  const chorusLfo = context.createOscillator();
  const chorusDepth = context.createGain();
  chorusDelay.delayTime.value = 0.012;
  chorusLfo.frequency.value = 0.25;
  chorusDepth.gain.value = 0.006;
  chorusLfo.connect(chorusDepth).connect(chorusDelay.delayTime);
  chorusLfo.start();

  const delay = context.createDelay(2);
  const feedback = context.createGain();
  const delayWet = context.createGain();
  const reverb = context.createConvolver();
  const reverbWet = context.createGain();
  reverb.buffer = createImpulse(context);

  input
    .connect(highpass)
    .connect(lowpass)
    .connect(low)
    .connect(mid)
    .connect(high)
    .connect(compressor)
    .connect(makeup)
    .connect(drive);

  drive.connect(dry).connect(pan);
  drive.connect(chorusDelay).connect(chorusWet).connect(pan);
  drive.connect(delay);
  delay.connect(feedback).connect(delay);
  delay.connect(delayWet).connect(pan);
  drive.connect(reverb);
  reverb.connect(reverbWet).connect(pan);
  pan.connect(gain).connect(destination);

  return {
    input,
    highpass,
    lowpass,
    low,
    mid,
    high,
    compressor,
    makeup,
    drive,
    dry,
    pan,
    gain,
    chorusDelay,
    chorusWet,
    chorusLfo,
    chorusDepth,
    delay,
    feedback,
    delayWet,
    reverb,
    reverbWet,
  };
}

export function updateChannelStrip(strip, track, time = 0) {
  const mixer = track.mixer || {};
  const effects = track.effects || {};
  const set = (param, value, constant = 0.01) => param.setTargetAtTime(value, time, constant);

  set(strip.gain.gain, track.mute ? 0 : Math.max(0, mixer.volume ?? 0.8));
  set(strip.pan.pan, mixer.pan ?? 0);
  set(strip.highpass.frequency, effects.highpass ?? 20);
  set(strip.lowpass.frequency, effects.lowpass ?? 20000);
  set(strip.low.frequency, effects.lowFrequency ?? 120);
  set(strip.low.gain, effects.lowGain ?? 0);
  set(strip.mid.gain, effects.midGain ?? 0);
  set(strip.mid.frequency, effects.midFrequency ?? 1200);
  set(strip.mid.Q, effects.midQ ?? 0.8);
  set(strip.high.frequency, effects.highFrequency ?? 7000);
  set(strip.high.gain, effects.highGain ?? 0);

  strip.compressor.threshold.setTargetAtTime(effects.compThreshold ?? -18, time, 0.01);
  strip.compressor.knee.setTargetAtTime(effects.compKnee ?? 8, time, 0.01);
  strip.compressor.ratio.setTargetAtTime(effects.compRatio ?? 3, time, 0.01);
  strip.compressor.attack.setTargetAtTime(effects.compAttack ?? 0.01, time, 0.01);
  strip.compressor.release.setTargetAtTime(effects.compRelease ?? 0.2, time, 0.01);
  set(strip.makeup.gain, effects.makeupGain ?? 1);

  strip.drive.curve = distortionCurve(effects.drive ?? 0);
  strip.drive.oversample = "4x";
  set(strip.chorusWet.gain, effects.chorusMix ?? 0);
  set(strip.chorusLfo.frequency, effects.chorusRate ?? 0.25);
  set(strip.chorusDepth.gain, effects.chorusDepth ?? 0.006);
  set(strip.delay.delayTime, effects.delayTime ?? 0.25);
  set(strip.feedback.gain, effects.delayFeedback ?? 0.18);
  set(strip.delayWet.gain, effects.delayMix ?? 0);
  set(strip.reverbWet.gain, effects.reverbMix ?? 0);
  set(strip.dry.gain, 1);
}
