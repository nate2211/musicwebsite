import React, { useMemo, useState } from "react";
import { getAllPresets } from "../data/presetLibrary";
import { TrackHeader } from "./TrackHeader";

const CATEGORY_COLORS = {
  "808": "#9f83ff",
  Bass: "#8572ff",
  Keys: "#64c8ff",
  Pluck: "#6ee7c6",
  Bell: "#87ddff",
  Lead: "#ff7eb3",
  Pad: "#8f9dff",
  Synth: "#69d4ff",
  Brass: "#ffb86b",
  Flute: "#83e6dc",
  Texture: "#b08cff",
  Chord: "#71d8ff",
  Arp: "#65e3a7",
  FX: "#ff8c92",
  Atmosphere: "#8ba4ff",
  Cinematic: "#c491ff",
  Hybrid: "#ff8cc8",
  Choir: "#b6a0ff",
  World: "#67d9c1",
  Motion: "#78baff",
};

export function TrackSidebar({ project, dispatch, onSelectTrack, onAddLocalFiles }) {
  const presets = useMemo(() => getAllPresets(project), [project]);
  const [presetId, setPresetId] = useState(() => presets[0]?.id || "preset-001");
  const localFileRef = React.useRef(null);
  const selectedIds = new Set(project.selectedTrackIds || []);
  const selectedCount = selectedIds.size;
  const mutedCount = project.tracks.filter((track) => track.mute).length;

  const selectTrack = (trackId) => {
    if (onSelectTrack) {
      onSelectTrack(trackId);
      return;
    }
    dispatch({ type: "SELECT_TRACK", id: trackId, openPiano: true });
  };

  const addSynth = () => {
    const preset = presets.find((entry) => entry.id === presetId) || presets[0];
    if (!preset) return;
    dispatch({
      type: "ADD_TRACK",
      trackType: "synth",
      presetId: preset.id,
      presetName: preset.name,
      color: CATEGORY_COLORS[preset.category] || "#69d4ff",
      openPiano: true,
    });
  };

  const runBulkAction = (value) => {
    switch (value) {
      case "select-all":
        dispatch({ type: "SELECT_ALL_TRACKS" });
        break;
      case "clear-selection":
        dispatch({ type: "CLEAR_TRACK_SELECTION" });
        break;
      case "mute-selected":
        dispatch({ type: "MUTE_SELECTED_TRACKS", value: true });
        break;
      case "unmute-selected":
        dispatch({ type: "MUTE_SELECTED_TRACKS", value: false });
        break;
      case "mute-all":
        dispatch({ type: "MUTE_ALL_TRACKS", value: true });
        break;
      case "unmute-all":
        dispatch({ type: "MUTE_ALL_TRACKS", value: false });
        break;
      case "delete-selected":
        if (selectedCount && window.confirm(`Delete ${selectedCount} selected track${selectedCount === 1 ? "" : "s"}?`)) {
          dispatch({ type: "DELETE_SELECTED_TRACKS" });
        }
        break;
      case "delete-all":
        if (project.tracks.length && window.confirm(`Delete all ${project.tracks.length} tracks? This removes their clips and automation lanes too.`)) {
          dispatch({ type: "DELETE_ALL_TRACKS" });
        }
        break;
      default:
        break;
    }
  };

  return (
    <aside className="track-sidebar" aria-label="Project tracks">
      <header className="track-sidebar-title">
        <div>
          <strong>Tracks</strong>
          <span>{project.tracks.length} total · {selectedCount} selected · {mutedCount} muted</span>
        </div>
      </header>

      <section className="track-local-audio" aria-label="Add local audio tracks">
        <button type="button" className="accent" onClick={() => localFileRef.current?.click()}>＋ Add local audio tracks</button>
        <input
          ref={localFileRef}
          hidden
          multiple
          type="file"
          accept="audio/*,.wav,.mp3,.ogg,.m4a,.aac,.flac,.webm"
          onChange={(event) => { onAddLocalFiles?.(event.target.files); event.target.value = ""; }}
        />
      </section>

      <section className="track-add-synth" aria-label="Add synthesizer track">
        <label htmlFor="track-synth-preset">Add synthesizer</label>
        <div>
          <select id="track-synth-preset" value={presetId} onChange={(event) => setPresetId(event.target.value)}>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.category} · {preset.name}</option>
            ))}
          </select>
          <button type="button" className="accent" onClick={addSynth}>＋</button>
        </div>
      </section>

      <section className="track-bulk-toolbar" aria-label="Track selection and mute tools">
        <button type="button" disabled={!project.tracks.length} onClick={() => dispatch({ type: "SELECT_ALL_TRACKS" })}>Select all</button>
        <button type="button" disabled={!selectedCount} onClick={() => dispatch({ type: "MUTE_SELECTED_TRACKS", value: true })}>Mute selected</button>
        <select
          aria-label="Track management actions"
          value=""
          onChange={(event) => {
            runBulkAction(event.target.value);
            event.target.value = "";
          }}
        >
          <option value="">Manage tracks…</option>
          <option value="select-all">Select all tracks</option>
          <option value="clear-selection">Clear selection</option>
          <option value="mute-selected" disabled={!selectedCount}>Mute selected tracks</option>
          <option value="unmute-selected" disabled={!selectedCount}>Unmute selected tracks</option>
          <option value="mute-all" disabled={!project.tracks.length}>Mute all tracks</option>
          <option value="unmute-all" disabled={!project.tracks.length}>Unmute all tracks</option>
          <option value="delete-selected" disabled={!selectedCount}>Delete selected tracks</option>
          <option value="delete-all" disabled={!project.tracks.length}>Delete all tracks</option>
        </select>
      </section>

      <div className="track-list-scroll">
        {project.tracks.map((track) => (
          <TrackHeader
            key={track.id}
            track={track}
            selected={project.selectedTrackId === track.id}
            batchSelected={selectedIds.has(track.id)}
            onSelect={() => selectTrack(track.id)}
            onToggleBatch={() => dispatch({ type: "TOGGLE_TRACK_SELECTION", id: track.id })}
            onUpdate={(patch) => dispatch({ type: "UPDATE_TRACK", id: track.id, patch })}
            onDuplicate={() => dispatch({ type: "DUPLICATE_TRACK", id: track.id, openPiano: true })}
            onDelete={() => dispatch({ type: "DELETE_TRACK", id: track.id })}
            onClear={() => dispatch({ type: "CLEAR_TRACK", id: track.id })}
          />
        ))}
        {!project.tracks.length && (
          <div className="track-list-empty">
            <strong>No tracks in this project</strong>
            <p>Choose a synthesizer above or add a sample from the browser.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
