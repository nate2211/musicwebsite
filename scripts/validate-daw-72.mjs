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
const trackSidebarSource = read("src/studio/components/TrackSidebar.jsx");
const trackHeaderSource = read("src/studio/components/TrackHeader.jsx");
const browserSource = read("src/studio/components/BrowserPanel.jsx");
const soundDesignerSource = read("src/studio/components/SoundDesigner.jsx");
const synthDefaultsSource = read("src/studio/audio/synthDefaults.js");
const voicesSource = read("src/studio/audio/voices.js");
const controlsSource = read("src/studio/components/Controls.jsx");
const topBarSource = read("src/studio/components/TopBar.jsx");
const studioPageSource = read("src/studio/StudioPage.jsx");
const sampleLabSource = read("src/studio/components/SampleLab.jsx");
const sampleLibrarySource = read("src/studio/state/sampleLibrary.js");
const sampleToolsSource = read("src/studio/audio/sampleTools.js");
const presetLibrarySource = read("src/studio/data/presetLibrary.js");

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
assert(piano.includes("const PianoRow = React.memo"), "Piano-roll pitch rows are not memoized.");
assert(piano.includes("const PianoNoteBlock = React.memo"), "Piano-roll note objects are not memoized.");
assert(piano.includes("optimized-note-row"), "Optimized row-based piano-roll renderer is missing.");
assert(piano.includes("notesByMidi"), "Indexed pitch hit detection is missing.");
assert(piano.includes("notesById"), "Indexed note lookup is missing.");
assert(piano.includes("requestAnimationFrame"), "Animation-frame drag throttling is missing.");
assert(piano.includes("translate3d"), "GPU-positioned note rendering is missing.");
assert(!piano.includes("Array.from({ length: patternSteps"), "Legacy per-step button rendering remains in the piano roll.");
assert(piano.includes("Per-note envelope"), "Per-note envelope editor is missing.");
assert(piano.includes("applyEnvelopePatch"), "Per-note envelope update handler is missing.");
assert(piano.includes("resetSelectedEnvelopes"), "Per-note envelope reset action is missing.");
assert(voicesSource.includes("transport.noteEnvelope"), "Synth voices do not consume per-note envelopes.");
assert(voicesSource.includes("track.noteEnvelope"), "Sampler voices do not consume per-note envelopes.");
assert(engine.includes("noteEnvelope: note.envelope"), "Realtime scheduler does not forward per-note envelopes.");
assert(offline.includes("noteEnvelope: note.envelope"), "Offline renderer does not forward per-note envelopes.");
assert(css.includes(".optimized-note-row"), "Optimized piano-row styling is missing.");
assert(css.includes(".note-envelope-editor"), "Per-note envelope editor styling is missing.");
assert(css.includes(".note-envelope-curve"), "Per-note envelope visualization styling is missing.");
assert(css.includes(".piano-playhead-line"), "Single playhead-layer styling is missing.");


assert(trackSidebarSource.includes("Add synthesizer"), "Track-list synthesizer preset dropdown is missing.");
assert(trackSidebarSource.includes("Manage tracks…"), "Bulk track-management dropdown is missing.");
assert(trackSidebarSource.includes("Mute selected"), "Mute-selected track action is missing.");
assert(trackSidebarSource.includes('value="delete-all"'), "Delete-all-tracks dropdown action is missing.");
assert(trackHeaderSource.includes("track-batch-toggle"), "Per-track bulk-selection toggle is missing.");
assert(browserSource.includes("onAddPresetTrack"), "Preset browser cannot add a synth directly as a track.");
assert(browserSource.includes("Add ${preset.name} as a new synthesizer track"), "Preset add-to-track-list control is missing.");
assert(reducer.includes('case "TOGGLE_TRACK_SELECTION"'), "Track batch selection reducer action is missing.");
assert(reducer.includes('case "MUTE_SELECTED_TRACKS"'), "Mute-selected reducer action is missing.");
assert(reducer.includes('case "MUTE_ALL_TRACKS"'), "Mute-all reducer action is missing.");
assert(reducer.includes('case "DELETE_SELECTED_TRACKS"'), "Delete-selected reducer action is missing.");
assert(reducer.includes('case "DELETE_ALL_TRACKS"'), "Delete-all reducer action is missing.");
assert(soundDesignerSource.includes('value: "layers"'), "Layer Engine synth page is missing.");
assert(soundDesignerSource.includes("Spectral Layer A"), "Spectral layer A controls are missing.");
assert(soundDesignerSource.includes("Procedural Texture Bed"), "Procedural texture layer controls are missing.");
assert(synthDefaultsSource.includes("SYNTH_LAYER_DEFAULTS"), "Enterprise spectral-layer defaults are missing.");
assert(synthDefaultsSource.includes("textureLayer"), "Procedural texture-layer defaults are missing.");
assert(voicesSource.includes('sourceKind: "layer"'), "Realtime synth engine does not schedule spectral layers.");
assert(voicesSource.includes("textureHighpass"), "Realtime synth engine does not schedule the texture bed.");
assert(css.includes(".track-bulk-toolbar"), "Bulk track-management styling is missing.");
assert(css.includes(".layer-engine-grid"), "Layer Engine styling is missing.");
assert(controlsSource.includes("onPointerDown={beginDrag}"), "Rotary knobs do not start pointer dragging.");
assert(controlsSource.includes("setPointerCapture"), "Rotary knobs do not retain drag capture outside their face.");
assert(controlsSource.includes("event.shiftKey ? 0.1"), "Rotary knobs are missing Shift fine adjustment.");
assert(controlsSource.includes('role="slider"'), "Rotary knobs are missing accessible slider semantics.");
assert(controlsSource.includes("ArrowUp") && controlsSource.includes("PageDown"), "Rotary knobs are missing keyboard adjustment.");
assert(topBarSource.includes('className="master-volume-slider"'), "Top bar master-volume slider is missing.");
assert(topBarSource.includes('onField("masterVolume"'), "Master-volume slider is not connected to project state.");
assert(studioPageSource.includes("engineRef.current?.sync(project)"), "Master-volume changes are not synchronized into the realtime engine.");
assert(engine.includes("project.masterVolume ?? 0.85"), "Realtime master gain does not use project master volume.");
assert(offline.includes("project.masterVolume ?? 0.85"), "Offline rendering does not use project master volume.");
assert(css.includes(".knob.dragging .knob-face"), "Dragged-knob visual feedback is missing.");
assert(css.includes(".master-volume-track"), "Master-volume slider styling is missing.");

assert(browserSource.includes("Upload samples"), "Sample upload control is missing from the browser.");
assert(browserSource.includes("Upload drums"), "Drum upload control is missing from the browser.");
assert(browserSource.includes("Import presets"), "Preset import control is missing from the browser.");
assert(browserSource.includes("Drop local audio here"), "Audio drag-and-drop track creation is missing.");
assert(trackSidebarSource.includes("Add local audio tracks"), "Direct local-file track creation is missing from the track list.");
assert(sampleLibrarySource.includes("indexedDB.open"), "Imported audio is not persisted in IndexedDB.");
assert(sampleLibrarySource.includes("saveRenderedUserSample"), "Rasterized audio cannot be saved to the local sample library.");
assert(sampleToolsSource.includes("createEvenSlices"), "Even sample slicing utility is missing.");
assert(sampleToolsSource.includes("buildSlicePattern"), "Slice-pattern generation utility is missing.");
assert(sampleToolsSource.includes("rasterizeAudioBuffer"), "Sample rasterization utility is missing.");
assert(sampleLabSource.includes("Sample Lab"), "Dedicated Sample Lab screen is missing.");
assert(sampleLabSource.includes("Rasterize selection"), "Sample rasterization control is missing.");
assert(sampleLabSource.includes("Create piano-roll slice pattern"), "Slice-to-pattern control is missing.");
assert(sampleLabSource.includes("slice-cut-handle"), "Draggable sample cut handles are missing.");
assert(sampleLabSource.includes("Loop selected region"), "Sample loop-region control is missing.");
assert(presetLibrarySource.includes("warmDigitalPreset"), "Warm digital factory-preset voicing is missing.");
assert(presetLibrarySource.includes("bitcrush: Math.min(0.012"), "Factory patches are not protected from harsh bit-crushing.");
assert(presetLibrarySource.includes("softTone"), "Soft Warm preset tone metadata is missing.");
assert(presetLibrarySource.includes("presenceDipDb"), "Soft Warm upper-mid smoothing profile is missing.");
assert(voicesSource.includes("presenceDip.type = \"peaking\""), "Realtime synth voices are missing the soft presence-dip stage.");
assert(voicesSource.includes("airFilter.type = \"lowpass\""), "Realtime synth voices are missing the silk air filter.");
assert(voicesSource.includes("softTone.outputTrim"), "Realtime synth voices are missing gentle preset output trim.");
assert(voicesSource.includes("track.sampleLoopEnabled"), "Realtime sample voices do not loop selected regions.");
assert(voicesSource.includes("track.sampleSlices"), "Realtime sample voices do not resolve slice cuts.");
assert(engine.includes("note.sliceIndex"), "Realtime sequencer does not schedule sample slices.");
assert(offline.includes("note.sliceIndex"), "Offline renderer does not schedule sample slices.");
assert(css.includes(".sample-waveform-editor"), "Sample waveform styling is missing.");
assert(css.includes(".browser-panel.dragging-files"), "File-drop feedback styling is missing.");

const manifest = JSON.parse(read("public/sounds/manifest.json"));
let state = { project: createBlankProject(manifest), playing: false, playhead: 0 };
assert(state.project.patternBars === 4, "New projects must begin with a four-bar piano-roll pattern.");
assert(state.project.version === 7.2, "Project schema version must be 7.2.");
assert(state.project.selectedTrackIds.length === 1, "New projects must initialize bulk selection with the active track.");

const originalTrackCount = state.project.tracks.length;
state = studioReducer(state, {
  type: "ADD_TRACK",
  trackType: "synth",
  presetId: "preset-169",
  presetName: "Ethereal Horizon",
  color: "#8ba4ff",
  openPiano: true,
});
const addedSynth = state.project.tracks.at(-1);
assert(state.project.tracks.length === originalTrackCount + 1, "Adding a synthesizer did not append it to the track list.");
assert(addedSynth.type === "synth" && addedSynth.presetId === "preset-169", "Added synthesizer did not retain its selected preset.");
assert(addedSynth.name === "Ethereal Horizon", "Added synthesizer track was not named after its preset.");
assert(state.project.arrangement.some((clip) => clip.trackId === addedSynth.id), "New synth track did not receive a playable arrangement clip.");
assert(state.project.selectedTrackIds.length === 1 && state.project.selectedTrackIds[0] === addedSynth.id, "New synth track was not selected in the track list.");

const kickId = state.project.tracks.find((track) => track.name === "Kick").id;
state = studioReducer(state, { type: "TOGGLE_TRACK_SELECTION", id: kickId });
assert(state.project.selectedTrackIds.includes(kickId) && state.project.selectedTrackIds.includes(addedSynth.id), "Track multi-selection did not retain both chosen tracks.");
state = studioReducer(state, { type: "MUTE_SELECTED_TRACKS", value: true });
assert(state.project.tracks.find((track) => track.id === kickId).mute, "Mute selected did not mute the selected Kick track.");
assert(state.project.tracks.find((track) => track.id === addedSynth.id).mute, "Mute selected did not mute the selected synth track.");
state = studioReducer(state, { type: "MUTE_SELECTED_TRACKS", value: false });
assert(!state.project.tracks.find((track) => track.id === kickId).mute, "Unmute selected did not restore the selected Kick track.");
state = studioReducer(state, { type: "MUTE_ALL_TRACKS", value: true });
assert(state.project.tracks.every((track) => track.mute), "Mute all did not mute every track.");
state = studioReducer(state, { type: "MUTE_ALL_TRACKS", value: false });
assert(state.project.tracks.every((track) => !track.mute), "Unmute all did not restore every track.");
state = studioReducer(state, { type: "DELETE_SELECTED_TRACKS" });
assert(!state.project.tracks.some((track) => track.id === kickId || track.id === addedSynth.id), "Delete selected did not remove every selected track.");
assert(!state.project.arrangement.some((clip) => clip.trackId === kickId || clip.trackId === addedSynth.id), "Delete selected left orphan arrangement clips.");

const melodyId = state.project.tracks.find((track) => track.name === "Melody").id;
state = studioReducer(state, { type: "SET_PATTERN_BARS", value: 8 });
assert(state.project.patternBars === 8, "Pattern bars did not increase to eight.");
state = studioReducer(state, {
  type: "SET_TRACK_NOTES",
  trackId: melodyId,
  notes: [
    { id: "a", start: 0, duration: 8, midi: 60, velocity: 0.8, envelope: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 0.7, gain: 0.85 } },
    { id: "b", start: 120, duration: 20, midi: 72, velocity: 0.7 },
  ],
});
let melody = state.project.tracks.find((track) => track.id === melodyId);
assert(melody.notes.length === 2, "Bulk note commit did not replace the selected track notes.");
assert(melody.notes[1].start === 120, "Bulk note commit lost an extended-pattern note.");
state = studioReducer(state, { type: "SET_PATTERN_BARS", value: 4 });
melody = state.project.tracks.find((track) => track.id === melodyId);
assert(melody.notes.length === 1, "Shrinking pattern bars must remove notes beyond the new pattern boundary.");
assert(melody.notes[0].envelope?.release === 0.7 && melody.notes[0].envelope?.gain === 0.85, "Per-note envelope data was not preserved through reducer edits.");

const importedSample = { id: "user-sample-test", name: "Warm Drum Loop", category: "User Drums", subtype: "User Drums", duration: 2, user: true, url: "blob:test" };
state = studioReducer(state, { type: "ADD_SAMPLES", samples: [importedSample] });
assert(state.project.samples.some((sample) => sample.id === importedSample.id), "Imported audio was not added to project samples.");
state = studioReducer(state, { type: "ADD_TRACK", trackType: "sampler", sampleId: importedSample.id, sampleName: importedSample.name });
const importedTrack = state.project.tracks.at(-1);
assert(importedTrack.sampleId === importedSample.id && importedTrack.name === "Warm Drum Loop", "Imported audio did not create a correctly named track.");
assert(Array.isArray(importedTrack.sampleSlices), "Imported sampler track is missing slice state.");

const { createEvenSlices, buildSlicePattern } = await import("../src/studio/audio/sampleTools.js");
const slices = createEvenSlices(4, 8, 0, 4);
assert(slices.length === 8 && slices[0].start === 0 && slices.at(-1).end === 4, "Even slicing did not cover the full loop.");
const slicePattern = buildSlicePattern(slices, { patternSteps: 64, spacing: 4, mode: "forward" });
assert(slicePattern.length === 16, "Slice pattern did not fill the four-bar piano roll at beat spacing.");
assert(slicePattern.every((note) => Number.isInteger(note.sliceIndex)), "Generated slice notes are missing slice indexes.");

const { getAllPresets } = await import("../src/studio/data/presetLibrary.js");
const warmedPresets = getAllPresets(state.project).slice(0, 240);
assert(warmedPresets.every((preset) => preset.warmDigital && preset.softWarm), "Factory presets are not marked with Soft Warm voicing.");
assert(warmedPresets.every((preset) => (preset.voiceFx?.bitcrush || 0) <= 0.012), "One or more factory presets remain excessively bit-crushed.");
assert(warmedPresets.every((preset) => (preset.voiceFx?.saturation || 0) <= 0.085), "One or more factory presets retain aggressive saturation.");
assert(warmedPresets.every((preset) => (preset.filter1?.resonance || 0) <= 1.55), "One or more factory presets retain harsh filter resonance.");
assert(warmedPresets.every((preset) => (preset.filter1?.cutoff || 0) <= 7600), "One or more factory presets retain an overly bright primary filter.");
assert(warmedPresets.every((preset) => (preset.fm?.amount || 0) <= 0.075), "One or more factory presets retain excessive FM intensity.");
assert(warmedPresets.every((preset) => (preset.ring?.amount || 0) <= 0.055), "One or more factory presets retain excessive ring modulation.");
assert(warmedPresets.every((preset) => (preset.layers || []).every((layer) => (layer.level || 0) <= 0.16)), "One or more factory spectral layers remain too loud.");
assert(warmedPresets.every((preset) => (preset.softTone?.outputTrim || 1) <= 0.82), "One or more factory presets are missing gentle output trim.");

const presetModule = await import("../src/studio/data/instrumentPresets.js");
const factoryPresets = presetModule.INSTRUMENT_PRESETS;
assert(factoryPresets.length === 240, `Expected 240 enterprise factory presets, found ${factoryPresets.length}.`);
for (const category of ["Atmosphere", "Cinematic", "Hybrid", "Choir", "World", "Motion"]) {
  assert(factoryPresets.some((preset) => preset.category === category), `Missing ${category} preset category.`);
}
assert(factoryPresets.every((preset) => Array.isArray(preset.layers) && preset.layers.length === 2), "Every factory preset must contain two spectral layers.");
assert(factoryPresets.every((preset) => preset.textureLayer), "Every factory preset must include texture-layer settings.");
assert(factoryPresets.filter((preset) => preset.layers.every((layer) => layer.enabled)).length >= 72, "The expanded preset bank does not contain enough fully layered instruments.");

const vite = await createServer({ root, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
try {
  const { PianoRoll } = await vite.ssrLoadModule("/src/studio/components/PianoRoll.jsx");
  const { TrackSidebar } = await vite.ssrLoadModule("/src/studio/components/TrackSidebar.jsx");
  const { BrowserPanel } = await vite.ssrLoadModule("/src/studio/components/BrowserPanel.jsx");
  const { SoundDesigner } = await vite.ssrLoadModule("/src/studio/components/SoundDesigner.jsx");
  const { Knob } = await vite.ssrLoadModule("/src/studio/components/Controls.jsx");
  const { TopBar } = await vite.ssrLoadModule("/src/studio/components/TopBar.jsx");
  const { SampleLab } = await vite.ssrLoadModule("/src/studio/components/SampleLab.jsx");
  const renderProject = createBlankProject(manifest);
  renderProject.patternBars = 8;
  const selectedTrack = renderProject.tracks.find((entry) => entry.name === "Melody");
  selectedTrack.notes[0] = { ...selectedTrack.notes[0], envelope: { attack: 0.04, decay: 0.2, sustain: 0.55, release: 0.8, gain: 0.9 } };
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
  const rowCount = (markup.match(/optimized-note-row/g) || []).length;
  const buttonCount = (markup.match(/<button/g) || []).length;
  assert(guideCount === 64, `Expected 64 CSS-repeated C-minor scale-guide rows, found ${guideCount}.`);
  assert(rowCount === 109, `Expected one optimized row for each C0-C9 pitch, found ${rowCount}.`);
  assert(buttonCount < 200, `Optimized eight-bar piano roll rendered ${buttonCount} buttons; expected fewer than 200.`);
  assert(markup.includes("piano-playhead-line"), "Compiled piano roll is missing its single playhead layer.");
  assert(markup.includes("Per-note envelope"), "Compiled piano roll is missing the per-note envelope editor.");
  assert(markup.includes('data-note-envelope="custom"'), "Compiled note does not expose its custom envelope state.");
  assert(markup.includes("note-envelope-curve"), "Compiled note does not render its envelope visualization.");

  const sidebarMarkup = renderToStaticMarkup(React.createElement(TrackSidebar, {
    project: renderProject,
    dispatch: () => {},
    onSelectTrack: () => {},
  }));
  assert(sidebarMarkup.includes("Add synthesizer"), "Compiled track sidebar does not render the synthesizer selector.");
  assert(sidebarMarkup.includes("Manage tracks"), "Compiled track sidebar does not render bulk track actions.");
  assert((sidebarMarkup.match(/track-batch-toggle/g) || []).length === renderProject.tracks.length, "Compiled track list is missing a selection toggle for one or more tracks.");

  const browserMarkup = renderToStaticMarkup(React.createElement(BrowserPanel, {
    project: renderProject,
    selectedTrack: renderProject.tracks[0],
    onAssignSample: () => {},
    onAddSampleTrack: () => {},
    onAssignPreset: () => {},
    onApplyKit: () => {},
    onPreviewSample: () => {},
    onPreviewPreset: () => {},
    onAddTrack: () => {},
    onAddPresetTrack: () => {},
  }));
  assert(browserMarkup.includes("Presets"), "Compiled browser does not render its Presets tab.");

  const knobMarkup = renderToStaticMarkup(React.createElement(Knob, {
    label: "Cutoff",
    value: 1200,
    min: 20,
    max: 20000,
    step: 1,
    onChange: () => {},
  }));
  assert(knobMarkup.includes('role="slider"'), "Compiled knob is missing slider semantics.");
  assert(knobMarkup.includes('aria-valuenow="1200"'), "Compiled knob does not expose its current value.");

  const topBarMarkup = renderToStaticMarkup(React.createElement(TopBar, {
    project: renderProject,
    playing: false,
    playhead: 0,
    onPlay: () => {},
    onStop: () => {},
    onField: () => {},
    onSave: () => {},
    onOpen: () => {},
    onExport: () => {},
    onRender: () => {},
    rendering: false,
    midiStatus: "Ready",
  }));
  assert(topBarMarkup.includes('aria-label="Master volume"'), "Compiled top bar does not render the master-volume slider.");
  assert(topBarMarkup.includes("82%"), "Compiled master-volume slider does not display the project level.");

  const synthTrack = renderProject.tracks.find((track) => track.type === "synth");
  const designerMarkup = renderToStaticMarkup(React.createElement(SoundDesigner, {
    project: renderProject,
    track: synthTrack,
    dispatch: () => {},
    onPreview: () => {},
  }));
  assert(designerMarkup.includes("Layer Engine"), "Compiled Synth Lab does not render the Layer Engine tab.");

  const samplerTrack = renderProject.tracks.find((entry) => entry.type === "sampler");
  const samplerSource = renderProject.samples.find((entry) => entry.id === samplerTrack.sampleId);
  const sampleMarkup = renderToStaticMarkup(React.createElement(SampleLab, {
    project: renderProject,
    track: { ...samplerTrack, sampleSlices: createEvenSlices(samplerSource.duration || 2, 8, 0, samplerSource.duration || 2) },
    sample: samplerSource,
    dispatch: () => {},
    onGetSampleBuffer: async () => null,
    onRasterize: () => {},
    onImportAudio: () => {},
    onPreviewSlice: () => {},
  }));
  assert(sampleMarkup.includes("Rasterize selection"), "Compiled Sample Lab does not render rasterization controls.");
  assert(sampleMarkup.includes("Create piano-roll slice pattern"), "Compiled Sample Lab does not render slice pattern generation.");
  assert((sampleMarkup.match(/slice-cut-handle/g) || []).length === 7, "Compiled Sample Lab did not render the expected cut handles.");
} finally {
  await vite.close();
}

if (errors.length) {
  console.error("DAW 7.2 validation failed:");
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}

console.log("DAW 7.2 validation passed: optimized memoized row rendering, indexed note hit detection, GPU note positioning, animation-frame drag throttling, a single playhead/scale-guide layer, per-note ADSR and gain overrides for synth and sampler tracks, realtime/offline envelope scheduling, plus all DAW 7.1 sampling, track, synth, mastering, and piano-roll workflows.");
