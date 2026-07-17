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
    // Some Safari builds reject holds that land before the current render quantum.
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
  return 1 - normalized * 0.42;
}

export function chordHeadroom(noteCount, activeVoiceCount = 0, complexity = 1) {
  const simultaneous = Math.max(1, Number(noteCount || 0));
  const activeContribution = Math.max(0, Number(activeVoiceCount || 0)) * 0.42;
  const cost = Math.max(1, Number(complexity || 1));
  const energy = simultaneous + activeContribution + Math.max(0, cost - 1) * 0.22;
  return Math.max(0.055, Math.min(1, 1 / Math.sqrt(energy)));
}

export function equalPowerGains(mix = 0) {
  const safe = clampFinite(mix, 0, 1, 0);
  const angle = safe * Math.PI * 0.5;
  return { dry: Math.cos(angle), wet: Math.sin(angle) };
}

function linearInterpolate(start, end, amount) {
  return start + (end - start) * Math.max(0, Math.min(1, amount));
}

function ramp(param, target, endTime, linear = false) {
  const safeTarget = Math.max(AUDIO_EPSILON, Number(target) || AUDIO_EPSILON);
  if (linear) param.linearRampToValueAtTime(safeTarget, endTime);
  else param.exponentialRampToValueAtTime(safeTarget, endTime);
}

/**
 * Schedules a phase-aware ADSR envelope. Short notes no longer rush to the
 * full peak when their attack is longer than the gate; they release from the
 * mathematically correct partial attack/decay level instead. This avoids the
 * end-of-note spike that can sound like tearing when dense high and low notes
 * overlap.
 */
export function scheduleSafeEnvelope(param, envelope = {}, time, duration, peak = 1) {
  const start = Math.max(0, Number(time) || 0);
  const gate = Math.max(0.004, Number(duration) || 0.004);
  const noteEnd = start + gate;
  const attack = Math.max(0.001, Number(envelope.attack ?? 0.01));
  const hold = Math.max(0, Number(envelope.hold ?? 0));
  const decay = Math.max(0.001, Number(envelope.decay ?? 0.15));
  const sustain = clampFinite(envelope.sustain ?? 0.7, 0.001, 1, 0.7);
  const release = clampFinite(envelope.release ?? 0.25, 0.008, 12, 0.25);
  const safePeak = Math.max(AUDIO_EPSILON, Number(peak) || AUDIO_EPSILON);
  const sustainPeak = Math.max(AUDIO_EPSILON, safePeak * sustain);
  const linear = envelope.curve === "linear";

  cancelAndHold(param, start);
  param.setValueAtTime(AUDIO_EPSILON, start);

  let levelAtEnd = AUDIO_EPSILON;
  let attackEnd = start;
  let decayEnd = start;

  if (gate <= attack) {
    const progress = gate / attack;
    levelAtEnd = Math.max(AUDIO_EPSILON, safePeak * progress);
    ramp(param, levelAtEnd, noteEnd, linear);
    attackEnd = noteEnd;
    decayEnd = noteEnd;
  } else {
    attackEnd = start + attack;
    ramp(param, safePeak, attackEnd, linear);
    const holdEnd = attackEnd + hold;

    if (noteEnd <= holdEnd) {
      levelAtEnd = safePeak;
      param.setValueAtTime(safePeak, noteEnd);
      decayEnd = noteEnd;
    } else {
      if (hold > 0) param.setValueAtTime(safePeak, holdEnd);
      const availableDecay = noteEnd - holdEnd;
      if (availableDecay < decay) {
        const progress = availableDecay / decay;
        levelAtEnd = Math.max(AUDIO_EPSILON, linearInterpolate(safePeak, sustainPeak, progress));
        ramp(param, levelAtEnd, noteEnd, linear);
        decayEnd = noteEnd;
      } else {
        decayEnd = holdEnd + decay;
        ramp(param, sustainPeak, decayEnd, linear);
        levelAtEnd = sustainPeak;
        if (noteEnd > decayEnd) param.setValueAtTime(sustainPeak, noteEnd);
      }
    }
  }

  param.setValueAtTime(Math.max(AUDIO_EPSILON, levelAtEnd), noteEnd);
  param.exponentialRampToValueAtTime(AUDIO_EPSILON, noteEnd + release);

  return {
    noteEnd,
    release,
    attackEnd,
    decayEnd,
    levelAtEnd,
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
  const gate = Math.max(0.004, Number(duration) || 0.004);
  const noteEnd = start + gate;
  const requestedAttack = Math.max(0.001, Number(attack) || 0.001);
  const requestedHold = Math.max(0, Number(hold) || 0);
  const requestedDecay = Math.max(0.001, Number(decay) || 0.001);
  const base = Math.max(20, Number(startValue) || 20);
  const peak = Math.max(20, Number(peakValue) || base);
  const sustain = Math.max(20, Number(sustainValue) || base);
  const releaseEnd = noteEnd + Math.max(0.008, Number(release) || 0.008);

  cancelAndHold(param, start);
  param.setValueAtTime(base, start);

  let levelAtEnd = base;
  if (gate <= requestedAttack) {
    levelAtEnd = Math.max(20, linearInterpolate(base, peak, gate / requestedAttack));
    param.exponentialRampToValueAtTime(levelAtEnd, noteEnd);
  } else {
    const attackEnd = start + requestedAttack;
    param.exponentialRampToValueAtTime(peak, attackEnd);
    const holdEnd = attackEnd + requestedHold;
    if (noteEnd <= holdEnd) {
      levelAtEnd = peak;
      param.setValueAtTime(peak, noteEnd);
    } else {
      if (requestedHold > 0) param.setValueAtTime(peak, holdEnd);
      const elapsedDecay = noteEnd - holdEnd;
      if (elapsedDecay < requestedDecay) {
        levelAtEnd = Math.max(20, linearInterpolate(peak, sustain, elapsedDecay / requestedDecay));
        param.exponentialRampToValueAtTime(levelAtEnd, noteEnd);
      } else {
        const decayEnd = holdEnd + requestedDecay;
        param.exponentialRampToValueAtTime(sustain, decayEnd);
        levelAtEnd = sustain;
        if (noteEnd > decayEnd) param.setValueAtTime(sustain, noteEnd);
      }
    }
  }

  param.setValueAtTime(levelAtEnd, noteEnd);
  param.exponentialRampToValueAtTime(base, releaseEnd);
  return { noteEnd, releaseEnd, levelAtEnd };
}

export function chooseHighNoteWaveform(waveform, frequency, context) {
  const safe = String(waveform || "sine");
  const nyquist = (context?.sampleRate || 44100) * 0.5;
  if (frequency < nyquist * 0.17) return safe;
  if (["sawtooth", "square", "pulse", "pulse25", "pulse12", "warmSaw", "digital", "spectral", "metallic"].includes(safe)) {
    return frequency >= nyquist * 0.28 ? "sine" : "triangle";
  }
  return safe;
}
