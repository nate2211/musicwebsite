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

export function automationValueAt(lane, absoluteStep) {
  const points = [...(lane?.points || [])].sort((a, b) => a.step - b.step);
  if (!points.length) return lane?.defaultValue;
  const loopLength = lane.lengthSteps || 64;
  const step = ((absoluteStep % loopLength) + loopLength) % loopLength;
  const exact = points.find((point) => point.step === step);
  if (exact) return exact.value;
  const before = [...points].reverse().find((point) => point.step < step) || points[points.length - 1];
  const after = points.find((point) => point.step > step) || points[0];
  if (!lane.smooth || before === after) return before.value;
  const afterStep = after.step <= before.step ? after.step + loopLength : after.step;
  const currentStep = step < before.step ? step + loopLength : step;
  const distance = Math.max(1, afterStep - before.step);
  const amount = Math.max(0, Math.min(1, (currentStep - before.step) / distance));
  return before.value + (after.value - before.value) * amount;
}

export function collectTrackAutomation(project, trackId, absoluteStep) {
  const values = {};
  (project.automation || [])
    .filter((lane) => lane.trackId === trackId && lane.enabled !== false)
    .forEach((lane) => {
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
  const set = (param, value) => param.setTargetAtTime(value, time, 0.008);
  if (Number.isFinite(values.volume)) set(strip.gain.gain, Math.max(0, values.volume));
  if (Number.isFinite(values.pan)) set(strip.pan.pan, Math.max(-1, Math.min(1, values.pan)));
  if (Number.isFinite(values.filterCutoff)) set(strip.lowpass.frequency, Math.max(20, values.filterCutoff));
  if (Number.isFinite(values.delayMix)) set(strip.delayWet.gain, Math.max(0, values.delayMix));
  if (Number.isFinite(values.reverbMix)) set(strip.reverbWet.gain, Math.max(0, values.reverbMix));
}
