import { SCALES, snapToScale } from "./musicTheory.js";

const LOW_MIDI = 12;
const HIGH_MIDI = 120;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function scalePool(root = 0, scale = "minor") {
  const intervals = SCALES[scale] || SCALES.minor;
  const rootPc = ((Number(root) % 12) + 12) % 12;
  const allowed = new Set(intervals.map((interval) => (rootPc + interval) % 12));
  const pool = [];
  for (let midi = LOW_MIDI; midi <= HIGH_MIDI; midi += 1) {
    if (allowed.has(midi % 12)) pool.push(midi);
  }
  return pool;
}

function degreeShift(midi, root, scale, degrees) {
  const pool = scalePool(root, scale);
  const snapped = snapToScale(midi, root, scale);
  let index = pool.indexOf(snapped);
  if (index < 0) {
    index = pool.reduce((best, value, candidate) => (
      Math.abs(value - snapped) < Math.abs(pool[best] - snapped) ? candidate : best
    ), 0);
  }
  return pool[clamp(index + degrees, 0, pool.length - 1)];
}

export const HARMONY_MODES = [
  { value: "third", label: "Scale third", degrees: [2] },
  { value: "fifth", label: "Scale fifth", degrees: [4] },
  { value: "triad", label: "Scale triad", degrees: [2, 4] },
  { value: "seventh", label: "Scale seventh chord", degrees: [2, 4, 6] },
  { value: "octave", label: "Octave double", semitones: [12] },
  { value: "wide", label: "Wide harmony", degrees: [4], semitones: [12] },
];

export function createHarmonyNotes(notes = [], {
  root = 0,
  scale = "minor",
  mode = "third",
  velocityScale = 0.78,
  idPrefix = "harmony",
} = {}) {
  const definition = HARMONY_MODES.find((entry) => entry.value === mode) || HARMONY_MODES[0];
  const generated = [];
  const seen = new Set(notes.map((note) => `${note.start}:${note.midi}:${note.duration}`));
  const push = (source, midi, suffix) => {
    const safeMidi = clamp(Math.round(midi), LOW_MIDI, HIGH_MIDI);
    const key = `${source.start}:${safeMidi}:${source.duration}`;
    if (seen.has(key)) return;
    seen.add(key);
    generated.push({
      ...source,
      id: `${idPrefix}-${Date.now().toString(36)}-${source.id}-${suffix}`,
      midi: safeMidi,
      velocity: clamp(Number(source.velocity || 0.8) * velocityScale, 0.08, 1),
      envelope: source.envelope ? { ...source.envelope, gain: Math.min(1.15, Number(source.envelope.gain || 1) * 0.9) } : source.envelope,
    });
  };
  notes.forEach((note) => {
    (definition.degrees || []).forEach((degrees, index) => push(note, degreeShift(note.midi, root, scale, degrees), `d${degrees}-${index}`));
    (definition.semitones || []).forEach((semitones, index) => push(note, note.midi + semitones, `s${semitones}-${index}`));
  });
  return generated;
}
