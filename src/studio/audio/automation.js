import { safeFrequency, smoothAudioParam } from "./audioSafety";

export const AUTOMATION_PARAMETERS = [
  { value: "volume", label: "Mixer Volume", min: 0, max: 1.25, defaultValue: 0.75 },
  { value: "pan", label: "Mixer Pan", min: -1, max: 1, defaultValue: 0 },
  { value: "filterCutoff", label: "Channel Low-pass", min: 200, max: 20000, defaultValue: 20000, logarithmic: true },
  { value: "delayMix", label: "Delay Send", min: 0, max: 0.9, defaultValue: 0 },
  { value: "reverbMix", label: "Reverb Send", min: 0, max: 0.95, defaultValue: 0.06 },
  { value: "macroCharacter", label: "Synth Macro · Character", min: 0, max: 1, defaultValue: 0.25 },
  { value: "macroBrightness", label: "Synth Macro · Brightness", min: 0, max: 1, defaultValue: 0.58 },
  { value: "macroMotion", label: "Synth Macro · Motion", min: 0, max: 1, defaultValue: 0.18 },
  { value: "macroWidth", label: "Synth Macro · Width", min: 0, max: 1, defaultValue: 0.42 },
];

const sortedPointCache = new WeakMap();
const automationIndexCache = new WeakMap();

function sortedPointsFor(lane) {
  const points = lane?.points || [];
  const cached = sortedPointCache.get(lane);
  if (cached?.points === points) return cached.sorted;
  const sorted = [...points].sort((a, b) => a.step - b.step);
  if (lane && typeof lane === "object") sortedPointCache.set(lane, { points, sorted });
  return sorted;
}

function lanesForTrack(project, trackId) {
  const automation = project?.automation || [];
  let cached = automationIndexCache.get(automation);
  if (!cached) {
    cached = new Map();
    automation.forEach((lane) => {
      if (lane.enabled === false) return;
      const bucket = cached.get(lane.trackId) || [];
      bucket.push(lane);
      cached.set(lane.trackId, bucket);
    });
    automationIndexCache.set(automation, cached);
  }
  return cached.get(trackId) || [];
}

export function automationValueAt(lane, absoluteStep) {
  const points = sortedPointsFor(lane);
  if (!points.length) return lane?.defaultValue;
  const loopLength = lane.lengthSteps || 64;
  const step = ((absoluteStep % loopLength) + loopLength) % loopLength;
  const exact = points.find((point) => point.step === step);
  if (exact) return exact.value;

  let before = points[points.length - 1];
  let after = points[0];
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (point.step < step) before = point;
    if (point.step > step) {
      after = point;
      break;
    }
  }
  if (!lane.smooth || before === after) return before.value;
  const afterStep = after.step <= before.step ? after.step + loopLength : after.step;
  const currentStep = step < before.step ? step + loopLength : step;
  const distance = Math.max(1, afterStep - before.step);
  const amount = Math.max(0, Math.min(1, (currentStep - before.step) / distance));
  return before.value + (after.value - before.value) * amount;
}

export function collectTrackAutomation(project, trackId, absoluteStep) {
  const values = {};
  lanesForTrack(project, trackId).forEach((lane) => {
    const value = automationValueAt(lane, absoluteStep);
    if (Number.isFinite(value)) values[lane.parameter] = value;
  });
  return values;
}

export function applyAutomationToPatch(patch, values) {
  if (!patch || !values) return patch;
  return {
    ...patch,
    macros: {
      ...patch.macros,
      character: values.macroCharacter ?? patch.macros.character,
      brightness: values.macroBrightness ?? patch.macros.brightness,
      motion: values.macroMotion ?? patch.macros.motion,
      width: values.macroWidth ?? patch.macros.width,
    },
  };
}

export function applyAutomationToStrip(strip, values, time) {
  if (!strip || !values) return;
  const when = Math.max(strip.input.context.currentTime, Number(time) || 0);
  if (Number.isFinite(values.volume)) smoothAudioParam(strip.gain.gain, Math.max(0, values.volume), when, 0.032);
  if (Number.isFinite(values.pan)) smoothAudioParam(strip.pan.pan, Math.max(-1, Math.min(1, values.pan)), when, 0.038);
  if (Number.isFinite(values.filterCutoff)) {
    smoothAudioParam(strip.lowpass.frequency, safeFrequency(strip.input.context, values.filterCutoff, 20, 0.45), when, 0.045);
  }
  if (Number.isFinite(values.delayMix)) smoothAudioParam(strip.delayWet.gain, Math.max(0, Math.min(0.72, values.delayMix * 0.72)), when, 0.045);
  if (Number.isFinite(values.reverbMix)) {
    const activeSlot = strip.reverbSlots?.[strip.activeRoomSlot];
    smoothAudioParam((activeSlot?.wet || strip.reverbWet).gain, Math.max(0, Math.min(0.72, values.reverbMix * 0.72)), when, 0.052);
  }
}
