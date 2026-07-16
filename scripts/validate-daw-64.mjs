import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
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
const sidebar = read("src/studio/components/TrackSidebar.jsx");
const browser = read("src/studio/components/BrowserPanel.jsx");
const engine = read("src/studio/audio/AudioEngine.js");
const offline = read("src/studio/audio/offlineRender.js");
const voices = read("src/studio/audio/voices.js");

assert(piano.includes("const LOW_MIDI = 12"), "Piano roll must begin at C0 (MIDI 12).");
assert(piano.includes("const HIGH_MIDI = 120"), "Piano roll must end at C9 (MIDI 120).");
assert(piano.includes("event.button !== 2"), "Right mouse draw handler is missing.");
assert(piano.includes("event.button !== 0"), "Left mouse erase/resize handler is missing.");
assert(piano.includes("setNoteLength(resize.duration)"), "Resized duration is not inherited by new notes.");
assert(piano.includes("Selected scale · C0–C9"), "Scale-folded full-range option is missing.");
assert(piano.includes("onPointerEnter"), "Right-drag painting is missing.");
assert(piano.includes('field: "scale"'), "Piano-roll scale selector is not connected to project state.");
assert(piano.includes('field: "key"'), "Piano-roll root selector is not connected to project state.");
assert(!piano.includes('track.type !== "synth"'), "Piano roll must not reject selected sampler tracks.");
assert(piano.includes("MIGRATE_SAMPLER_PATTERN_TO_NOTES"), "Sampler patterns are not mounted into the piano roll.");
assert(piano.includes("data-piano-track-id"), "Rendered piano roll is not bound to the selected track ID.");
assert(piano.includes("Selected track"), "Selected-track banner is missing from the piano roll.");

assert(sidebar.includes('openPiano: true'), "Selecting a track must open its piano roll.");
assert(studio.includes('key={selectedTrack?.id || "no-selected-track"}'), "Piano roll must remount when the selected track changes.");
assert(studio.includes("onSelectTrack"), "Track sidebar selection is not connected to the studio workspace.");
assert(studio.includes("Selected: {selectedTrack?.name"), "Selected-track status is missing.");

assert(reducer.includes("MIGRATE_SAMPLER_PATTERN_TO_NOTES"), "Sampler-pattern migration reducer is missing.");
assert(reducer.includes('view: action.openPiano ? "piano" : project.view'), "Track selection does not open the piano-roll view.");
assert(reducer.includes('sequenceMode: track.type === "sampler" ? "notes"'), "Sampler note editing does not activate note mode.");
assert(engine.includes("samplerUsesNotes"), "Realtime engine does not schedule sampler piano-roll notes.");
assert(engine.includes("noteDurationSeconds"), "Realtime sampler notes do not receive note lengths.");
assert(offline.includes("samplerUsesNotes"), "Offline WAV renderer does not schedule sampler piano-roll notes.");
assert(voices.includes("requestedOutputDuration"), "Sample voice does not honor piano-roll note duration.");

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

let state = { project: createBlankProject(manifest), playing: false, playhead: 0 };
const firstSample = manifest[0];
const secondSample = manifest[1];
const kickId = state.project.tracks[0].id;
const melodyId = state.project.tracks.find((track) => track.name === "Melody").id;

state = studioReducer(state, { type: "SELECT_TRACK", id: melodyId, openPiano: true });
assert(state.project.selectedTrackId === melodyId, "Track selection did not update selectedTrackId.");
assert(state.project.view === "piano", "Track selection did not open the piano-roll view.");

const invalidSelectionProject = { ...state.project, selectedTrackId: "missing-track" };
state = studioReducer(state, { type: "LOAD_PROJECT", project: invalidSelectionProject });
assert(state.project.selectedTrackId === state.project.tracks[0].id, "Project load did not repair an invalid selected track.");

state = studioReducer(state, { type: "MIGRATE_SAMPLER_PATTERN_TO_NOTES", id: kickId, rootMidi: 60 });
let kick = state.project.tracks.find((track) => track.id === kickId);
const activeKickSteps = kick.steps.filter((value) => value > 0).length;
assert(kick.sequenceMode === "notes", "Selected sampler track did not enter piano-roll note mode.");
assert(kick.notes.length === activeKickSteps, "Sampler steps were not rendered as piano-roll notes.");
assert(kick.notes.every((note) => note.midi === 60), "Migrated sampler notes must begin at middle C.");

state = studioReducer(state, {
  type: "ADD_NOTE",
  id: kickId,
  note: { start: 3, duration: 4, midi: 67, velocity: 0.8 },
});
kick = state.project.tracks.find((track) => track.id === kickId);
assert(kick.sequenceMode === "notes", "Drawing a sampler note did not retain piano-roll note mode.");
assert(kick.notes.some((note) => note.start === 3 && note.midi === 67), "Sampler note was not added to the selected track.");

state = studioReducer(state, { type: "TOGGLE_STEP", id: kickId, step: 2 });
kick = state.project.tracks.find((track) => track.id === kickId);
assert(kick.sequenceMode === "steps", "Editing the channel rack did not return the sampler to step mode.");

state = studioReducer(state, {
  type: "ADD_TRACK",
  trackType: "sampler",
  sampleId: firstSample.id,
  sampleName: firstSample.name,
  openPiano: true,
});
let created = state.project.tracks.at(-1);
assert(created.name === firstSample.name, `New sample track should be named "${firstSample.name}", found "${created.name}".`);
assert(created.sampleId === firstSample.id, "New sample track did not receive the selected sample.");
assert(state.project.view === "piano", "New sample track did not open in the piano roll.");

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

// Compile and render the actual JSX through Vite to prove a selected sampler track mounts the full UI.
const vite = await createServer({
  root,
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent",
});
try {
  const { PianoRoll } = await vite.ssrLoadModule("/src/studio/components/PianoRoll.jsx");
  const renderProject = createBlankProject(manifest);
  const selectedSampler = renderProject.tracks[0];
  const markup = renderToStaticMarkup(React.createElement(PianoRoll, {
    project: renderProject,
    track: selectedSampler,
    playhead: 0,
    dispatch: () => {},
    onPreview: () => {},
  }));
  assert(markup.includes(`data-piano-track-id="${selectedSampler.id}"`), "Compiled piano roll did not bind to the selected sampler track.");
  assert(markup.includes("Selected track"), "Compiled piano roll did not render the selected-track banner.");
  assert(markup.includes(selectedSampler.name), "Compiled piano roll did not render the selected track name.");
  assert(markup.includes("piano-grid"), "Compiled selected-track piano-roll grid is missing.");
} finally {
  await vite.close();
}

if (errors.length) {
  console.error("DAW 6.4 validation failed:");
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}

console.log("DAW 6.4 validation passed: selected-track piano-roll mounting, sampler note migration/playback, C0–C9 scale editing, sample-derived titles, and 444 factory WAV assets.");
