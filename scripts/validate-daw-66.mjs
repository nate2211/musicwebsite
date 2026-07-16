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
const studioCss = read("src/studio/StudioPage.css");

assert(piano.includes("const LOW_MIDI = 12"), "Piano roll must begin at C0 (MIDI 12).");
assert(piano.includes("const HIGH_MIDI = 120"), "Piano roll must end at C9 (MIDI 120).");
assert(piano.includes("event.button === 0"), "Left mouse draw handler is missing.");
assert(piano.includes("event.button === 2"), "Right mouse erase handler is missing.");
assert(piano.includes("setNoteLength(resize.duration)"), "Resized duration is not inherited by new notes.");
assert(piano.includes("Selected scale · C0–C9"), "Scale-folded full-range option is missing.");
assert(piano.includes("continueCellInteraction"), "Drag painting and erasing handler is missing.");
assert(piano.includes("erasingRef.current && (event.buttons & 2)"), "Right-drag erasing is missing.");
assert(piano.includes("drawingRef.current && (event.buttons & 1)"), "Left-drag painting is missing.");
assert(piano.includes("showScaleGhosts"), "Scale ghost-note visibility control is missing.");
assert(piano.includes("scale-guide-layer"), "FL-style scale guide layer is missing.");
assert(piano.includes("scale-guide-note"), "Octave-spanning scale ghost-note bars are missing.");
assert(piano.includes("scale-row-highlight"), "Continuous selected-scale row highlighting is missing.");
assert(piano.includes("SCALE_GUIDE_STEPS"), "Beat-aligned scale guide generation is missing.");
assert(piano.includes("data-scale-guide-midi"), "Ghost notes are not tagged by exact MIDI note/octave.");
assert(piano.includes("data-selected-scale-note"), "Selected scale note chips are missing.");
assert(studioCss.includes(".scale-guide-note"), "FL-style scale ghost-note styling is missing.");
assert(studioCss.includes(".scale-row-highlight"), "Scale row highlight styling is missing.");
assert(piano.includes("scaleNoteNames.join"), "Live selected-scale tone legend is missing.");
assert(piano.includes("data-scale-root"), "Rendered piano roll is not tagged with the selected scale root.");
assert(piano.includes("data-scale-name"), "Rendered piano roll is not tagged with the selected scale name.");
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
  assert(markup.includes('data-scale-root="C"'), "Compiled piano roll did not expose the selected root for ghost rendering.");
  assert(markup.includes('data-scale-name="minor"'), "Compiled piano roll did not expose the selected scale for ghost rendering.");
  assert(markup.includes('data-scale-notes="C,D,D#,F,G,G#,A#"'), "Compiled C natural-minor note set is incorrect.");
  assert(markup.includes('data-selected-scale-note="C"'), "Compiled selected-scale root chip is missing.");
  assert(markup.includes('data-selected-scale-note="A#"'), "Compiled selected-scale final tone chip is missing.");
  assert(markup.includes('data-scale-guide-note="C0"'), "C0 root ghost guide is missing.");
  assert(markup.includes('data-scale-guide-note="C4"'), "C4 root ghost guide is missing.");
  assert(markup.includes('data-scale-guide-note="C9"'), "C9 root ghost guide is missing.");
  assert(markup.includes('data-scale-guide-note="D0"'), "D0 scale-tone ghost guide is missing.");
  const guideCount = (markup.match(/data-scale-guide-midi=/g) || []).length;
  assert(guideCount === 1024, `Expected 1,024 C-minor beat ghost notes across C0–C9, found ${guideCount}.`);
  const scaleRowCount = (markup.match(/data-scale-midi=/g) || []).length;
  assert(scaleRowCount === 64, `Expected 64 C-minor pitch rows across C0–C9, found ${scaleRowCount}.`);

  const dMajorProject = { ...renderProject, key: 2, scale: "major" };
  const dMajorMarkup = renderToStaticMarkup(React.createElement(PianoRoll, {
    project: dMajorProject,
    track: selectedSampler,
    playhead: 0,
    dispatch: () => {},
    onPreview: () => {},
  }));
  assert(dMajorMarkup.includes('data-scale-root="D"'), "Changing the selected key note did not update ghost-note rendering.");
  assert(dMajorMarkup.includes('data-scale-name="major"'), "Changing the selected scale did not update ghost-note rendering.");
  assert(dMajorMarkup.includes('data-scale-notes="D,E,F#,G,A,B,C#"'), "D-major scale notes are not rendered correctly.");
  assert(dMajorMarkup.includes('data-scale-guide-note="D0"'), "D-major root guide does not repeat from D0.");
  assert(dMajorMarkup.includes('data-scale-guide-note="D8"'), "D-major root guide does not repeat through upper octaves.");
  assert(!dMajorMarkup.includes('data-scale-guide-note="D#4"'), "Out-of-scale D# ghost guide rendered for D major.");
} finally {
  await vite.close();
}

if (errors.length) {
  console.error("DAW 6.6 validation failed:");
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}

console.log("DAW 6.6 validation passed: FL-style scale highlighting, octave-spanning selected-scale ghost notes, left-draw/right-erase gestures, selected-track mounting, sampler note playback, sample-derived titles, and 444 factory WAV assets.");
