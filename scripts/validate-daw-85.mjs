import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createBlankProject } from "../src/studio/state/createProject.js";
import { studioReducer } from "../src/studio/state/studioReducer.js";
import { createHarmonyNotes } from "../src/studio/audio/harmonyTools.js";
import { inferTrackRole, NATIVE_BUS_ROLES } from "../src/studio/audio/nativeMixBus.js";
import { planMultitrackStep } from "../src/studio/audio/multitrackPlanner.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const pkg = JSON.parse(read("package.json"));
const lock = read("package-lock.json");
const engine = read("src/studio/audio/AudioEngine.js");
const offline = read("src/studio/audio/offlineRender.js");
const piano = read("src/studio/components/PianoRoll.jsx");
const plugin = read("src/studio/components/PluginRack.jsx");
const worklet = read("public/worklets/musicstudio-stream-guard.js");

assert(pkg.version === "8.5.0", "package version must be 8.5.0");
for (const dependency of ["@elemaudio/core", "@elemaudio/web-renderer", "@elemaudio/offline-renderer"]) {
  assert(!pkg.dependencies?.[dependency], `${dependency} must be removed`);
  assert(!lock.includes(dependency), `${dependency} remains in package-lock.json`);
}
assert(!engine.includes("ElementaryRealtimeEngine"), "realtime engine still imports Elementary");
assert(!offline.includes("processBufferWithElementary"), "offline renderer still calls Elementary");
assert(engine.includes("createNativeMixBuses"), "native group-bus engine is not connected");
assert(engine.includes("updateNativeMixBuses"), "native group buses are not updated");
assert(engine.includes("masterTrackFromProject(project)"), "native master plugin rack is not applied");
assert(offline.includes("createNativeMixBuses"), "offline rendering does not use native group buses");
assert(plugin.includes("Native Web Audio only"), "Engine Guard does not identify the native engine");
assert(!plugin.includes("Elementary insert"), "removed Elementary option remains visible");
assert(piano.includes("New harmony track"), "piano roll harmony-track control is missing");
assert(piano.includes("Layer harmony"), "in-track harmony control is missing");
assert(worklet.includes("this.previous"), "AudioWorklet look-ahead buffer is missing");
assert(worklet.includes("Number.isFinite"), "AudioWorklet non-finite protection is missing");
assert(worklet.includes("lookAheadFrames"), "AudioWorklet look-ahead telemetry is missing");

const project = createBlankProject([]);
assert(project.version === 8.5, "project schema version must be 8.5");
assert(project.tracks.length >= 9, "default project must demonstrate dense multitrack harmony");
const roleCounts = new Map(NATIVE_BUS_ROLES.map((role) => [role, 0]));
project.tracks.forEach((track) => roleCounts.set(inferTrackRole(track), (roleCounts.get(inferTrackRole(track)) || 0) + 1));
assert((roleCounts.get("drums") || 0) >= 4, "default drum bus is incomplete");
assert((roleCounts.get("bass") || 0) >= 1, "default bass bus is missing");
assert((roleCounts.get("harmony") || 0) >= 2, "default harmony bus needs multiple tracks");
assert((roleCounts.get("melody") || 0) >= 2, "default melody bus needs multiple tracks");

const sourceNotes = [{ id: "n1", start: 0, duration: 4, midi: 60, velocity: 0.8 }];
const third = createHarmonyNotes(sourceNotes, { root: 0, scale: "minor", mode: "third" });
const triad = createHarmonyNotes(sourceNotes, { root: 0, scale: "minor", mode: "triad" });
assert(third.some((note) => note.midi === 63), "C natural-minor scale third should create E-flat");
assert(triad.some((note) => note.midi === 63) && triad.some((note) => note.midi === 67), "minor triad generation is incorrect");

const nextState = studioReducer({ project, playing: false, playhead: 0 }, {
  type: "ADD_TRACK",
  trackType: "synth",
  trackName: "Validation Harmony",
  presetId: "preset-083",
  presetName: "Cinema Air",
  role: "harmony",
  notes: triad,
  mixer: { volume: 0.4, pan: 0 },
  openPiano: true,
});
const added = nextState.project.tracks.at(-1);
assert(added.name === "Validation Harmony", "custom harmony track name was not preserved");
assert(added.role === "harmony", "harmony track role was not preserved");
assert(added.notes.length === triad.length, "harmony notes were not added to the new track");

const leadState = studioReducer(nextState, {
  type: "ADD_TRACK",
  trackType: "synth",
  presetName: "Crystal Lead",
  trackName: "Crystal Lead",
  presetId: "preset-066",
});
assert(leadState.project.tracks.at(-1).role === "melody", "lead presets must route to the melody bus");

const candidates = [];
for (let track = 0; track < 6; track += 1) {
  for (let note = 0; note < 12; note += 1) {
    candidates.push({
      trackId: `track-${track}`,
      kind: "synth-note",
      midi: 36 + track * 5 + note,
      velocity: 0.5 + (note % 4) * 0.1,
      duration: 4,
      cost: 4,
    });
  }
}
const admitted = planMultitrackStep(candidates, {
  globalVoiceBudget: 30,
  globalCostBudget: 120,
  perTrackVoiceBudget: 8,
  perTrackCostBudget: 36,
  activeVoiceCount: 0,
  activeVoiceCost: 0,
  activeByTrack: new Map(),
});
assert(admitted.length <= 30, "multitrack planner exceeded the global voice budget");
assert(admitted.reduce((sum, note) => sum + note.cost, 0) <= 120, "multitrack planner exceeded the node-cost budget");
assert(new Set(admitted.map((note) => note.trackId)).size === 6, "dense admission did not reserve a voice for every active track");

if (errors.length) {
  console.error("DAW 8.5 validation failed:");
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}
console.log("DAW 8.5 validation passed: Elementary dependencies removed, native Web Audio group buses active in realtime and export, protected look-ahead AudioWorklet enabled, scale-aware harmony generation works, new harmony tracks preserve notes and roles, and dense multitrack admission remains within project and per-track budgets.");
