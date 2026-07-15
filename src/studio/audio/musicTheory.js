export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const SCALES = {
  chromatic: [0,1,2,3,4,5,6,7,8,9,10,11], minor: [0,2,3,5,7,8,10], major: [0,2,4,5,7,9,11],
  harmonicMinor: [0,2,3,5,7,8,11], melodicMinor: [0,2,3,5,7,9,11], dorian: [0,2,3,5,7,9,10],
  phrygian: [0,1,3,5,7,8,10], pentatonicMinor: [0,3,5,7,10], blues: [0,3,5,6,7,10]
};
export function midiToFrequency(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
export function midiToName(midi) { return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`; }
export function snapToScale(midi, root = 0, scale = "minor") {
  const allowed = SCALES[scale] || SCALES.minor;
  let best = midi, distance = Infinity;
  for (let candidate = midi - 6; candidate <= midi + 6; candidate += 1) {
    if (allowed.includes(((candidate - root) % 12 + 12) % 12) && Math.abs(candidate-midi) < distance) { best=candidate; distance=Math.abs(candidate-midi); }
  }
  return best;
}
export const CHORDS = {
  minor: [0,3,7], major:[0,4,7], diminished:[0,3,6], minor7:[0,3,7,10], major7:[0,4,7,11], dominant7:[0,4,7,10], sus2:[0,2,7], sus4:[0,5,7]
};
