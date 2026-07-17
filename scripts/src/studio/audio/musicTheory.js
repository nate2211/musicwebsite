export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const SCALES = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  majorPentatonic: [0, 2, 4, 7, 9],
  pentatonicMinor: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
};

export const SCALE_OPTIONS = [
  { value: "chromatic", label: "Chromatic" },
  { value: "major", label: "Major" },
  { value: "minor", label: "Natural Minor" },
  { value: "harmonicMinor", label: "Harmonic Minor" },
  { value: "melodicMinor", label: "Melodic Minor" },
  { value: "majorPentatonic", label: "Major Pentatonic" },
  { value: "pentatonicMinor", label: "Minor Pentatonic" },
  { value: "blues", label: "Blues" },
  { value: "dorian", label: "Dorian" },
  { value: "phrygian", label: "Phrygian" },
  { value: "lydian", label: "Lydian" },
  { value: "mixolydian", label: "Mixolydian" },
  { value: "locrian", label: "Locrian" },
];

export function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function midiToName(midi) {
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

export function getScalePitchClasses(root = 0, scale = "minor") {
  const intervals = SCALES[scale] || SCALES.minor;
  return new Set(intervals.map((interval) => (interval + Number(root || 0) + 120) % 12));
}

export function isMidiInScale(midi, root = 0, scale = "minor") {
  return getScalePitchClasses(root, scale).has(((midi % 12) + 12) % 12);
}

export function snapToScale(midi, root = 0, scale = "minor") {
  const allowed = SCALES[scale] || SCALES.minor;
  let best = midi;
  let distance = Infinity;
  for (let candidate = midi - 6; candidate <= midi + 6; candidate += 1) {
    if (
      allowed.includes(((candidate - root) % 12 + 12) % 12)
      && Math.abs(candidate - midi) < distance
    ) {
      best = candidate;
      distance = Math.abs(candidate - midi);
    }
  }
  return best;
}

export const CHORDS = {
  minor: [0, 3, 7],
  major: [0, 4, 7],
  diminished: [0, 3, 6],
  minor7: [0, 3, 7, 10],
  major7: [0, 4, 7, 11],
  dominant7: [0, 4, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
};
