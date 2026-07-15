import { cloneProject, defaultFx, emptySteps, uid } from "./createProject";

const touch = (project) => ({ ...project, updatedAt: new Date().toISOString() });

export function studioReducer(state, action) {
  const project = state.project;
  switch (action.type) {
    case "LOAD_PROJECT":
      return {
        ...state,
        project: {
          customPresets: [],
          automation: [],
          ...action.project,
        },
        playing: false,
        playhead: 0,
      };
    case "SET_PROJECT_FIELD":
      return { ...state, project: touch({ ...project, [action.field]: action.value }) };
    case "SET_VIEW":
      return { ...state, project: { ...project, view: action.view } };
    case "SET_PLAYING":
      return { ...state, playing: action.value };
    case "SET_PLAYHEAD":
      return { ...state, playhead: action.value };
    case "SELECT_TRACK":
      return { ...state, project: { ...project, selectedTrackId: action.id } };
    case "UPDATE_TRACK":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => track.id === action.id ? { ...track, ...action.patch } : track),
        }),
      };
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
            return { ...track, steps };
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
            return { ...track, steps };
          }),
        }),
      };
    case "CLEAR_TRACK":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => track.id === action.id
            ? track.type === "sampler" ? { ...track, steps: emptySteps() } : { ...track, notes: [] }
            : track),
        }),
      };
    case "ADD_NOTE":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => track.id === action.id
            ? { ...track, notes: [...(track.notes || []), { id: uid("note"), ...action.note }] }
            : track),
        }),
      };
    case "UPDATE_NOTE":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => track.id === action.trackId
            ? { ...track, notes: track.notes.map((note) => note.id === action.noteId ? { ...note, ...action.patch } : note) }
            : track),
        }),
      };
    case "DELETE_NOTE":
      return {
        ...state,
        project: touch({
          ...project,
          tracks: project.tracks.map((track) => track.id === action.trackId
            ? { ...track, notes: track.notes.filter((note) => note.id !== action.noteId) }
            : track),
        }),
      };
    case "ADD_TRACK": {
      const track = {
        id: uid("track"),
        name: action.trackType === "sampler" ? "New Sampler" : "New Instrument",
        type: action.trackType,
        color: action.color || "#69d4ff",
        sampleId: project.samples[0]?.id,
        presetId: "preset-001",
        steps: emptySteps(),
        notes: [],
        mixer: { volume: 0.75, pan: 0 },
        effects: defaultFx(),
        synth: {},
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
      };
      return {
        ...state,
        project: touch({
          ...project,
          tracks: [...project.tracks, track],
          selectedTrackId: track.id,
        }),
      };
    }
    case "DELETE_TRACK": {
      const tracks = project.tracks.filter((track) => track.id !== action.id);
      return {
        ...state,
        project: touch({
          ...project,
          tracks,
          arrangement: project.arrangement.filter((clip) => clip.trackId !== action.id),
          selectedTrackId: tracks[0]?.id || null,
        }),
      };
    }
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
        project: touch({ ...project, tracks: [...project.tracks, copy], selectedTrackId: copy.id }),
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
            ? { ...track, type: "synth", presetId: action.preset.id, synth: {} }
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
