import { cloneProject, createBlankProject, defaultFx, emptySteps, uid } from "./createProject.js";

const touch = (project) => ({ ...project, updatedAt: new Date().toISOString() });

const cleanSampleTrackName = (sampleName) => String(sampleName || "Sample").trim() || "Sample";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const nextSampleTrackName = (tracks = [], sampleName = "Sample", excludeTrackId = null) => {
  const baseName = cleanSampleTrackName(sampleName);
  const pattern = new RegExp(`^${escapeRegExp(baseName)}(?: \\((\\d+)\\))?$`, "i");
  let highest = 0;

  for (const track of tracks) {
    if (track.id === excludeTrackId) continue;
    const match = pattern.exec(String(track.name || "").trim());
    if (!match) continue;
    highest = Math.max(highest, match[1] ? Number(match[1]) : 1);
  }

  return highest === 0 ? baseName : `${baseName} (${highest + 1})`;
};

export function studioReducer(state, action) {
  const project = state.project;
  switch (action.type) {
    case "LOAD_PROJECT": {
      const loadedProject = {
        customPresets: [],
        automation: [],
        patternBars: 4,
        selectedTrackIds: [],
        ...action.project,
        version: 8.8,
      };
      loadedProject.master = { ...createBlankProject([]).master, ...(loadedProject.master || {}) };
      const loadedTracks = (loadedProject.tracks || []).map((track) => ({
        ...(track.type === "sampler" ? {
          sampleLoopEnabled: false,
          sampleLoopStart: 0,
          sampleLoopEnd: 5,
          sampleSlices: [],
          samplePatternSpacing: 4,
          samplePatternMode: "forward",
        } : {}),
        ...track,
        mixer: { volume: 0.75, pan: 0, ...(track.mixer || {}) },
        effects: { ...defaultFx(), ...(track.effects || {}) },
      }));
      loadedProject.tracks = loadedTracks;
      const selectedTrackId = loadedTracks.some((track) => track.id === loadedProject.selectedTrackId)
        ? loadedProject.selectedTrackId
        : loadedTracks[0]?.id || null;
      const restoredTrackIds = (loadedProject.selectedTrackIds || [])
        .filter((id) => loadedTracks.some((track) => track.id === id));
      const selectedTrackIds = restoredTrackIds.length
        ? restoredTrackIds
        : (selectedTrackId ? [selectedTrackId] : []);
      return {
        ...state,
        project: { ...loadedProject, selectedTrackId, selectedTrackIds },
        playing: false,
        playhead: 0,
      };
    }
    case "ADD_SAMPLES": {
      const existing = new Map((project.samples || []).map((sample) => [sample.id, sample]));
      (action.samples || []).forEach((sample) => { if (sample?.id) existing.set(sample.id, sample); });
      return { ...state, project: touch({ ...project, samples: [...existing.values()] }) };
    }
    case "REMOVE_SAMPLE": {
      if ((project.tracks || []).some((track) => track.sampleId === action.sampleId)) return state;
      return { ...state, project: touch({ ...project, samples: (project.samples || []).filter((sample) => sample.id !== action.sampleId) }) };
    }
    case "IMPORT_CUSTOM_PRESETS": {
      const existing = new Map((project.customPresets || []).map((preset) => [preset.id, preset]));
      (action.presets || []).forEach((preset) => { if (preset?.id) existing.set(preset.id, preset); });
      return { ...state, project: touch({ ...project, customPresets: [...existing.values()] }) };
    }
    case "SET_PROJECT_FIELD":
      return { ...state, project: touch({ ...project, [action.field]: action.value }) };
    case "SET_PATTERN_BARS": {
      const patternBars = Math.max(1, Math.min(16, Number(action.value) || 4));
      const patternSteps = patternBars * 16;
      return {
        ...state,
        project: touch({
          ...project,
          patternBars,
          loopBars: Math.max(Number(project.loopBars || 4), patternBars),
          tracks: project.tracks.map((track) => ({
            ...track,
            notes: (track.notes || [])
              .filter((note) => note.start < patternSteps)
              .map((note) => ({
                ...note,
                duration: Math.max(1, Math.min(note.duration || 1, patternSteps - note.start)),
              })),
          })),
        }),
      };
    }
    case "SET_VIEW":
      return { ...state, project: { ...project, view: action.view } };
    case "SET_PLAYING":
      return { ...state, playing: action.value };
    case "SET_PLAYHEAD":
      return { ...state, playhead: action.value };
    case "SELECT_TRACK":
      return {
        ...state,
        project: {
          ...project,
          selectedTrackId: action.id,
          selectedTrackIds: action.keepBatchSelection
            ? (project.selectedTrackIds || [])
            : [action.id],
          view: action.openPiano ? "piano" : project.view,
        },
      };
    case "TOGGLE_TRACK_SELECTION": {
      const selected = new Set(project.selectedTrackIds || []);
      if (selected.has(action.id)) selected.delete(action.id);
      else selected.add(action.id);
      return {
        ...state,
        project: { ...project, selectedTrackIds: [...selected] },
      };
    }
    case "SELECT_ALL_TRACKS":
      return {
        ...state,
        project: { ...project, selectedTrackIds: project.tracks.map((track) => track.id) },
      };
    case "CLEAR_TRACK_SELECTION":
      return { ...state, project: { ...project, selectedTrackIds: [] } };
    case "MUTE_SELECTED_TRACKS": {
      const selected = new Set(project.selectedTrackIds || []);
      if (!selected.size) return state;
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => selected.has(track.id)
            ? { ...track, mute: action.value !== false }
            : track),
        }),
      };
    }
    case "MUTE_ALL_TRACKS":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => ({ ...track, mute: action.value !== false })),
        }),
      };
    case "UPDATE_TRACK": {
      const manuallyRenamed = Object.prototype.hasOwnProperty.call(action.patch || {}, "name");
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => track.id === action.id
            ? {
              ...track,
              ...action.patch,
              ...(manuallyRenamed ? { autoNameFromSample: false } : {}),
            }
            : track),
        }),
      };
    }
    case "UPDATE_TRACK_NESTED":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => track.id === action.id
            ? { ...track, [action.key]: { ...(track[action.key] || {}), ...action.patch } }
            : track),
        }),
      };
    case "TOGGLE_STEP":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => {
            if (track.id !== action.id) return track;
            const steps = [...(track.steps || emptySteps())];
            const current = steps[action.step] || 0;
            steps[action.step] = action.velocity ?? (current > 0 ? 0 : 0.78);
            return { ...track, steps, sequenceMode: track.type === "sampler" ? "steps" : track.sequenceMode };
          }),
        }),
      };
    case "PAINT_STEP":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => {
            if (track.id !== action.id) return track;
            const steps = [...(track.steps || emptySteps())];
            steps[action.step] = action.velocity;
            return { ...track, steps, sequenceMode: track.type === "sampler" ? "steps" : track.sequenceMode };
          }),
        }),
      };
    case "CLEAR_TRACK":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => track.id === action.id
            ? {
              ...track,
              steps: track.type === "sampler" ? emptySteps() : track.steps,
              notes: [],
              sequenceMode: track.type === "sampler" ? "steps" : track.sequenceMode,
            }
            : track),
        }),
      };
    case "ADD_NOTE":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => track.id === action.id
            ? {
              ...track,
              notes: [...(track.notes || []), { id: uid("note"), ...action.note }],
              sequenceMode: track.type === "sampler" ? "notes" : track.sequenceMode,
            }
            : track),
        }),
      };
    case "UPDATE_NOTE":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => track.id === action.trackId
            ? {
              ...track,
              notes: (track.notes || []).map((note) => note.id === action.noteId ? { ...note, ...action.patch } : note),
              sequenceMode: track.type === "sampler" ? "notes" : track.sequenceMode,
            }
            : track),
        }),
      };
    case "DELETE_NOTE":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => track.id === action.trackId
            ? {
              ...track,
              notes: (track.notes || []).filter((note) => note.id !== action.noteId),
              sequenceMode: track.type === "sampler" ? "notes" : track.sequenceMode,
            }
            : track),
        }),
      };
    case "SET_TRACK_NOTES":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => track.id === action.trackId
            ? {
              ...track,
              notes: action.notes || [],
              sequenceMode: track.type === "sampler" ? "notes" : track.sequenceMode,
            }
            : track),
        }),
      };
    case "MIGRATE_SAMPLER_PATTERN_TO_NOTES":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => {
            if (track.id !== action.id || track.type !== "sampler") return track;
            const existingNotes = track.notes || [];
            const notes = existingNotes.length
              ? existingNotes
              : (track.steps || emptySteps()).flatMap((stepVelocity, start) => (stepVelocity > 0
                ? [{
                  id: uid("note"),
                  start,
                  duration: 1,
                  midi: action.rootMidi ?? 60,
                  velocity: stepVelocity,
                }]
                : []));
            return { ...track, notes, sequenceMode: "notes" };
          }),
        }),
      };
    case "ASSIGN_SAMPLE": {
      const sample = project.samples.find((entry) => entry.id === action.sampleId);
      const sampleName = action.sampleName || sample?.name || "Sample";
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => {
            if (track.id !== action.id) return track;
            const switchingToSampler = track.type !== "sampler";
            const shouldAutoName = switchingToSampler
              || track.autoNameFromSample === true
              || /^(New Sampler|New Instrument|Samples(?:\s+\d+)?)$/i.test(track.name || "");
            return {
              ...track,
              type: "sampler",
              sampleId: action.sampleId,
              steps: track.steps || emptySteps(),
              startOffset: 0,
              endOffset: sample?.duration || track.endOffset || 5,
              sampleLoopStart: 0,
              sampleLoopEnd: sample?.duration || track.sampleLoopEnd || track.endOffset || 5,
              sampleSlices: [],
              name: shouldAutoName
                ? nextSampleTrackName(project.tracks, sampleName, track.id)
                : track.name,
              autoNameFromSample: shouldAutoName ? true : track.autoNameFromSample,
              sequenceMode: switchingToSampler
                ? ((track.notes || []).length ? "notes" : "steps")
                : (track.sequenceMode || "steps"),
            };
          }),
        }),
      };
    }
    case "ADD_TRACK": {
      const selectedSample = project.samples.find((entry) => entry.id === action.sampleId) || project.samples[0];
      const sampleName = action.sampleName || selectedSample?.name || "Sample";
      const presetName = String(action.presetName || "New Instrument").trim() || "New Instrument";
      const track = {
        id: uid("track"),
        name: action.trackType === "sampler"
          ? nextSampleTrackName(project.tracks, sampleName)
          : nextSampleTrackName(project.tracks, presetName),
        type: action.trackType,
        color: action.color || "#69d4ff",
        sampleId: selectedSample?.id,
        autoNameFromSample: action.trackType === "sampler",
        presetId: action.presetId || "preset-001",
        steps: emptySteps(),
        notes: [],
        mixer: { volume: 0.75, pan: 0 },
        effects: defaultFx(),
        synth: {},
        pitch: 0,
        startOffset: 0,
        endOffset: selectedSample?.duration || 5,
        sampleAttack: 0.001,
        sampleRelease: 0.04,
        sampleCutoff: 20000,
        sampleResonance: 0.2,
        sampleFilterType: "lowpass",
        samplePan: 0,
        reverse: false,
        sampleLoopEnabled: false,
        sampleLoopStart: 0,
        sampleLoopEnd: selectedSample?.duration || 5,
        sampleSlices: [],
        samplePatternSpacing: 4,
        samplePatternMode: "forward",
        mute: false,
        solo: false,
        useArrangement: true,
        sequenceMode: action.trackType === "sampler" ? "steps" : "notes",
      };
      return {
        ...state,
        project: touch({
          ...project,
          tracks: [...project.tracks, track],
          arrangement: [...(project.arrangement || []), {
            id: uid("clip"),
            trackId: track.id,
            startBar: 0,
            lengthBars: Math.max(project.patternBars || 4, project.loopBars || 4),
            name: "Pattern A",
          }],
          selectedTrackId: track.id,
          selectedTrackIds: [track.id],
          view: action.openPiano ? "piano" : project.view,
        }),
      };
    }
    case "DELETE_TRACK": {
      const deletedIndex = project.tracks.findIndex((track) => track.id === action.id);
      const tracks = project.tracks.filter((track) => track.id !== action.id);
      const nextTrack = tracks[Math.min(Math.max(0, deletedIndex), Math.max(0, tracks.length - 1))] || tracks[0] || null;
      return {
        ...state,
        project: touch({
          ...project,
          tracks,
          arrangement: project.arrangement.filter((clip) => clip.trackId !== action.id),
          automation: (project.automation || []).filter((lane) => lane.trackId !== action.id),
          selectedTrackId: project.selectedTrackId === action.id ? nextTrack?.id || null : project.selectedTrackId,
          selectedTrackIds: (project.selectedTrackIds || []).filter((id) => id !== action.id),
        }),
      };
    }
    case "DELETE_SELECTED_TRACKS": {
      const selected = new Set(project.selectedTrackIds || []);
      if (!selected.size) return state;
      const tracks = project.tracks.filter((track) => !selected.has(track.id));
      const selectedTrackId = selected.has(project.selectedTrackId)
        ? tracks[0]?.id || null
        : project.selectedTrackId;
      return {
        ...state,
        project: touch({
          ...project,
          tracks,
          arrangement: (project.arrangement || []).filter((clip) => !selected.has(clip.trackId)),
          automation: (project.automation || []).filter((lane) => !selected.has(lane.trackId)),
          selectedTrackId,
          selectedTrackIds: [],
        }),
      };
    }
    case "DELETE_ALL_TRACKS":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: [],
          arrangement: [],
          automation: [],
          selectedTrackId: null,
          selectedTrackIds: [],
        }),
      };
    case "DUPLICATE_TRACK": {
      const source = project.tracks.find((track) => track.id === action.id);
      if (!source) return state;
      const copy = {
        ...JSON.parse(JSON.stringify(source)),
        id: uid("track"),
        name: `${source.name} Copy`,
      };
      return {
        ...state,
        project: touch({
          ...project,
          tracks: [...project.tracks, copy],
          arrangement: [
            ...(project.arrangement || []),
            ...(((project.arrangement || []).filter((clip) => clip.trackId === source.id).length
              ? (project.arrangement || []).filter((clip) => clip.trackId === source.id)
              : [{ startBar: 0, lengthBars: Math.max(project.patternBars || 4, project.loopBars || 4), name: "Pattern A" }])
              .map((clip) => ({ ...clip, id: uid("clip"), trackId: copy.id }))),
          ],
          selectedTrackId: copy.id,
          selectedTrackIds: [copy.id],
          view: action.openPiano ? "piano" : project.view,
        }),
      };
    }
    case "ADD_CLIP":
      return {
        ...state,
        project: touch({
          ...project,
          arrangement: [...project.arrangement, {
            id: uid("clip"),
            trackId: action.trackId,
            startBar: action.startBar,
            lengthBars: action.lengthBars || 4,
            name: "Pattern A",
          }],
        }),
      };
    case "UPDATE_CLIP":
      return {
        ...state,
        project: touch({
          ...project,
          arrangement: project.arrangement.map((clip) => clip.id === action.id ? { ...clip, ...action.patch } : clip),
        }),
      };
    case "DELETE_CLIP":
      return {
        ...state,
        project: touch({ ...project, arrangement: project.arrangement.filter((clip) => clip.id !== action.id) }),
      };
    case "APPLY_KIT":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => {
            if (track.type !== "sampler") return track;
            const lower = track.name.toLowerCase();
            const key = lower.includes("kick") ? "kick"
              : lower.includes("snare") ? "snare"
                : lower.includes("clap") ? "clap"
                  : lower.includes("open") ? "openHat"
                    : lower.includes("hat") ? "closedHat"
                      : "perc";
            return { ...track, sampleId: action.kit.slots[key] || track.sampleId };
          }),
        }),
      };
    case "RANDOMIZE_TRACK":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => {
            if (track.id !== action.id || track.type !== "sampler") return track;
            const density = action.density ?? 0.25;
            return {
              ...track,
              steps: track.steps.map(() => Math.random() < density
                ? Math.round((0.45 + Math.random() * 0.5) * 100) / 100
                : 0),
              sequenceMode: "steps",
            };
          }),
        }),
      };
    case "SAVE_CUSTOM_PRESET":
      return {
        ...state,
        project: touch({
          ...project,
          customPresets: [...(project.customPresets || []), action.preset],
          tracks: project.tracks.map((track) => track.id === action.trackId
            ? { ...track, presetId: action.preset.id, synth: {} }
            : track),
        }),
      };
    case "DELETE_CUSTOM_PRESET":
      return {
        ...state,
        project: touch({
          ...project,
          customPresets: (project.customPresets || []).filter((preset) => preset.id !== action.presetId),
          tracks: project.tracks.map((track) => track.presetId === action.presetId
            ? { ...track, presetId: "preset-001", synth: {} }
            : track),
        }),
      };
    case "APPLY_SYNTH_PRESET":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => track.id === action.trackId
            ? { ...track, type: "synth", presetId: action.preset.id, synth: {}, sequenceMode: "notes" }
            : track),
        }),
      };
    case "ADD_AUTOMATION_LANE": {
      const exists = (project.automation || []).some((lane) => lane.trackId === action.trackId && lane.parameter === action.parameter);
      if (exists) return state;
      const lane = {
        id: uid("automation"),
        trackId: action.trackId,
        parameter: action.parameter,
        enabled: true,
        smooth: true,
        lengthSteps: 64,
        points: [],
      };
      return { ...state, project: touch({ ...project, automation: [...(project.automation || []), lane] }) };
    }
    case "UPDATE_AUTOMATION_LANE":
      return {
        ...state,
        project: touch({
          ...project,
          automation: (project.automation || []).map((lane) => lane.id === action.laneId ? { ...lane, ...action.patch } : lane),
        }),
      };
    case "SET_AUTOMATION_POINT":
      return {
        ...state,
        project: touch({
          ...project,
          automation: (project.automation || []).map((lane) => {
            if (lane.id !== action.laneId) return lane;
            const filtered = (lane.points || []).filter((point) => point.step !== action.step);
            return { ...lane, points: [...filtered, { step: action.step, value: action.value }].sort((a, b) => a.step - b.step) };
          }),
        }),
      };
    case "DELETE_AUTOMATION_POINT":
      return {
        ...state,
        project: touch({
          ...project,
          automation: (project.automation || []).map((lane) => lane.id === action.laneId
            ? { ...lane, points: (lane.points || []).filter((point) => point.step !== action.step) }
            : lane),
        }),
      };
    case "CLEAR_AUTOMATION_LANE":
      return {
        ...state,
        project: touch({
          ...project,
          automation: (project.automation || []).map((lane) => lane.id === action.laneId ? { ...lane, points: [] } : lane),
        }),
      };
    case "DELETE_AUTOMATION_LANE":
      return {
        ...state,
        project: touch({ ...project, automation: (project.automation || []).filter((lane) => lane.id !== action.laneId) }),
      };
    case "CLONE_PROJECT":
      return { ...state, project: cloneProject(project) };
    default:
      return state;
  }
}
