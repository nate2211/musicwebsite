import React, { useMemo, useRef, useState } from "react";
import { DRUM_KITS } from "../data/drumKits";
import { PRESET_CATEGORIES } from "../data/instrumentPresets";
import { getAllPresets } from "../data/presetLibrary";

export function BrowserPanel({
  project,
  selectedTrack,
  onAssignSample,
  onAddSampleTrack,
  onAssignPreset,
  onApplyKit,
  onPreviewSample,
  onPreviewPreset,
  onAddTrack,
  onAddPresetTrack,
  onImportAudio,
  onImportPresets,
}) {
  const [tab, setTab] = useState("samples");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [dragging, setDragging] = useState(false);
  const sampleInputRef = useRef(null);
  const drumInputRef = useRef(null);
  const presetInputRef = useRef(null);
  const presets = useMemo(() => getAllPresets(project), [project]);
  const sampleCategories = useMemo(
    () => [...new Set(project.samples.flatMap((sample) => [sample.category, sample.subtype]).filter(Boolean))],
    [project.samples],
  );
  const samples = useMemo(() => project.samples.filter((sample) => {
    const matchesCategory = category === "All" || sample.subtype === category || sample.category === category;
    const haystack = `${sample.name} ${sample.tags?.join(" ") || ""}`.toLowerCase();
    return matchesCategory && haystack.includes(query.toLowerCase());
  }), [project.samples, category, query]);
  const filteredPresets = useMemo(() => presets.filter((preset) => {
    const matchesCategory = category === "All" || preset.category === category;
    const haystack = `${preset.name} ${preset.category} ${(preset.tags || []).join(" ")}`.toLowerCase();
    return matchesCategory && haystack.includes(query.toLowerCase());
  }), [presets, category, query]);

  const chooseTab = (nextTab) => {
    setTab(nextTab);
    setCategory("All");
  };

  const importDroppedAudio = (event) => {
    event.preventDefault();
    setDragging(false);
    const files = [...event.dataTransfer.files];
    if (files.length) onImportAudio(files, { addTracks: true });
  };

  return (
    <aside
      className={`browser-panel ${dragging ? "dragging-files" : ""}`}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
      onDrop={importDroppedAudio}
    >
      <div className="browser-tabs">
        <button type="button" className={tab === "samples" ? "active" : ""} onClick={() => chooseTab("samples")}>Samples</button>
        <button type="button" className={tab === "presets" ? "active" : ""} onClick={() => chooseTab("presets")}>Presets</button>
        <button type="button" className={tab === "kits" ? "active" : ""} onClick={() => chooseTab("kits")}>Kits</button>
      </div>
      <div className="browser-import-strip">
        <button type="button" onClick={() => sampleInputRef.current?.click()}>Upload samples</button>
        <button type="button" onClick={() => drumInputRef.current?.click()}>Upload drums</button>
        <button type="button" onClick={() => presetInputRef.current?.click()}>Import presets</button>
        <input
          ref={sampleInputRef}
          hidden
          multiple
          type="file"
          accept="audio/*,.wav,.mp3,.ogg,.m4a,.aac,.flac,.webm"
          onChange={(event) => {
            onImportAudio(event.target.files, { addTracks: true, category: "User Samples", subtype: "Imported Audio" });
            event.target.value = "";
          }}
        />
        <input
          ref={drumInputRef}
          hidden
          multiple
          type="file"
          accept="audio/*,.wav,.mp3,.ogg,.m4a,.aac,.flac,.webm"
          onChange={(event) => {
            onImportAudio(event.target.files, { addTracks: true, drums: true, category: "User Drums", subtype: "User Drums" });
            event.target.value = "";
          }}
        />
        <input
          ref={presetInputRef}
          hidden
          multiple
          type="file"
          accept="application/json,.json,.mslpatch.json"
          onChange={(event) => {
            onImportPresets(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      <div className="browser-drop-hint">Drop local audio here to create tracks</div>
      <input
        className="browser-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`Search ${tab}…`}
      />
      {tab !== "kits" && (
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option>All</option>
          {(tab === "samples" ? sampleCategories : [...PRESET_CATEGORIES, "User"]).map((entry) => <option key={entry}>{entry}</option>)}
        </select>
      )}
      <div className="browser-stats">
        {tab === "samples" && `${samples.length} of ${project.samples.length} sounds · ${project.samples.filter((sample) => sample.user).length} local`}
        {tab === "presets" && `${filteredPresets.length} of ${presets.length} soft warm digital patches`}
        {tab === "kits" && `${DRUM_KITS.length} production kits`}
      </div>
      <div className="browser-list">
        {tab === "samples" && samples.map((sample) => (
          <div key={sample.id} className={`browser-item ${selectedTrack?.sampleId === sample.id ? "selected" : ""}`}>
            <button type="button" className="preview" onClick={() => onPreviewSample(sample)}>▶</button>
            <button type="button" className="item-main" onClick={() => onAssignSample(sample)} title="Assign this sound to the selected track">
              <strong>{sample.name}{sample.user && <em className="local-badge">LOCAL</em>}</strong>
              <span>{sample.subtype || sample.category} · {sample.duration || 0}s · {sample.bpm ? `${sample.bpm} BPM` : sample.rootNote || "one-shot"}</span>
            </button>
            <button
              type="button"
              className="add-sample-track"
              onClick={() => onAddSampleTrack(sample)}
              title={`Create a new track named ${sample.name}`}
              aria-label={`Create a new track named ${sample.name}`}
            >
              ＋
            </button>
          </div>
        ))}
        {tab === "presets" && filteredPresets.map((preset) => (
          <div key={preset.id} className={`browser-item ${selectedTrack?.presetId === preset.id ? "selected" : ""}`}>
            <button type="button" className="preview" onClick={() => onPreviewPreset(preset)}>♪</button>
            <button type="button" className="item-main" onClick={() => onAssignPreset(preset.id)} title="Load this patch into the selected synth track">
              <strong>{preset.name}{preset.warmDigital && <em className="warm-badge">SOFT</em>}</strong>
              <span>{preset.category} · soft warm digital · {(preset.layers || []).filter((layer) => layer.enabled).length + 3} sources</span>
            </button>
            <button
              type="button"
              className="add-sample-track"
              onClick={() => onAddPresetTrack(preset)}
              title={`Add ${preset.name} as a new synthesizer track`}
              aria-label={`Add ${preset.name} as a new synthesizer track`}
            >
              ＋
            </button>
          </div>
        ))}
        {tab === "kits" && DRUM_KITS.map((kit) => (
          <div key={kit.id} className="kit-card">
            <strong>{kit.name}</strong>
            <p>{kit.description}</p>
            <button type="button" onClick={() => onApplyKit(kit)}>Load kit</button>
          </div>
        ))}
      </div>
      <div className="browser-footer">
        <button type="button" onClick={() => onAddTrack("sampler", samples[0] || project.samples[0])}>+ Sample track</button>
        <button type="button" onClick={() => onAddPresetTrack(filteredPresets[0] || presets[0])}>+ Warm synth</button>
      </div>
    </aside>
  );
}
