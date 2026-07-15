import React, { useMemo, useState } from "react";
import { DRUM_KITS } from "../data/drumKits";
import { PRESET_CATEGORIES } from "../data/instrumentPresets";
import { getAllPresets } from "../data/presetLibrary";

export function BrowserPanel({
  project,
  selectedTrack,
  onAssignSample,
  onAssignPreset,
  onApplyKit,
  onPreviewSample,
  onPreviewPreset,
  onAddTrack,
}) {
  const [tab, setTab] = useState("samples");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
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

  return (
    <aside className="browser-panel">
      <div className="browser-tabs">
        <button type="button" className={tab === "samples" ? "active" : ""} onClick={() => chooseTab("samples")}>Samples</button>
        <button type="button" className={tab === "presets" ? "active" : ""} onClick={() => chooseTab("presets")}>Presets</button>
        <button type="button" className={tab === "kits" ? "active" : ""} onClick={() => chooseTab("kits")}>Kits</button>
      </div>
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
        {tab === "samples" && `${samples.length} of ${project.samples.length} sounds`}
        {tab === "presets" && `${filteredPresets.length} of ${presets.length} patches`}
        {tab === "kits" && `${DRUM_KITS.length} production kits`}
      </div>
      <div className="browser-list">
        {tab === "samples" && samples.map((sample) => (
          <div key={sample.id} className={`browser-item ${selectedTrack?.sampleId === sample.id ? "selected" : ""}`}>
            <button type="button" className="preview" onClick={() => onPreviewSample(sample)}>▶</button>
            <button type="button" className="item-main" onClick={() => onAssignSample(sample.id)}>
              <strong>{sample.name}</strong>
              <span>{sample.subtype || sample.category} · {sample.duration}s · {sample.bpm ? `${sample.bpm} BPM` : sample.rootNote || "one-shot"}</span>
            </button>
          </div>
        ))}
        {tab === "presets" && filteredPresets.map((preset) => (
          <div key={preset.id} className={`browser-item ${selectedTrack?.presetId === preset.id ? "selected" : ""}`}>
            <button type="button" className="preview" onClick={() => onPreviewPreset(preset)}>♪</button>
            <button type="button" className="item-main" onClick={() => onAssignPreset(preset.id)}>
              <strong>{preset.name}</strong>
              <span>{preset.category} · {preset.oscA?.waveform || preset.waveform || "custom"} · {preset.unison || 1} voices</span>
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
        <button type="button" onClick={() => onAddTrack("sampler")}>+ Sampler</button>
        <button type="button" onClick={() => onAddTrack("synth")}>+ Instrument</button>
      </div>
    </aside>
  );
}
