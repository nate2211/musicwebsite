import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getScalePitchClasses, SCALES } from "../src/studio/audio/musicTheory.js";
import { createBlankProject } from "../src/studio/state/createProject.js";
import { studioReducer } from "../src/studio/state/studioReducer.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const piano = read("src/studio/components/PianoRoll.jsx");
const reducer = read("src/studio/state/studioReducer.js");
const studio = read("src/studio/StudioPage.jsx");
const browser = read("src/studio/components/BrowserPanel.jsx");

assert(piano.includes("const LOW_MIDI = 12"), "Piano roll must begin at C0 (MIDI 12).");
assert(piano.includes("const HIGH_MIDI = 120"), "Piano roll must end at C9 (MIDI 120).");
assert(piano.includes("event.button !== 2"), "Right mouse draw handler is missing.");
assert(piano.includes("event.button !== 0"), "Left mouse erase/resize handler is missing.");
assert(piano.includes("setNoteLength(resize.duration)"), "Resized duration is not inherited by new notes.");
assert(piano.includes("Selected scale · C0–C9"), "Scale-folded full-range option is missing.");
assert(piano.includes("onPointerEnter"), "Right-drag painting is missing.");
assert(piano.includes('field: "scale"'), "Piano-roll scale selector is not connected to project state.");
assert(piano.includes('field: "key"'), "Piano-roll root selector is not connected to project state.");

assert(reducer.includes("const cleanSampleTrackName"), "Sample-title normalization helper is missing.");
assert(reducer.includes("nextSampleTrackName(project.tracks, sampleName"), "Sample-title naming is not connected to track creation.");
assert(reducer.includes("autoNameFromSample"), "Automatic-vs-manual sample title state is missing.");
assert(studio.includes("sampleName: sample.name"), "Sample title is not passed into the reducer.");
assert(browser.includes("onAddSampleTrack(sample)"), "Per-sample new-track control is missing.");
assert(browser.includes("Create a new track named"), "Sample-track creation affordance is missing.");

const manifest = JSON.parse(read("public/sounds/manifest.json"));
assert(manifest.length === 444, `Expected 444 factory sounds, found ${manifest.length}.`);
assert(new Set(manifest.map((entry) => entry.id)).size === 444, "Factory sample IDs must be unique.");
assert(SCALES.mixolydian?.length === 7, "Mixolydian scale definition is missing.");
assert(SCALES.majorPentatonic?.length === 5, "Major pentatonic scale definition is missing.");
assert(SCALES.locrian?.length === 7, "Locrian scale definition is missing.");
assert(getScalePitchClasses(0, "major").has(11), "C major scale mapping is invalid.");
assert(!getScalePitchClasses(0, "major").has(10), "C major scale mapping incorrectly includes B-flat.");

// Reducer behavior checks for sample-derived titles and manual-title preservation.
let state = { project: createBlankProject(manifest), playing: false, playhead: 0 };
const firstSample = manifest[0];
const secondSample = manifest[1];
state = studioReducer(state, {
  type: "ADD_TRACK",
  trackType: "sampler",
  sampleId: firstSample.id,
  sampleName: firstSample.name,
});
let created = state.project.tracks.at(-1);
assert(created.name === firstSample.name, `New sample track should be named "${firstSample.name}", found "${created.name}".`);
assert(created.sampleId === firstSample.id, "New sample track did not receive the selected sample.");

state = studioReducer(state, {
  type: "ADD_TRACK",
  trackType: "sampler",
  sampleId: firstSample.id,
  sampleName: firstSample.name,
});
created = state.project.tracks.at(-1);
assert(created.name === `${firstSample.name} (2)`, "Duplicate sample titles must receive a numbered suffix.");

state = studioReducer(state, {
  type: "ASSIGN_SAMPLE",
  id: created.id,
  sampleId: secondSample.id,
  sampleName: secondSample.name,
});
created = state.project.tracks.find((track) => track.id === created.id);
assert(created.name === secondSample.name, "Automatically named sample track should follow a newly assigned sample title.");

state = studioReducer(state, {
  type: "UPDATE_TRACK",
  id: created.id,
  patch: { name: "My Custom Texture" },
});
state = studioReducer(state, {
  type: "ASSIGN_SAMPLE",
  id: created.id,
  sampleId: firstSample.id,
  sampleName: firstSample.name,
});
created = state.project.tracks.find((track) => track.id === created.id);
assert(created.name === "My Custom Texture", "Manually edited track titles must not be overwritten by sample assignment.");

const kick = state.project.tracks.find((track) => track.name === "Kick");
state = studioReducer(state, {
  type: "ASSIGN_SAMPLE",
  id: kick.id,
  sampleId: secondSample.id,
  sampleName: secondSample.name,
});
assert(state.project.tracks.find((track) => track.id === kick.id).name === "Kick", "Existing named drum tracks must preserve their titles.");

if (errors.length) {
  console.error("DAW 6.3 validation failed:");
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}

console.log("DAW 6.3 validation passed: sample-derived track titles, duplicate suffixing, manual-title preservation, C0–C9 scale roll, mouse editing, and 444 factory WAV assets.");
