import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { createBlankProject } from "../src/studio/state/createProject.js";
import { studioReducer } from "../src/studio/state/studioReducer.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const piano = read("src/studio/components/PianoRoll.jsx");
const reducer = read("src/studio/state/studioReducer.js");
const engine = read("src/studio/audio/AudioEngine.js");
const offline = read("src/studio/audio/offlineRender.js");
const css = read("src/studio/StudioPage.css");

assert(piano.includes('className="note-handle left"'), "Left note-edge resize handle is missing.");
assert(piano.includes('className="note-handle right"'), "Right note-edge resize handle is missing.");
assert(piano.includes('className="note-body"'), "Draggable note center is missing.");
assert(piano.includes('"resize-left"'), "Left-edge stretch mode is missing.");
assert(piano.includes('"resize-right"'), "Right-edge stretch mode is missing.");
assert(piano.includes('"move"'), "Center move mode is missing.");
assert(piano.includes("beginMarquee"), "Marquee selection start handler is missing.");
assert(piano.includes("moveMarquee"), "Marquee selection drag handler is missing.");
assert(piano.includes("marquee-selection"), "Marquee selection visual is missing.");
assert(piano.includes("selectedNoteIds"), "Multi-note selection state is missing.");
assert(piano.includes("Flip time"), "Horizontal flip transform is missing.");
assert(piano.includes("Reflect pitch"), "Vertical pitch reflection is missing.");
assert(piano.includes("Time ×½"), "Time compression tool is missing.");
assert(piano.includes("Time ×2"), "Time expansion tool is missing.");
assert(piano.includes("Pitch compress"), "Pitch compression tool is missing.");
assert(piano.includes("Pitch expand"), "Pitch expansion tool is missing.");
assert(piano.includes("Fill whole roll"), "Whole-piano-roll fill action is missing.");
assert(piano.includes("Scale ascending"), "Ascending scale fill option is missing.");
assert(piano.includes("Scale triads each bar"), "Chord fill option is missing.");
assert(piano.includes("Repeat selection to end"), "Selection repeat fill option is missing.");
assert(piano.includes('type: "SET_PATTERN_BARS"'), "Pattern bar control is not connected to project state.");
assert(piano.includes("patternSteps = patternBars * 16"), "Piano roll does not derive steps from selected bars.");
assert(piano.includes("data-pattern-bars"), "Rendered roll is not tagged with its bar count.");
assert(piano.includes("data-pattern-steps"), "Rendered roll is not tagged with its step count.");
assert(piano.includes("scale-guide-note"), "Selected-scale ghost notes are missing.");
assert(piano.includes("event.button === 2"), "Right-click erase behavior is missing.");
assert(piano.includes('tool !== "draw"'), "Draw/select tool separation is missing.");
assert(reducer.includes('case "SET_PATTERN_BARS"'), "Pattern bar reducer action is missing.");
assert(reducer.includes('case "SET_TRACK_NOTES"'), "Bulk note commit reducer action is missing.");
assert(engine.includes("project.patternBars || 4"), "Realtime engine does not use variable pattern bars.");
assert(offline.includes("project.patternBars || 4"), "Offline renderer does not use variable pattern bars.");
assert(css.includes(".piano-note .note-handle.left"), "Left resize-handle styling is missing.");
assert(css.includes(".piano-note .note-body"), "Move-handle styling is missing.");
assert(css.includes(".selection-surface"), "Selection surface styling is missing.");
assert(css.includes(".marquee-selection"), "Marquee visual styling is missing.");
assert(css.includes("var(--pattern-steps)"), "Dynamic piano-roll width styling is missing.");

const manifest = JSON.parse(read("public/sounds/manifest.json"));
let state = { project: createBlankProject(manifest), playing: false, playhead: 0 };
assert(state.project.patternBars === 4, "New projects must begin with a four-bar piano-roll pattern.");
assert(state.project.version === 6.7, "Project schema version must be 6.7.");

const melodyId = state.project.tracks.find((track) => track.name === "Melody").id;
state = studioReducer(state, { type: "SET_PATTERN_BARS", value: 8 });
assert(state.project.patternBars === 8, "Pattern bars did not increase to eight.");
state = studioReducer(state, {
  type: "SET_TRACK_NOTES",
  trackId: melodyId,
  notes: [
    { id: "a", start: 0, duration: 8, midi: 60, velocity: 0.8 },
    { id: "b", start: 120, duration: 20, midi: 72, velocity: 0.7 },
  ],
});
let melody = state.project.tracks.find((track) => track.id === melodyId);
assert(melody.notes.length === 2, "Bulk note commit did not replace the selected track notes.");
assert(melody.notes[1].start === 120, "Bulk note commit lost an extended-pattern note.");
state = studioReducer(state, { type: "SET_PATTERN_BARS", value: 4 });
melody = state.project.tracks.find((track) => track.id === melodyId);
assert(melody.notes.length === 1, "Shrinking pattern bars must remove notes beyond the new pattern boundary.");

const vite = await createServer({ root, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
try {
  const { PianoRoll } = await vite.ssrLoadModule("/src/studio/components/PianoRoll.jsx");
  const renderProject = createBlankProject(manifest);
  renderProject.patternBars = 8;
  const selectedTrack = renderProject.tracks.find((entry) => entry.name === "Melody");
  const markup = renderToStaticMarkup(React.createElement(PianoRoll, {
    project: renderProject,
    track: selectedTrack,
    playhead: 0,
    dispatch: () => {},
    onPreview: () => {},
  }));
  assert(markup.includes('data-pattern-bars="8"'), "Compiled piano roll did not render the selected eight-bar length.");
  assert(markup.includes('data-pattern-steps="128"'), "Compiled piano roll did not render 128 steps for eight bars.");
  assert(markup.includes("note-handle left"), "Compiled notes do not include a left edge handle.");
  assert(markup.includes("note-handle right"), "Compiled notes do not include a right edge handle.");
  assert(markup.includes("note-body"), "Compiled notes do not include a draggable center.");
  assert(markup.includes("selection-surface"), "Compiled piano roll does not include the marquee selection surface.");
  assert(markup.includes("Fill whole roll"), "Compiled piano roll does not include whole-roll fills.");
  const guideCount = (markup.match(/data-scale-guide-midi=/g) || []).length;
  assert(guideCount === 2048, `Expected 2,048 C-minor ghost guides for eight bars, found ${guideCount}.`);
} finally {
  await vite.close();
}

if (errors.length) {
  console.error("DAW 6.7 validation failed:");
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}

console.log("DAW 6.7 validation passed: edge stretching, center dragging, marquee multi-selection, group move/scale transforms, whole-roll fills, variable 1–16-bar patterns, dynamic playback, and selected-scale ghost notes.");
