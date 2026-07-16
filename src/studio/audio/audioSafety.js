export const AUDIO_EPSILON = 0.00001;

export function clampFinite(value, minimum, maximum, fallback = minimum) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(minimum, Math.min(maximum, numeric));
}

export function safeAudioTime(context, time = context?.currentTime || 0) {
  const now = context?.currentTime || 0;
  return Math.max(now, Number.isFinite(time) ? time : now);
}

export function cancelAndHold(param, time) {
  if (!param) return;
  try {
    if (typeof param.cancelAndHoldAtTime === "function") {
      param.cancelAndHoldAtTime(time);
      return;
    }
  } catch (_) {
    // Safari can throw when cancelAndHoldAtTime targets a value before its render quantum.
  }
  try {
    const current = Number.isFinite(param.value) ? param.value : 0;
    param.cancelScheduledValues(time);
    param.setValueAtTime(current, time);
  } catch (_) {
    // Ignore disconnected or already-disposed AudioParams.
  }
}

export function smoothAudioParam(param, value, time, timeConstant = 0.025) {
  if (!param || !Number.isFinite(Number(value))) return;
  const target = Number(value);
  const when = Math.max(0, Number(time) || 0);
  cancelAndHold(param, when);
  try {
    param.setTargetAtTime(target, when, Math.max(0.001, Number(timeConstant) || 0.025));
  } catch (_) {
    try { param.setValueAtTime(target, when); } catch (__) { /* no-op */ }
  }
}

export function smoothCachedParam(strip, key, param, value, time, timeConstant = 0.025, tolerance = 0.0001) {
  if (!strip || !param || !Number.isFinite(Number(value))) return;
  if (!strip.parameterCache) strip.parameterCache = new Map();
  const target = Number(value);
  const previous = strip.parameterCache.get(key);
  if (Number.isFinite(previous) && Math.abs(previous - target) <= tolerance) return;
  strip.parameterCache.set(key, target);
  smoothAudioParam(param, target, time, timeConstant);
}

export function safeFrequency(context, frequency, minimum = 8, ratio = 0.42) {
  const sampleRate = context?.sampleRate || 44100;
  const maximum = Math.max(minimum, sampleRate * Math.max(0.1, Math.min(0.48, ratio)));
  return clampFinite(frequency, minimum, maximum, minimum);
}

export function safeMidi(midi, minimum = 0, maximum = 127) {
  return clampFinite(Math.round(Number(midi)), minimum, maximum, 60);
}

export function highNoteHeadroom(midi) {
  const normalized = Math.max(0, Math.min(1, (safeMidi(midi) - 84) / 36));
  return 1 - normalized * 0.32;
}

export function chordHeadroom(noteCount, activeVoiceCount = 0) {
  const total = Math.max(1, Number(noteCount || 0) + Number(activeVoiceCount || 0));
  return Math.max(0.28, Math.min(1, 1 / Math.sqrt(total)));
}

export function scheduleSafeEnvelope(param, envelope = {}, time, duration, peak = 1) {
  const start = Math.max(0, Number(time) || 0);
  const gate = Math.max(0.02, Number(duration) || 0.02);
  const noteEnd = start + gate;
  const requestedAttack = Math.max(0.001, Number(envelope.attack ?? 0.01));
  const requestedHold = Math.max(0, Number(envelope.hold ?? 0));
  const requestedDecay = Math.max(0.001, Number(envelope.decay ?? 0.15));
  const sustain = clampFinite(envelope.sustain ?? 0.7, 0.001, 1, 0.7);
  const release = clampFinite(envelope.release ?? 0.25, 0.01, 12, 0.25);
  const safePeak = Math.max(AUDIO_EPSILON, Number(peak) || AUDIO_EPSILON);
  const sustainPeak = Math.max(AUDIO_EPSILON, safePeak * sustain);

  const attackEnd = Math.min(noteEnd, start + requestedAttack);
  const holdEnd = Math.min(noteEnd, attackEnd + requestedHold);
  const decayEnd = Math.min(noteEnd, holdEnd + requestedDecay);
  const linear = envelope.curve === "linear";

  cancelAndHold(param, start);
  param.setValueAtTime(AUDIO_EPSILON, start);
  if (attackEnd > start + 0.000001) {
    if (linear) param.linearRampToValueAtTime(safePeak, attackEnd);
    else param.exponentialRampToValueAtTime(safePeak, attackEnd);
  } else {
    param.setValueAtTime(safePeak, start);
  }

  if (holdEnd > attackEnd + 0.000001) param.setValueAtTime(safePeak, holdEnd);
  if (decayEnd > holdEnd + 0.000001) {
    if (linear) param.linearRampToValueAtTime(sustainPeak, decayEnd);
    else param.exponentialRampToValueAtTime(sustainPeak, decayEnd);
  }

  const levelAtEnd = attackEnd >= noteEnd - 0.000001
    ? safePeak
    : (decayEnd >= noteEnd - 0.000001 ? sustainPeak : sustainPeak);
  param.setValueAtTime(Math.max(AUDIO_EPSILON, levelAtEnd), noteEnd);
  param.exponentialRampToValueAtTime(AUDIO_EPSILON, noteEnd + release);

  return {
    noteEnd,
    release,
    attackEnd,
    decayEnd,
    stopTime: noteEnd + release + 0.08,
  };
}

export function scheduleSafeFilterEnvelope(param, {
  startValue,
  peakValue,
  sustainValue,
  attack = 0.005,
  hold = 0,
  decay = 0.3,
  release = 0.4,
  time = 0,
  duration = 0.1,
}) {
  const start = Math.max(0, Number(time) || 0);
  const gate = Math.max(0.02, Number(duration) || 0.02);
  const noteEnd = start + gate;
  const attackEnd = Math.min(noteEnd, start + Math.max(0.001, Number(attack) || 0.001));
  const holdEnd = Math.min(noteEnd, attackEnd + Math.max(0, Number(hold) || 0));
  const decayEnd = Math.min(noteEnd, holdEnd + Math.max(0.001, Number(decay) || 0.001));
  const base = Math.max(20, Number(startValue) || 20);
  const peak = Math.max(20, Number(peakValue) || base);
  const sustain = Math.max(20, Number(sustainValue) || base);
  const releaseEnd = noteEnd + Math.max(0.01, Number(release) || 0.01);

  cancelAndHold(param, start);
  param.setValueAtTime(base, start);
  if (attackEnd > start + 0.000001) param.exponentialRampToValueAtTime(peak, attackEnd);
  if (holdEnd > attackEnd + 0.000001) param.setValueAtTime(peak, holdEnd);
  if (decayEnd > holdEnd + 0.000001) param.exponentialRampToValueAtTime(sustain, decayEnd);
  param.setValueAtTime(attackEnd >= noteEnd - 0.000001 ? peak : sustain, noteEnd);
  param.exponentialRampToValueAtTime(base, releaseEnd);
  return { noteEnd, releaseEnd };
}

export function chooseHighNoteWaveform(waveform, frequency, context) {
  const safe = String(waveform || "sine");
  const nyquist = (context?.sampleRate || 44100) * 0.5;
  if (frequency < nyquist * 0.2) return safe;
  if (["sawtooth", "square", "pulse", "warmSaw", "digital", "spectral", "metallic"].includes(safe)) {
    return frequency >= nyquist * 0.32 ? "sine" : "triangle";
  }
  return safe;
}
