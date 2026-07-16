import React, { useMemo, useRef, useState } from "react";
import {
  FILTER_TYPES,
  LFO_TARGETS,
  SYNTH_DEFAULTS,
  SYNTH_WAVEFORMS,
  normalizeSynthPatch,
} from "../audio/synthDefaults";
import { mutatePatch, randomizePatch } from "../audio/synthPatchTools";
import { getAllPresets, makeCustomPreset } from "../data/presetLibrary";
import { Knob, Panel, Segmented, SelectControl, Toggle } from "./Controls";

const SYNTH_TABS = [
  { value: "osc", label: "Oscillators" },
  { value: "layers", label: "Layer Engine" },
  { value: "filter", label: "Filters + Envelopes" },
  { value: "mod", label: "Modulation" },
  { value: "fx", label: "Voice FX + Macros" },
  { value: "patch", label: "Patch Manager" },
];

export function SoundDesigner({ project, track, dispatch, onPreview }) {
  const [tab, setTab] = useState("osc");
  const [keyboardOctave, setKeyboardOctave] = useState(4);
  const importRef = useRef(null);
  const allPresets = useMemo(() => getAllPresets(project), [project]);
  if (!track) return null;
  if (track.type !== "synth") {
    return <SamplerDesigner track={track} dispatch={dispatch} />;
  }

  const selectedPreset = allPresets.find((preset) => preset.id === track.presetId) || allPresets[0];
  const patch = normalizeSynthPatch({ ...selectedPreset, ...(track.synth || {}) });
  const replacePatch = (nextPatch) => dispatch({
    type: "UPDATE_TRACK",
    id: track.id,
    patch: { synth: normalizeSynthPatch(nextPatch) },
  });
  const updateRoot = (changes) => replacePatch({ ...patch, ...changes });
  const updateSection = (section, changes) => replacePatch({
    ...patch,
    [section]: { ...patch[section], ...changes },
  });
  const updateLayer = (index, changes) => replacePatch({
    ...patch,
    layers: patch.layers.map((layer, layerIndex) => layerIndex === index
      ? { ...layer, ...changes }
      : layer),
  });

  const savePatch = () => {
    const name = window.prompt("Name this custom synth patch", `${track.name} Custom`);
    if (!name) return;
    const preset = makeCustomPreset(name, patch);
    dispatch({ type: "SAVE_CUSTOM_PRESET", preset, trackId: track.id });
  };

  const exportPatch = () => {
    const payload = JSON.stringify({
      format: "MusicStudioLab Synth Patch",
      version: 1,
      name: selectedPreset?.name || track.name,
      patch,
    }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(selectedPreset?.name || track.name).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.mslpatch.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importPatch = async (file) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      replacePatch(parsed.patch || parsed);
    } catch (error) {
      window.alert(`Patch import failed: ${error.message}`);
    }
  };

  return (
    <Panel
      title={`Synth Lab · ${track.name}`}
      subtitle="Production hybrid instrument with stable tabbed workspaces, three core oscillators, dual spectral layers, timbre and pitch shaping, modulation, macros, and polished per-voice processing"
      className="synth-designer-panel"
      actions={(
        <>
          <span className="patch-badge">{selectedPreset?.name || "Custom Patch"}</span>
          <button type="button" onClick={() => onPreview(60)}>Preview C4</button>
          <button type="button" onClick={savePatch}>Save patch</button>
        </>
      )}
    >
      <div className="synth-lab">
        <div className="synth-commandbar">
          <Segmented value={tab} options={SYNTH_TABS} onChange={setTab} />
          <div className="synth-command-actions">
            <button type="button" onClick={() => replacePatch(mutatePatch(patch, 0.14))}>Mutate 14%</button>
            <button type="button" onClick={() => replacePatch(mutatePatch(patch, 0.38))}>Mutate 38%</button>
            <button type="button" onClick={() => replacePatch(randomizePatch())}>Generate patch</button>
            <button type="button" onClick={() => replacePatch(SYNTH_DEFAULTS)}>Initialize</button>
            <button type="button" onClick={exportPatch}>Export</button>
            <button type="button" onClick={() => importRef.current?.click()}>Import</button>
            <input
              ref={importRef}
              hidden
              type="file"
              accept="application/json,.json"
              onChange={(event) => importPatch(event.target.files?.[0])}
            />
          </div>
        </div>

        <div className="synth-hero">
          <WaveformDisplay patch={patch} />
          <div className="macro-strip">
            <Knob label="Character" value={patch.macros.character} onChange={(value) => updateSection("macros", { character: value })} />
            <Knob label="Brightness" value={patch.macros.brightness} onChange={(value) => updateSection("macros", { brightness: value })} />
            <Knob label="Motion" value={patch.macros.motion} onChange={(value) => updateSection("macros", { motion: value })} />
            <Knob label="Width" value={patch.macros.width} onChange={(value) => updateSection("macros", { width: value })} />
          </div>
        </div>

        <div className="synth-engine-strip" aria-label="Synth global tone and pitch controls">
          <div className="synth-strip-title"><small>GLOBAL ENGINE</small><strong>Tone · Pitch · Motion</strong><span>Production-safe controls applied to every voice</span></div>
          <Knob label="Timbre" value={patch.timbre ?? 0.5} min={0} max={1} step={0.01} onChange={(timbre) => updateRoot({ timbre })} display={percent} />
          <Knob label="Harmonics" value={patch.harmonics ?? 0.22} min={0} max={1} step={0.01} onChange={(harmonics) => updateRoot({ harmonics })} display={percent} />
          <Knob label="Body" value={patch.body ?? 0.5} min={0} max={1} step={0.01} onChange={(body) => updateRoot({ body })} display={percent} />
          <Knob label="Air" value={patch.air ?? 0.42} min={0} max={1} step={0.01} onChange={(air) => updateRoot({ air })} display={percent} />
          <Knob label="Transient" value={patch.transient ?? 0.5} min={0} max={1} step={0.01} onChange={(transient) => updateRoot({ transient })} display={percent} />
          <Knob label="Pitch" value={patch.pitchSemitones ?? 0} min={-24} max={24} step={1} onChange={(pitchSemitones) => updateRoot({ pitchSemitones })} display={semitones} />
          <Knob label="Fine" value={patch.pitchFine ?? 0} min={-100} max={100} step={1} onChange={(pitchFine) => updateRoot({ pitchFine })} display={cents} />
          <Knob label="Pitch LFO" value={patch.pitchLfoDepth ?? 0} min={0} max={100} step={0.1} onChange={(pitchLfoDepth) => updateRoot({ pitchLfoDepth })} display={cents} />
          <Knob label="LFO Rate" value={patch.pitchLfoRate ?? 5.2} min={0.05} max={20} step={0.01} onChange={(pitchLfoRate) => updateRoot({ pitchLfoRate })} display={hertz} />
        </div>

        <div className="synth-tab-workspace" data-active-tab={tab}>
        {tab === "osc" && (
          <div className="synth-page-grid">
            <OscillatorCard label="Oscillator A" oscillator={patch.oscA} onChange={(changes) => updateSection("oscA", changes)} />
            <OscillatorCard label="Oscillator B" oscillator={patch.oscB} onChange={(changes) => updateSection("oscB", changes)} />
            <OscillatorCard label="Oscillator C" oscillator={patch.oscC} onChange={(changes) => updateSection("oscC", changes)} />
            <SynthSection title="Sub + Noise" className="span-2">
              <div className="split-control-grid">
                <div>
                  <Toggle label="Sub oscillator" checked={patch.sub.enabled} onChange={(enabled) => updateSection("sub", { enabled })} />
                  <Segmented value={patch.sub.waveform} options={["sine", "triangle", "square"]} onChange={(waveform) => updateSection("sub", { waveform })} compact />
                  <div className="knob-row">
                    <Knob label="Octave" value={patch.sub.octave} min={-3} max={0} step={1} onChange={(octave) => updateSection("sub", { octave })} />
                    <Knob label="Level" value={patch.sub.level} onChange={(level) => updateSection("sub", { level })} display={percent} />
                  </div>
                </div>
                <div>
                  <Toggle label="Noise generator" checked={patch.noise.enabled} onChange={(enabled) => updateSection("noise", { enabled })} />
                  <Segmented value={patch.noise.color} options={["white", "pink", "brown", "blue"]} onChange={(color) => updateSection("noise", { color })} compact />
                  <div className="knob-row">
                    <Knob label="Level" value={patch.noise.level} min={0} max={0.5} onChange={(level) => updateSection("noise", { level })} display={percent} />
                    <Knob label="Stereo" value={patch.noise.stereo} onChange={(stereo) => updateSection("noise", { stereo })} display={percent} />
                  </div>
                </div>
              </div>
            </SynthSection>
            <SynthSection title="Voice Architecture">
              <div className="toggle-grid">
                <Toggle label="Mono" checked={patch.mono} onChange={(mono) => updateRoot({ mono, polyphony: mono ? 1 : Math.max(2, patch.polyphony) })} />
                <Toggle label="Legato" checked={patch.legato} onChange={(legato) => updateRoot({ legato })} />
              </div>
              <div className="knob-row">
                <Knob label="Polyphony" value={patch.polyphony} min={1} max={32} step={1} onChange={(polyphony) => updateRoot({ polyphony })} />
                <Knob label="Unison" value={patch.unison} min={1} max={9} step={1} onChange={(unison) => updateRoot({ unison })} />
                <Knob label="Detune" value={patch.detune} min={0} max={40} step={0.1} onChange={(detune) => updateRoot({ detune })} display={cents} />
                <Knob label="Stereo" value={patch.stereo} onChange={(stereo) => updateRoot({ stereo })} display={percent} />
                <Knob label="Drift" value={patch.voiceDrift} min={0} max={15} step={0.1} onChange={(voiceDrift) => updateRoot({ voiceDrift })} display={cents} />
                <Knob label="Glide" value={patch.portamento} min={0} max={1} step={0.001} onChange={(portamento) => updateRoot({ portamento })} display={milliseconds} />
              </div>
            </SynthSection>
          </div>
        )}

        {tab === "layers" && (
          <div className="synth-page-grid layer-engine-grid">
            {patch.layers.map((layer, index) => (
              <LayerCard
                key={layer.id || index}
                title={index === 0 ? "Spectral Layer A" : "Spectral Layer B"}
                layer={layer}
                onChange={(changes) => updateLayer(index, changes)}
              />
            ))}
            <SynthSection title="Procedural Texture Bed" className="span-2" muted={!patch.textureLayer.enabled}>
              <Toggle
                label="Enable texture layer"
                checked={patch.textureLayer.enabled}
                onChange={(enabled) => updateSection("textureLayer", { enabled })}
                hint="Adds a filtered, moving stereo noise bed behind the tonal layers for atmosphere and depth."
              />
              <div className="split-control-grid">
                <div>
                  <Segmented
                    value={patch.textureLayer.color}
                    options={["white", "pink", "brown", "blue"]}
                    onChange={(color) => updateSection("textureLayer", { color })}
                    compact
                  />
                  <div className="knob-row">
                    <Knob label="Level" value={patch.textureLayer.level} min={0} max={0.35} step={0.001} onChange={(level) => updateSection("textureLayer", { level })} display={percent} />
                    <Knob label="Stereo" value={patch.textureLayer.stereo} onChange={(stereo) => updateSection("textureLayer", { stereo })} display={percent} />
                    <Knob label="Motion" value={patch.textureLayer.motion} onChange={(motion) => updateSection("textureLayer", { motion })} display={percent} />
                    <Knob label="Rate" value={patch.textureLayer.motionRate} min={0.01} max={4} step={0.01} onChange={(motionRate) => updateSection("textureLayer", { motionRate })} display={hertz} />
                  </div>
                </div>
                <div>
                  <FilterGraph cutoff={patch.textureLayer.lowpass} resonance={patch.textureLayer.resonance} type="bandpass" />
                  <div className="knob-row">
                    <Knob label="Highpass" value={patch.textureLayer.highpass} min={20} max={8000} step={1} onChange={(highpass) => updateSection("textureLayer", { highpass })} display={frequency} />
                    <Knob label="Lowpass" value={patch.textureLayer.lowpass} min={200} max={20000} step={1} onChange={(lowpass) => updateSection("textureLayer", { lowpass })} display={frequency} />
                    <Knob label="Resonance" value={patch.textureLayer.resonance} min={0} max={12} step={0.1} onChange={(resonance) => updateSection("textureLayer", { resonance })} />
                  </div>
                </div>
              </div>
            </SynthSection>
            <SynthSection title="Enterprise Layer Architecture">
              <p className="section-copy">Each spectral layer has independent waveform, tuning, unison, detune, stereo spread, delayed onset, and slow movement. Combine it with the three core oscillators for dense pads, cinematic keys, evolving textures, hybrid leads, choirs, and motion patches.</p>
              <div className="layer-engine-stats">
                <span>{patch.layers.filter((layer) => layer.enabled).length} spectral layers active</span>
                <span>{patch.layers.reduce((sum, layer) => sum + (layer.enabled ? layer.unison : 0), 0)} layer voices</span>
                <span>{patch.textureLayer.enabled ? "Texture bed active" : "Texture bed bypassed"}</span>
              </div>
            </SynthSection>
          </div>
        )}

        {tab === "filter" && (
          <div className="synth-page-grid">
            <FilterCard title="Filter 1" filter={patch.filter1} onChange={(changes) => updateSection("filter1", changes)} />
            <FilterCard title="Filter 2" filter={patch.filter2} onChange={(changes) => updateSection("filter2", changes)} />
            <SynthSection title="Filter Routing">
              <Segmented value={patch.filterRouting} options={["serial", "parallel"]} onChange={(filterRouting) => updateRoot({ filterRouting })} />
              <div className="knob-row">
                <Knob label="Blend" value={patch.filterBlend} onChange={(filterBlend) => updateRoot({ filterBlend })} display={percent} />
                <Knob label="Key Track" value={patch.keyTracking} onChange={(keyTracking) => updateRoot({ keyTracking })} display={percent} />
                <Knob label="Velocity→Filter" value={patch.velocityToFilter} onChange={(velocityToFilter) => updateRoot({ velocityToFilter })} display={percent} />
              </div>
            </SynthSection>
            <EnvelopeCard title="Amplifier Envelope" envelope={patch.ampEnv} onChange={(changes) => updateSection("ampEnv", changes)} amp />
            <EnvelopeCard title="Filter Envelope" envelope={patch.filterEnv} onChange={(changes) => updateSection("filterEnv", changes)} filter />
            <SynthSection title="Pitch Envelope">
              <EnvelopeGraph envelope={{ ...patch.pitchEnv, sustain: 0, release: 0.05 }} />
              <div className="knob-row">
                <Knob label="Amount" value={patch.pitchEnv.amount} min={-48} max={48} step={1} onChange={(amount) => updateSection("pitchEnv", { amount })} display={(value) => `${value > 0 ? "+" : ""}${value} st`} />
                <Knob label="Attack" value={patch.pitchEnv.attack} min={0.001} max={2} step={0.001} onChange={(attack) => updateSection("pitchEnv", { attack })} display={seconds} />
                <Knob label="Decay" value={patch.pitchEnv.decay} min={0.005} max={4} step={0.005} onChange={(decay) => updateSection("pitchEnv", { decay })} display={seconds} />
              </div>
            </SynthSection>
          </div>
        )}

        {tab === "mod" && (
          <div className="synth-page-grid">
            <LfoCard title="LFO 1" lfo={patch.lfo1} onChange={(changes) => updateSection("lfo1", changes)} />
            <LfoCard title="LFO 2" lfo={patch.lfo2} onChange={(changes) => updateSection("lfo2", changes)} />
            <SynthSection title="Frequency Modulation">
              <Toggle label="Enable FM" checked={patch.fm.enabled} onChange={(enabled) => updateSection("fm", { enabled })} hint="Oscillator-rate modulation for metallic bells, growls, and digital basses." />
              <div className="knob-row">
                <Knob label="Ratio" value={patch.fm.ratio} min={0.125} max={16} step={0.125} onChange={(ratio) => updateSection("fm", { ratio })} />
                <Knob label="Amount" value={patch.fm.amount} min={0} max={1} step={0.001} onChange={(amount) => updateSection("fm", { amount })} display={percent} />
              </div>
            </SynthSection>
            <SynthSection title="Ring Modulation">
              <Toggle label="Enable ring mod" checked={patch.ring.enabled} onChange={(enabled) => updateSection("ring", { enabled })} hint="Adds non-harmonic sidebands and aggressive digital character." />
              <div className="knob-row">
                <Knob label="Ratio" value={patch.ring.ratio} min={0.125} max={8} step={0.125} onChange={(ratio) => updateSection("ring", { ratio })} />
                <Knob label="Amount" value={patch.ring.amount} min={0} max={1} step={0.001} onChange={(amount) => updateSection("ring", { amount })} display={percent} />
              </div>
            </SynthSection>
            <SynthSection title="Performance Response" className="span-2">
              <div className="knob-row">
                <Knob label="Velocity→Amp" value={patch.velocityToAmp} onChange={(velocityToAmp) => updateRoot({ velocityToAmp })} display={percent} />
                <Knob label="Velocity→Filter" value={patch.velocityToFilter} onChange={(velocityToFilter) => updateRoot({ velocityToFilter })} display={percent} />
                <Knob label="Key Tracking" value={patch.keyTracking} onChange={(keyTracking) => updateRoot({ keyTracking })} display={percent} />
                <Knob label="Phase Random" value={patch.phaseRandom} onChange={(phaseRandom) => updateRoot({ phaseRandom })} display={percent} />
                <Knob label="Master Tune" value={patch.masterTune} min={-100} max={100} step={1} onChange={(masterTune) => updateRoot({ masterTune })} display={cents} />
              </div>
            </SynthSection>
          </div>
        )}

        {tab === "fx" && (
          <div className="synth-page-grid">
            <SynthSection title="Per-Voice Chorus" className="span-2">
              <div className="knob-row">
                <Knob label="Mix" value={patch.voiceFx.chorus} onChange={(chorus) => updateSection("voiceFx", { chorus })} display={percent} />
                <Knob label="Rate" value={patch.voiceFx.chorusRate} min={0.02} max={8} step={0.01} onChange={(chorusRate) => updateSection("voiceFx", { chorusRate })} display={hertz} />
                <Knob label="Depth" value={patch.voiceFx.chorusDepth} min={0.0005} max={0.02} step={0.0001} onChange={(chorusDepth) => updateSection("voiceFx", { chorusDepth })} display={milliseconds} />
                <Knob label="Saturation" value={patch.voiceFx.saturation} onChange={(saturation) => updateSection("voiceFx", { saturation })} display={percent} />
                <Knob label="Bit Crush" value={patch.voiceFx.bitcrush} onChange={(bitcrush) => updateSection("voiceFx", { bitcrush })} display={percent} />
              </div>
            </SynthSection>
            <SynthSection title="Macro Performance" className="span-2">
              <p className="section-copy">Macros combine several synthesis parameters into four fast musical controls. Automate them in future arrangements or map them from a MIDI controller.</p>
              <div className="macro-grid-large">
                <Knob size="lg" label="Character" value={patch.macros.character} onChange={(character) => updateSection("macros", { character })} display={percent} />
                <Knob size="lg" label="Brightness" value={patch.macros.brightness} onChange={(brightness) => updateSection("macros", { brightness })} display={percent} />
                <Knob size="lg" label="Motion" value={patch.macros.motion} onChange={(motion) => updateSection("macros", { motion })} display={percent} />
                <Knob size="lg" label="Width" value={patch.macros.width} onChange={(widthValue) => updateSection("macros", { width: widthValue })} display={percent} />
              </div>
            </SynthSection>
            <SynthSection title="Arpeggiator">
              <Toggle label="Enable arpeggiator metadata" checked={patch.arp.enabled} onChange={(enabled) => updateSection("arp", { enabled })} hint="Saved with the patch and ready for pattern-generation workflows." />
              <div className="control-stack">
                <SelectControl label="Mode" value={patch.arp.mode} options={["up", "down", "upDown", "random", "chord"]} onChange={(mode) => updateSection("arp", { mode })} />
                <SelectControl label="Rate" value={patch.arp.rate} options={["1/4", "1/8", "1/8T", "1/16", "1/16T", "1/32"]} onChange={(rate) => updateSection("arp", { rate })} />
              </div>
              <div className="knob-row">
                <Knob label="Octaves" value={patch.arp.octaves} min={1} max={4} step={1} onChange={(octaves) => updateSection("arp", { octaves })} />
                <Knob label="Gate" value={patch.arp.gate} min={0.05} max={1} step={0.01} onChange={(gate) => updateSection("arp", { gate })} display={percent} />
              </div>
            </SynthSection>
          </div>
        )}

        {tab === "patch" && (
          <PatchManager
            presets={allPresets}
            selectedPreset={selectedPreset}
            customPresets={project.customPresets || []}
            onSelect={(preset) => dispatch({ type: "APPLY_SYNTH_PRESET", trackId: track.id, preset })}
            onDelete={(presetId) => dispatch({ type: "DELETE_CUSTOM_PRESET", presetId })}
            onSave={savePatch}
            onExport={exportPatch}
          />
        )}
        </div>

        <SynthKeyboard octave={keyboardOctave} setOctave={setKeyboardOctave} onPreview={onPreview} />
      </div>
    </Panel>
  );
}

function OscillatorCard({ label, oscillator, onChange }) {
  return (
    <SynthSection title={label} muted={!oscillator.enabled}>
      <Toggle label="Enabled" checked={oscillator.enabled} onChange={(enabled) => onChange({ enabled })} />
      <SelectControl label="Waveform" value={oscillator.waveform} options={SYNTH_WAVEFORMS} onChange={(waveform) => onChange({ waveform })} />
      <MiniWave waveform={oscillator.waveform} />
      <div className="knob-row">
        <Knob label="Octave" value={oscillator.octave} min={-3} max={3} step={1} onChange={(octave) => onChange({ octave })} />
        <Knob label="Semitone" value={oscillator.semitone} min={-24} max={24} step={1} onChange={(semitone) => onChange({ semitone })} display={semitones} />
        <Knob label="Fine" value={oscillator.fine} min={-100} max={100} step={1} onChange={(fine) => onChange({ fine })} display={cents} />
        <Knob label="Level" value={oscillator.level} onChange={(level) => onChange({ level })} display={percent} />
        <Knob label="Pan" value={oscillator.pan} min={-1} max={1} step={0.01} onChange={(pan) => onChange({ pan })} display={panDisplay} />
        <Knob label="Phase" value={oscillator.phase} min={0} max={1} step={0.01} onChange={(phase) => onChange({ phase })} display={(value) => `${Math.round(value * 360)}°`} />
      </div>
    </SynthSection>
  );
}

function LayerCard({ title, layer, onChange }) {
  return (
    <SynthSection title={title} muted={!layer.enabled}>
      <Toggle label="Enabled" checked={layer.enabled} onChange={(enabled) => onChange({ enabled })} />
      <SelectControl label="Source" value={layer.waveform} options={SYNTH_WAVEFORMS} onChange={(waveform) => onChange({ waveform })} />
      <MiniWave waveform={layer.waveform} />
      <div className="knob-row">
        <Knob label="Octave" value={layer.octave} min={-3} max={3} step={1} onChange={(octave) => onChange({ octave })} />
        <Knob label="Semitone" value={layer.semitone} min={-24} max={24} step={1} onChange={(semitone) => onChange({ semitone })} display={semitones} />
        <Knob label="Fine" value={layer.fine} min={-100} max={100} step={1} onChange={(fine) => onChange({ fine })} display={cents} />
        <Knob label="Level" value={layer.level} min={0} max={1} step={0.001} onChange={(level) => onChange({ level })} display={percent} />
        <Knob label="Pan" value={layer.pan} min={-1} max={1} step={0.01} onChange={(pan) => onChange({ pan })} display={panDisplay} />
        <Knob label="Unison" value={layer.unison} min={1} max={9} step={1} onChange={(unison) => onChange({ unison })} />
        <Knob label="Detune" value={layer.detune} min={0} max={50} step={0.1} onChange={(detune) => onChange({ detune })} display={cents} />
        <Knob label="Stereo" value={layer.stereo} min={0} max={1} step={0.01} onChange={(stereo) => onChange({ stereo })} display={percent} />
        <Knob label="Delay" value={layer.delay} min={0} max={0.25} step={0.001} onChange={(delay) => onChange({ delay })} display={milliseconds} />
        <Knob label="Motion" value={layer.motion} min={0} max={1} step={0.001} onChange={(motion) => onChange({ motion })} display={percent} />
        <Knob label="Rate" value={layer.motionRate} min={0.01} max={4} step={0.01} onChange={(motionRate) => onChange({ motionRate })} display={hertz} />
      </div>
    </SynthSection>
  );
}

function FilterCard({ title, filter, onChange }) {
  return (
    <SynthSection title={title} muted={!filter.enabled}>
      <Toggle label="Enabled" checked={filter.enabled} onChange={(enabled) => onChange({ enabled })} />
      <SelectControl label="Mode" value={filter.type} options={FILTER_TYPES} onChange={(type) => onChange({ type })} />
      <FilterGraph cutoff={filter.cutoff} resonance={filter.resonance} type={filter.type} />
      <div className="knob-row">
        <Knob label="Cutoff" value={filter.cutoff} min={20} max={20000} step={1} onChange={(cutoff) => onChange({ cutoff })} display={frequency} />
        <Knob label="Resonance" value={filter.resonance} min={0} max={24} step={0.1} onChange={(resonance) => onChange({ resonance })} />
        <Knob label="Drive" value={filter.drive} min={0} max={1} step={0.01} onChange={(drive) => onChange({ drive })} display={percent} />
        <Knob label="Key Track" value={filter.keyTrack} min={0} max={1} step={0.01} onChange={(keyTrack) => onChange({ keyTrack })} display={percent} />
      </div>
    </SynthSection>
  );
}

function EnvelopeCard({ title, envelope, onChange, filter = false }) {
  return (
    <SynthSection title={title} className="span-2">
      <EnvelopeGraph envelope={envelope} />
      <div className="knob-row">
        <Knob label="Attack" value={envelope.attack} min={0.001} max={4} step={0.001} onChange={(attack) => onChange({ attack })} display={seconds} />
        <Knob label="Hold" value={envelope.hold || 0} min={0} max={2} step={0.001} onChange={(hold) => onChange({ hold })} display={seconds} />
        <Knob label="Decay" value={envelope.decay} min={0.005} max={5} step={0.005} onChange={(decay) => onChange({ decay })} display={seconds} />
        <Knob label="Sustain" value={envelope.sustain} min={0.001} max={1} step={0.001} onChange={(sustain) => onChange({ sustain })} display={percent} />
        <Knob label="Release" value={envelope.release} min={0.01} max={8} step={0.01} onChange={(release) => onChange({ release })} display={seconds} />
        {filter && <Knob label="Amount" value={envelope.amount} min={-1} max={1} step={0.01} onChange={(amount) => onChange({ amount })} display={bipolarPercent} />}
      </div>
    </SynthSection>
  );
}

function LfoCard({ title, lfo, onChange }) {
  return (
    <SynthSection title={title} muted={!lfo.enabled}>
      <Toggle label="Enabled" checked={lfo.enabled} onChange={(enabled) => onChange({ enabled })} />
      <SelectControl label="Target" value={lfo.target} options={LFO_TARGETS} onChange={(target) => onChange({ target })} />
      <SelectControl label="Waveform" value={lfo.waveform} options={["sine", "triangle", "sawtooth", "square", "pulse25", "digital"]} onChange={(waveform) => onChange({ waveform })} />
      <MiniWave waveform={lfo.waveform} />
      <Toggle label="Tempo sync" checked={lfo.sync} onChange={(sync) => onChange({ sync })} />
      {lfo.sync && <SelectControl label="Division" value={lfo.division} options={["1/1", "1/2", "1/4", "1/8", "1/8T", "1/16", "1/16T", "1/32"]} onChange={(division) => onChange({ division })} />}
      <div className="knob-row">
        <Knob label="Rate" value={lfo.rate} min={0.01} max={30} step={0.01} onChange={(rate) => onChange({ rate })} display={hertz} disabled={lfo.sync} />
        <Knob label="Amount" value={lfo.amount} min={-1} max={1} step={0.001} onChange={(amount) => onChange({ amount })} display={bipolarPercent} />
        <Knob label="Phase" value={lfo.phase} min={0} max={1} step={0.01} onChange={(phase) => onChange({ phase })} display={(value) => `${Math.round(value * 360)}°`} />
      </div>
    </SynthSection>
  );
}

function PatchManager({ presets, selectedPreset, customPresets, onSelect, onDelete, onSave, onExport }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = ["All", ...new Set(presets.map((preset) => preset.category))];
  const filtered = presets.filter((preset) => {
    const matchesCategory = category === "All" || preset.category === category;
    const haystack = `${preset.name} ${preset.category} ${(preset.tags || []).join(" ")}`.toLowerCase();
    return matchesCategory && haystack.includes(query.toLowerCase());
  });

  return (
    <div className="patch-manager">
      <div className="patch-manager-toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${presets.length} factory and custom patches…`} />
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((entry) => <option key={entry}>{entry}</option>)}
        </select>
        <button type="button" onClick={onSave}>Save current</button>
        <button type="button" onClick={onExport}>Export current</button>
      </div>
      <div className="patch-grid">
        {filtered.map((preset) => {
          const isCustom = customPresets.some((entry) => entry.id === preset.id);
          return (
            <article key={preset.id} className={`patch-card ${selectedPreset?.id === preset.id ? "selected" : ""}`}>
              <button type="button" className="patch-main" onClick={() => onSelect(preset)}>
                <span>{preset.category}</span>
                <strong>{preset.name}</strong>
                <p>{preset.description}</p>
                <small>{(preset.tags || []).slice(0, 4).join(" · ")}</small>
              </button>
              {isCustom && <button type="button" className="danger" onClick={() => onDelete(preset.id)}>Delete</button>}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function SynthKeyboard({ octave, setOctave, onPreview }) {
  const semitonesInOctave = [0, 2, 4, 5, 7, 9, 11, 1, 3, 6, 8, 10];
  return (
    <div className="synth-keyboard-wrap">
      <div className="keyboard-controls">
        <strong>Performance Keyboard</strong>
        <button type="button" onClick={() => setOctave(Math.max(1, octave - 1))}>Octave −</button>
        <span>C{octave}</span>
        <button type="button" onClick={() => setOctave(Math.min(7, octave + 1))}>Octave +</button>
        <small>Computer keys A–K also play notes when MIDI is enabled.</small>
      </div>
      <div className="synth-keyboard">
        {semitonesInOctave.map((semitone, index) => {
          const midi = (octave + 1) * 12 + semitone;
          const black = [1, 3, 6, 8, 10].includes(semitone);
          return <button key={`${midi}-${index}`} type="button" className={black ? "black" : "white"} onMouseDown={() => onPreview(midi)}>{black ? "" : noteLabel(semitone)}</button>;
        })}
      </div>
    </div>
  );
}

function SynthSection({ title, children, className = "", muted = false }) {
  return (
    <section className={`synth-section ${className} ${muted ? "muted" : ""}`}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function WaveformDisplay({ patch }) {
  const points = Array.from({ length: 180 }, (_, index) => {
    const x = index / 179;
    const phase = x * Math.PI * 6;
    const layerSample = (patch.layers || []).reduce((sum, layer) => (
      layer.enabled
        ? sum + waveSample(layer.waveform, phase * 2 ** (((layer.octave || 0) * 12 + (layer.semitone || 0)) / 12)) * layer.level
        : sum
    ), 0);
    const sample = waveSample(patch.oscA.waveform, phase) * patch.oscA.level
      + waveSample(patch.oscB.waveform, phase * 2 ** ((patch.oscB.semitone || 0) / 12)) * patch.oscB.level
      + (patch.oscC.enabled ? waveSample(patch.oscC.waveform, phase * 2 ** ((patch.oscC.semitone || 0) / 12)) * patch.oscC.level : 0)
      + layerSample;
    return `${(x * 100).toFixed(2)},${(50 - sample * 24).toFixed(2)}`;
  }).join(" ");
  return (
    <div className="waveform-display">
      <div>
        <span>LIVE PATCH SHAPE</span>
        <strong>{patch.engineMode.toUpperCase()} · {patch.unison} CORE UNISON · {patch.layers.filter((layer) => layer.enabled).length} LAYERS</strong>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Combined oscillator waveform">
        <defs>
          <linearGradient id="waveGlow" x1="0" x2="1">
            <stop offset="0" stopColor="#66e3bf" />
            <stop offset="1" stopColor="#8f7cff" />
          </linearGradient>
        </defs>
        <path d="M0 50 H100" className="wave-zero" />
        <polyline points={points} fill="none" stroke="url(#waveGlow)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function MiniWave({ waveform }) {
  const points = Array.from({ length: 80 }, (_, index) => {
    const x = index / 79;
    return `${(x * 100).toFixed(2)},${(50 - waveSample(waveform, x * Math.PI * 4) * 32).toFixed(2)}`;
  }).join(" ");
  return <svg className="mini-wave" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={points} fill="none" /></svg>;
}

function EnvelopeGraph({ envelope }) {
  const attack = Math.min(28, 5 + Math.sqrt(envelope.attack || 0) * 12);
  const hold = Math.min(12, (envelope.hold || 0) * 8);
  const decay = Math.min(25, 7 + Math.sqrt(envelope.decay || 0) * 10);
  const sustain = 86 - (envelope.sustain ?? 0.7) * 65;
  const release = Math.min(27, 6 + Math.sqrt(envelope.release || 0) * 10);
  const x1 = attack;
  const x2 = x1 + hold;
  const x3 = x2 + decay;
  const x4 = 100 - release;
  return (
    <svg className="envelope-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d="M0 88 H100 M0 55 H100 M0 22 H100" className="grid" />
      <polyline points={`0,88 ${x1},12 ${x2},12 ${x3},${sustain} ${x4},${sustain} 100,88`} fill="none" />
    </svg>
  );
}

function FilterGraph({ cutoff, resonance, type }) {
  const normalized = Math.max(0.02, Math.min(0.98, Math.log10(Math.max(20, cutoff) / 20) / 3));
  const x = normalized * 100;
  const q = Math.min(18, resonance || 0);
  let path;
  if (type === "highpass") path = `M0,88 C${Math.max(0, x - 18)},88 ${Math.max(0, x - 8)},${70 - q} ${x},38 C${x + 8},16 ${Math.min(100, x + 18)},16 100,16`;
  else if (type === "bandpass") path = `M0,88 C${Math.max(0, x - 22)},88 ${Math.max(0, x - 10)},${26 - q} ${x},${18 - q} C${Math.min(100, x + 10)},${26 - q} ${Math.min(100, x + 22)},88 100,88`;
  else path = `M0,16 C${Math.max(0, x - 18)},16 ${Math.max(0, x - 8)},${16 - q * 0.5} ${x},${26 - q} C${Math.min(100, x + 8)},${42 + q} ${Math.min(100, x + 18)},88 100,88`;
  return <svg className="filter-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0 88 H100 M0 55 H100 M0 22 H100" className="grid" /><path d={path} className="curve" fill="none" /></svg>;
}

function waveSample(waveform, phase) {
  const cycle = ((phase / (Math.PI * 2)) % 1 + 1) % 1;
  switch (waveform) {
    case "sine": return Math.sin(phase);
    case "triangle": return 1 - 4 * Math.abs(Math.round(cycle) - cycle);
    case "square": return Math.sin(phase) >= 0 ? 1 : -1;
    case "pulse25": return cycle < 0.25 ? 1 : -1;
    case "pulse12": return cycle < 0.125 ? 1 : -1;
    case "organ": return Math.sin(phase) * 0.7 + Math.sin(phase * 3) * 0.22 + Math.sin(phase * 5) * 0.08;
    case "hollow": return Math.sin(phase) * 0.75 + Math.sin(phase * 3) * 0.25;
    case "digital": return Math.sin(phase) * 0.58 + Math.sin(phase * 4) * 0.28 + Math.sin(phase * 7) * 0.14;
    case "metallic": return Math.sin(phase) * 0.45 + Math.sin(phase * 2.71) * 0.35 + Math.sin(phase * 5.43) * 0.2;
    case "vowel": return Math.sin(phase) * 0.5 + Math.sin(phase * 4) * 0.32 + Math.sin(phase * 7) * 0.18;
    case "warmSaw": return (2 * cycle - 1) * 0.7 + Math.sin(phase) * 0.3;
    case "cinematic": return Math.sin(phase) * 0.42 + Math.sin(phase * 0.5) * 0.18 + Math.sin(phase * 2) * 0.23 + Math.sin(phase * 5) * 0.12;
    case "choir": return Math.sin(phase) * 0.5 + Math.sin(phase * 2) * 0.18 + Math.sin(phase * 3) * 0.19 + Math.sin(phase * 5) * 0.09;
    case "bowed": return Math.tanh((2 * cycle - 1) * 2.2) * 0.55 + Math.sin(phase * 2) * 0.24 + Math.sin(phase * 4) * 0.12;
    case "glass": return Math.sin(phase) * 0.38 + Math.sin(phase * 2.02) * 0.24 + Math.sin(phase * 5.03) * 0.22 + Math.sin(phase * 9.07) * 0.1;
    case "air": return Math.sin(phase) * 0.48 + Math.sin(phase * 1.01) * 0.18 + Math.sin(phase * 6.1) * 0.08;
    case "shimmer": return Math.sin(phase) * 0.36 + Math.sin(phase * 2) * 0.18 + Math.sin(phase * 4) * 0.17 + Math.sin(phase * 8) * 0.14;
    case "formant": return Math.sin(phase) * 0.42 + Math.sin(phase * 3) * 0.25 + Math.sin(phase * 7) * 0.2;
    case "spectral": return Math.sin(phase) * 0.31 + Math.sin(phase * 2.37) * 0.24 + Math.sin(phase * 4.81) * 0.19 + Math.sin(phase * 8.19) * 0.12;
    case "sawtooth":
    default: return 2 * cycle - 1;
  }
}

function SamplerDesigner({ track, dispatch }) {
  const patch = (changes) => dispatch({ type: "UPDATE_TRACK", id: track.id, patch: changes });
  return (
    <Panel title={`Sampler Lab · ${track.name}`} subtitle="Destructive-free tuning, trim, envelope, filter, reverse, stereo placement, and one-shot shaping">
      <div className="designer-grid sampler-designer-grid">
        <SynthSection title="Playback">
          <div className="knob-row">
            <Knob label="Pitch" value={track.pitch || 0} min={-36} max={36} step={1} onChange={(pitch) => patch({ pitch })} display={semitones} />
            <Knob label="Start" value={track.startOffset || 0} min={0} max={5} step={0.001} onChange={(startOffset) => patch({ startOffset })} display={seconds} />
            <Knob label="End" value={track.endOffset || 5} min={0.01} max={10} step={0.001} onChange={(endOffset) => patch({ endOffset })} display={seconds} />
            <Knob label="Pan" value={track.samplePan || 0} min={-1} max={1} step={0.01} onChange={(samplePan) => patch({ samplePan })} display={panDisplay} />
          </div>
          <Toggle label="Reverse playback" checked={track.reverse} onChange={(reverse) => patch({ reverse })} />
        </SynthSection>
        <SynthSection title="Amplitude Shape">
          <EnvelopeGraph envelope={{ attack: track.sampleAttack || 0.001, decay: 0.01, sustain: 1, release: track.sampleRelease || 0.04 }} />
          <div className="knob-row">
            <Knob label="Attack" value={track.sampleAttack || 0.001} min={0.001} max={2} step={0.001} onChange={(sampleAttack) => patch({ sampleAttack })} display={seconds} />
            <Knob label="Release" value={track.sampleRelease || 0.04} min={0.005} max={4} step={0.005} onChange={(sampleRelease) => patch({ sampleRelease })} display={seconds} />
          </div>
        </SynthSection>
        <SynthSection title="Filter">
          <SelectControl label="Mode" value={track.sampleFilterType || "lowpass"} options={FILTER_TYPES.slice(0, 4)} onChange={(sampleFilterType) => patch({ sampleFilterType })} />
          <FilterGraph cutoff={track.sampleCutoff || 20000} resonance={track.sampleResonance || 0.2} type={track.sampleFilterType || "lowpass"} />
          <div className="knob-row">
            <Knob label="Cutoff" value={track.sampleCutoff || 20000} min={20} max={20000} step={1} onChange={(sampleCutoff) => patch({ sampleCutoff })} display={frequency} />
            <Knob label="Resonance" value={track.sampleResonance || 0.2} min={0} max={24} step={0.1} onChange={(sampleResonance) => patch({ sampleResonance })} />
          </div>
        </SynthSection>
      </div>
    </Panel>
  );
}

const percent = (value) => `${Math.round(value * 100)}%`;
const bipolarPercent = (value) => `${value >= 0 ? "+" : ""}${Math.round(value * 100)}%`;
const cents = (value) => `${value >= 0 ? "+" : ""}${Math.round(value)} ct`;
const semitones = (value) => `${value >= 0 ? "+" : ""}${Math.round(value)} st`;
const seconds = (value) => value < 0.1 ? `${Math.round(value * 1000)} ms` : `${value.toFixed(2)} s`;
const milliseconds = (value) => `${Math.round(value * 1000)} ms`;
const hertz = (value) => `${value.toFixed(value < 10 ? 2 : 1)} Hz`;
const frequency = (value) => value >= 1000 ? `${(value / 1000).toFixed(1)} kHz` : `${Math.round(value)} Hz`;
const panDisplay = (value) => value === 0 ? "C" : value < 0 ? `L${Math.round(-value * 100)}` : `R${Math.round(value * 100)}`;
const noteLabel = (semitone) => ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][semitone];
