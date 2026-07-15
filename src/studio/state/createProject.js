import { DRUM_KITS } from "../data/drumKits";

const uid = (prefix = "id") => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const emptySteps = () => Array.from({ length: 64 }, () => 0);

const defaultFx = () => ({
  highpass: 20,
  lowpass: 20000,
  lowGain: 0,
  lowFrequency: 120,
  midGain: 0,
  midFrequency: 1200,
  midQ: 0.8,
  highGain: 0,
  highFrequency: 7000,
  gateThreshold: -60,
  compThreshold: -18,
  compKnee: 8,
  compRatio: 3,
  compAttack: 0.01,
  compRelease: 0.2,
  makeupGain: 1,
  drive: 0,
  chorusMix: 0,
  chorusRate: 0.25,
  chorusDepth: 0.006,
  delayTime: 0.25,
  delayFeedback: 0.18,
  delayMix: 0,
  reverbMix: 0.06,
  stereoWidth: 0.5,
});

const drumTrack = (name, sampleId, color, steps) => ({
  id: uid("track"),
  name,
  type: "sampler",
  sampleId,
  color,
  steps,
  mixer: { volume: 0.82, pan: 0 },
  effects: defaultFx(),
  pitch: 0,
  startOffset: 0,
  endOffset: 5,
  sampleAttack: 0.001,
  sampleRelease: 0.04,
  sampleCutoff: 20000,
  sampleResonance: 0.2,
  sampleFilterType: "lowpass",
  samplePan: 0,
  reverse: false,
  mute: false,
  solo: false,
  useArrangement: true,
});

const synthTrack = (name, presetId, color, notes) => ({
  id: uid("track"),
  name,
  type: "synth",
  presetId,
  color,
  notes,
  synth: {},
  mixer: { volume: 0.68, pan: 0 },
  effects: defaultFx(),
  mute: false,
  solo: false,
  useArrangement: true,
});

export function createBlankProject(samples = []) {
  const kit = DRUM_KITS[0];
  const kick = emptySteps();
  const snare = emptySteps();
  const hats = emptySteps();
  const percussion = emptySteps();

  [0, 8, 16, 24, 32, 40, 48, 56].forEach((step) => { kick[step] = 0.95; });
  [4, 12, 20, 28, 36, 44, 52, 60].forEach((step) => { snare[step] = 0.86; });
  for (let step = 0; step < 64; step += 2) hats[step] = step % 8 === 6 ? 0.72 : 0.48;
  [12, 28, 44, 60].forEach((step) => { percussion[step] = 0.62; });

  const tracks = [
    drumTrack("Kick", kit.slots.kick, "#ff9b6a", kick),
    drumTrack("Snare", kit.slots.snare, "#ff6ba8", snare),
    drumTrack("Closed Hat", kit.slots.closedHat, "#ffe27a", hats),
    drumTrack("Perc", kit.slots.perc, "#7af0c1", percussion),
    synthTrack("808 Bass", "preset-002", "#9f83ff", [
      { id: uid("note"), start: 0, duration: 7, midi: 36, velocity: 0.88 },
      { id: uid("note"), start: 8, duration: 7, midi: 36, velocity: 0.82 },
      { id: uid("note"), start: 16, duration: 7, midi: 39, velocity: 0.86 },
      { id: uid("note"), start: 24, duration: 7, midi: 34, velocity: 0.84 },
      { id: uid("note"), start: 32, duration: 7, midi: 36, velocity: 0.88 },
      { id: uid("note"), start: 40, duration: 7, midi: 43, velocity: 0.85 },
      { id: uid("note"), start: 48, duration: 7, midi: 39, velocity: 0.82 },
      { id: uid("note"), start: 56, duration: 7, midi: 34, velocity: 0.86 },
    ]),
    synthTrack("Melody", "preset-032", "#64c8ff", [
      { id: uid("note"), start: 0, duration: 3, midi: 60, velocity: 0.72 },
      { id: uid("note"), start: 4, duration: 3, midi: 63, velocity: 0.66 },
      { id: uid("note"), start: 8, duration: 3, midi: 67, velocity: 0.72 },
      { id: uid("note"), start: 12, duration: 3, midi: 70, velocity: 0.64 },
    ]),
  ];

  return {
    id: uid("project"),
    name: "Untitled Hip-Hop Session",
    version: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bpm: 142,
    swing: 0.16,
    key: 0,
    scale: "minor",
    masterVolume: 0.82,
    master: {
      inputGain: 1,
      lowGain: 0,
      highGain: 0,
      compThreshold: -10,
      compRatio: 3,
      clipDrive: 0.16,
      limiterCeiling: -1,
      stereoWidth: 0.5,
    },
    loopBars: 8,
    samples,
    tracks,
    arrangement: tracks.map((track, index) => ({
      id: uid("clip"),
      trackId: track.id,
      startBar: 0,
      lengthBars: index < 4 ? 8 : 4,
      name: "Pattern A",
    })),
    automation: [],
    customPresets: [],
    selectedTrackId: tracks[0].id,
    view: "rack",
    playhead: 0,
  };
}

export function cloneProject(project) {
  const copy = JSON.parse(JSON.stringify(project));
  copy.id = uid("project");
  copy.name = `${project.name} Copy`;
  copy.createdAt = new Date().toISOString();
  copy.updatedAt = copy.createdAt;
  return copy;
}

export { uid, emptySteps, defaultFx };
