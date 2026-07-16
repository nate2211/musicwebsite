import React from "react";
import { IconButton, Segmented } from "./Controls";

const masterPercent = (value) => Math.round((Number(value) || 0) * 100);

export function TopBar({
  project,
  playing,
  playhead,
  onPlay,
  onStop,
  onField,
  onSave,
  onOpen,
  onExport,
  onRender,
  rendering,
  midiStatus,
}) {
  const masterVolume = Number.isFinite(project.masterVolume) ? project.masterVolume : 0.82;
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">MS</div>
        <div><strong>MusicStudioLab</strong><span>Enterprise Beat Workstation</span></div>
      </div>
      <div className="transport">
        <IconButton title="Return to start" onClick={onStop}>■</IconButton>
        <button className={`play-button ${playing ? "active" : ""}`} onClick={onPlay}>{playing ? "❚❚" : "▶"}</button>
        <div className="time-display">
          <b>{String(Math.floor(playhead / 16) + 1).padStart(2, "0")}</b><span>:</span>
          <b>{String((Math.floor(playhead / 4) % 4) + 1).padStart(2, "0")}</b><span>:</span>
          <b>{String((playhead % 4) + 1).padStart(2, "0")}</b>
        </div>
        <label className="tempo">
          <span>BPM</span>
          <input
            type="number"
            min="40"
            max="240"
            value={project.bpm}
            onChange={(event) => onField("bpm", Math.max(40, Math.min(240, Number(event.target.value))))}
          />
        </label>
        <label className="swing">
          <span>Swing {Math.round(project.swing * 100)}%</span>
          <input type="range" min="0" max="0.75" step="0.01" value={project.swing} onChange={(event) => onField("swing", Number(event.target.value))} />
        </label>
        <label className="master-volume-slider" title="Master output volume">
          <span className="master-volume-label"><b>MASTER</b><output>{masterPercent(masterVolume)}%</output></span>
          <span className="master-volume-track">
            <span className="master-volume-fill" style={{ width: `${Math.min(100, masterPercent(masterVolume) / 1.25)}%` }} />
            <input
              aria-label="Master volume"
              type="range"
              min="0"
              max="1.25"
              step="0.01"
              value={masterVolume}
              onChange={(event) => onField("masterVolume", Number(event.target.value))}
            />
          </span>
        </label>
      </div>
      <div className="top-actions">
        <span className="midi-chip">◉ {midiStatus}</span>
        <button onClick={onOpen}>Projects</button>
        <button onClick={onSave}>Save</button>
        <button onClick={onExport}>Project File</button>
        <button className="accent" onClick={onRender} disabled={rendering}>{rendering ? "Rendering…" : "Export WAV"}</button>
      </div>
    </div>
  );
}

export function ViewTabs({ view, onChange }) {
  return (
    <div className="view-tabs">
      <Segmented
        value={view}
        onChange={onChange}
        options={[
          { value: "rack", label: "▦ Channel Rack" },
          { value: "piano", label: "▤ Piano Roll" },
          { value: "playlist", label: "▥ Playlist" },
          { value: "mixer", label: "▥ Mixer" },
          { value: "plugins", label: "▱ Plugins" },
          { value: "sound", label: "◉ Synth Lab" },
          { value: "sample", label: "✂ Sample Lab" },
          { value: "automation", label: "⌁ Automation" },
          { value: "master", label: "◆ Mastering" },
        ]}
      />
      <div className="shortcut-hint">Space play · 1–4 views · Ctrl/⌘ S save</div>
    </div>
  );
}
