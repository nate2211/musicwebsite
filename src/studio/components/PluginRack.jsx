import React, { useMemo, useState } from "react";
import { Knob, Panel, Segmented, SelectControl, Toggle } from "./Controls";

const ROOM_OPTIONS = [
  { value: "booth", label: "Vocal Booth" },
  { value: "studio", label: "Studio Room" },
  { value: "chamber", label: "Warm Chamber" },
  { value: "hall", label: "Concert Hall" },
  { value: "cathedral", label: "Cathedral" },
  { value: "plate", label: "Bright Plate" },
  { value: "spring", label: "Spring Tank" },
  { value: "ambient", label: "Infinite Ambient" },
];

const DELAY_DIVISIONS = ["1/1", "1/2", "1/4", "1/8", "1/8T", "1/16", "1/16T", "1/32"];

export function PluginRack({ project, track, dispatch }) {
  const [target, setTarget] = useState("track");
  const master = project.master || {};
  const settings = target === "master" ? master : (track?.effects || {});
  const targetName = target === "master" ? "Master Output" : (track?.name || "No selected track");

  const update = (patch) => {
    if (target === "master") {
      dispatch({ type: "SET_PROJECT_FIELD", field: "master", value: { ...master, ...patch } });
    } else if (track) {
      dispatch({ type: "UPDATE_TRACK_NESTED", id: track.id, key: "effects", patch });
    }
  };

  const pluginStatus = useMemo(() => [
    settings.timeShaperEnabled,
    settings.multibandEnabled,
    settings.stereoEnabled !== false,
    target === "master" ? false : settings.pitchShiftEnabled !== false && Math.abs(settings.pitchShiftSemitones || 0) > 0,
    settings.eqEnabled !== false,
    settings.delayEnabled !== false && (settings.delayMix || 0) > 0,
    settings.reverbEnabled !== false && (settings.reverbMix || 0) > 0,
  ].filter(Boolean).length, [settings, target]);

  return (
    <Panel
      title="Plugin Rack"
      subtitle="Horizontal insert chain with individual interfaces for rhythmic time shaping, dynamics, stereo control, pitch, EQ, delay, room reverb, and master processing"
      className="plugin-rack-panel"
      actions={(
        <>
          <Segmented
            compact
            value={target}
            onChange={setTarget}
            options={[{ value: "track", label: "Selected Track" }, { value: "master", label: "Master Rack" }]}
          />
          <span className="plugin-target-chip">{targetName} · {pluginStatus} active</span>
        </>
      )}
    >
      {target === "track" && !track ? (
        <div className="plugin-empty">Select a track to edit its insert plugins.</div>
      ) : (
        <div className="plugin-rack-scroll" data-plugin-target={target}>
          <TimeShaperPlugin settings={settings} update={update} />
          <MultibandPlugin settings={settings} update={update} />
          <StereoPlugin settings={settings} update={update} isMaster={target === "master"} />
          {target === "track" && <PitchPlugin settings={settings} update={update} />}
          <EqPlugin settings={settings} update={update} />
          <DelayPlugin settings={settings} update={update} />
          <ReverbPlugin settings={settings} update={update} />
          <MasterPlugin settings={settings} update={update} isMaster={target === "master"} />
          {target === "master" && <EngineGuardPlugin settings={settings} update={update} />}
        </div>
      )}
      <div className="plugin-signal-bar" aria-label="Plugin signal flow">
        <b>INPUT</b><i />
        <span>TIME</span><i />
        <span>DYNAMICS</span><i />
        <span>STEREO / PITCH</span><i />
        <span>EQ</span><i />
        <span>DELAY / ROOM</span><i />
        <span>TRUE-PEAK GUARD</span><i />
        <b>OUTPUT</b>
      </div>
    </Panel>
  );
}

function PluginFrame({ code, title, subtitle, enabled, onEnabled, children, accent = "violet" }) {
  return (
    <section className={`plugin-module plugin-${accent} ${enabled ? "enabled" : "bypassed"}`}>
      <header>
        <div><small>{code}</small><strong>{title}</strong><span>{subtitle}</span></div>
        <Toggle label={enabled ? "ON" : "BYPASS"} checked={enabled} onChange={onEnabled} />
      </header>
      <div className="plugin-display">{children}</div>
    </section>
  );
}

function TimeShaperPlugin({ settings, update }) {
  const enabled = Boolean(settings.timeShaperEnabled);
  const pattern = settings.timeShaperPattern || "straight";
  const shapes = {
    straight: [1, 1, 1, 1, 1, 1, 1, 1],
    half: [1, 1, 1, 1, .12, .12, .12, .12],
    gate: [1, .08, 1, .08, 1, .08, 1, .08],
    triplet: [1, .16, .16, 1, .16, .16, 1, .16],
    stutter: [1, .2, .72, .12, 1, .2, .46, .12],
    sidechain: [.18, .42, .68, .88, 1, 1, 1, 1],
    pulse: [1, .35, .55, .35, 1, .35, .55, .35],
  };
  const values = shapes[pattern] || shapes.gate;
  return (
    <PluginFrame code="TS-01" title="Time Shaper" subtitle="Gross Beat-style rhythmic volume motion" enabled={enabled} onEnabled={(value) => update({ timeShaperEnabled: value })} accent="pink">
      <div className="time-shaper-graph">{values.map((value, index) => <i key={index} style={{ height: `${value * 100}%` }} />)}</div>
      <SelectControl label="Pattern" value={pattern} options={Object.keys(shapes)} onChange={(timeShaperPattern) => update({ timeShaperPattern })} />
      <div className="plugin-knobs">
        <Knob label="Depth" value={settings.timeShaperDepth ?? .85} onChange={(timeShaperDepth) => update({ timeShaperDepth })} display={percent} />
        <Knob label="Mix" value={settings.timeShaperMix ?? 1} onChange={(timeShaperMix) => update({ timeShaperMix })} display={percent} />
        <Knob label="Rate" value={settings.timeShaperRate ?? 1} min={1} max={4} step={1} onChange={(timeShaperRate) => update({ timeShaperRate })} display={(value) => `${value}×`} />
        <Knob label="Smooth" value={settings.timeShaperSmooth ?? .012} min={.001} max={.08} step={.001} onChange={(timeShaperSmooth) => update({ timeShaperSmooth })} display={milliseconds} />
      </div>
    </PluginFrame>
  );
}

function MultibandPlugin({ settings, update }) {
  const enabled = Boolean(settings.multibandEnabled);
  return (
    <PluginFrame code="MB-03" title="Tri-Band Compressor" subtitle="Independent low, mid, and high dynamics" enabled={enabled} onEnabled={(multibandEnabled) => update({ multibandEnabled })} accent="blue">
      <div className="multiband-display">
        {[
          ["LOW", settings.multibandLowThreshold ?? -18, settings.multibandLowRatio ?? 2.5],
          ["MID", settings.multibandMidThreshold ?? -20, settings.multibandMidRatio ?? 2.1],
          ["HIGH", settings.multibandHighThreshold ?? -22, settings.multibandHighRatio ?? 1.8],
        ].map(([name, threshold, ratio]) => <div key={name}><b>{name}</b><i style={{ height: `${Math.max(8, 100 + threshold)}%` }} /><span>{ratio.toFixed(1)}:1</span></div>)}
      </div>
      <div className="plugin-knobs">
        <Knob label="Low X" value={settings.multibandLowCross ?? 180} min={70} max={900} step={1} onChange={(multibandLowCross) => update({ multibandLowCross })} display={frequency} />
        <Knob label="High X" value={settings.multibandHighCross ?? 3200} min={1000} max={12000} step={10} onChange={(multibandHighCross) => update({ multibandHighCross })} display={frequency} />
        <Knob label="Low Thresh" value={settings.multibandLowThreshold ?? -18} min={-48} max={0} step={.5} onChange={(multibandLowThreshold) => update({ multibandLowThreshold })} display={decibels} />
        <Knob label="Mid Thresh" value={settings.multibandMidThreshold ?? -20} min={-48} max={0} step={.5} onChange={(multibandMidThreshold) => update({ multibandMidThreshold })} display={decibels} />
        <Knob label="High Thresh" value={settings.multibandHighThreshold ?? -22} min={-48} max={0} step={.5} onChange={(multibandHighThreshold) => update({ multibandHighThreshold })} display={decibels} />
        <Knob label="Low Ratio" value={settings.multibandLowRatio ?? 2.5} min={1} max={12} step={.1} onChange={(multibandLowRatio) => update({ multibandLowRatio })} display={ratio} />
        <Knob label="Mid Ratio" value={settings.multibandMidRatio ?? 2.1} min={1} max={12} step={.1} onChange={(multibandMidRatio) => update({ multibandMidRatio })} display={ratio} />
        <Knob label="High Ratio" value={settings.multibandHighRatio ?? 1.8} min={1} max={12} step={.1} onChange={(multibandHighRatio) => update({ multibandHighRatio })} display={ratio} />
        <Knob label="Mix" value={settings.multibandMix ?? 1} onChange={(multibandMix) => update({ multibandMix })} display={percent} />
      </div>
      <div className="plugin-buttons">
        <button type="button" onClick={() => update({ multibandLowThreshold: -12, multibandMidThreshold: -14, multibandHighThreshold: -16, multibandLowRatio: 1.7, multibandMidRatio: 1.6, multibandHighRatio: 1.5, multibandMix: .72 })}>Transparent</button>
        <button type="button" onClick={() => update({ multibandLowThreshold: -20, multibandMidThreshold: -22, multibandHighThreshold: -24, multibandLowRatio: 3.2, multibandMidRatio: 2.6, multibandHighRatio: 2.1, multibandMix: .9 })}>Punch</button>
        <button type="button" onClick={() => update({ multibandLowThreshold: -18, multibandMidThreshold: -20, multibandHighThreshold: -22, multibandLowRatio: 2.4, multibandMidRatio: 2, multibandHighRatio: 1.7, multibandMix: .78 })}>Glue</button>
      </div>
    </PluginFrame>
  );
}

function StereoPlugin({ settings, update, isMaster = false }) {
  const enabled = settings.stereoEnabled !== false;
  const pan = settings.stereoPan ?? 0;
  const width = settings.stereoWidth ?? 1;
  return (
    <PluginFrame code="ST-02" title="Stereo Field" subtitle="Pan, width, mono compatibility, and imaging" enabled={enabled} onEnabled={(stereoEnabled) => update({ stereoEnabled })} accent="green">
      <div className="stereo-scope"><i style={{ transform: `translateX(${pan * 35}px) scaleX(${Math.max(.08, width)})` }} /></div>
      <div className="plugin-knobs">
        <Knob label="Pan" value={pan} min={-1} max={1} step={.01} onChange={(stereoPan) => update({ stereoPan })} display={panDisplay} />
        <Knob label="Width" value={Math.min(width, isMaster ? 1.3 : 1.6)} min={0} max={isMaster ? 1.3 : 1.6} step={.01} onChange={(stereoWidth) => update({ stereoWidth })} display={(value) => `${Math.round(value * 100)}%`} />
      </div>
      <div className="plugin-buttons"><button type="button" onClick={() => update({ stereoWidth: 0 })}>Mono</button><button type="button" onClick={() => update({ stereoWidth: 1 })}>Natural</button><button type="button" onClick={() => update({ stereoWidth: 1.35 })}>Wide</button></div>
    </PluginFrame>
  );
}

function PitchPlugin({ settings, update }) {
  const enabled = settings.pitchShiftEnabled !== false;
  return (
    <PluginFrame code="PS-12" title="Pitch Shifter" subtitle="Production pitch and fine tuning per track" enabled={enabled} onEnabled={(pitchShiftEnabled) => update({ pitchShiftEnabled })} accent="amber">
      <div className="pitch-display"><b>{signed(settings.pitchShiftSemitones ?? 0)}</b><span>SEMITONES</span><small>{signed(settings.pitchShiftFine ?? 0)} cents</small></div>
      <div className="plugin-knobs">
        <Knob label="Pitch" value={settings.pitchShiftSemitones ?? 0} min={-24} max={24} step={1} onChange={(pitchShiftSemitones) => update({ pitchShiftSemitones })} display={(value) => `${signed(value)} st`} />
        <Knob label="Fine" value={settings.pitchShiftFine ?? 0} min={-100} max={100} step={1} onChange={(pitchShiftFine) => update({ pitchShiftFine })} display={(value) => `${signed(value)} ct`} />
      </div>
      <div className="plugin-buttons"><button type="button" onClick={() => update({ pitchShiftSemitones: -12 })}>−12</button><button type="button" onClick={() => update({ pitchShiftSemitones: 0, pitchShiftFine: 0 })}>Reset</button><button type="button" onClick={() => update({ pitchShiftSemitones: 12 })}>+12</button></div>
    </PluginFrame>
  );
}

function EqPlugin({ settings, update }) {
  const enabled = settings.eqEnabled !== false;
  const points = [settings.lowGain ?? 0, settings.midGain ?? 0, settings.highGain ?? 0];
  return (
    <PluginFrame code="EQ-06" title="Production EQ" subtitle="Filters plus low, presence, and air shaping" enabled={enabled} onEnabled={(eqEnabled) => update({ eqEnabled })} accent="cyan">
      <svg className="plugin-eq-graph" viewBox="0 0 240 80" preserveAspectRatio="none"><path d="M0 40H240 M60 0V80 M120 0V80 M180 0V80" className="grid"/><polyline points={`0,40 35,${40-points[0]*2} 120,${40-points[1]*2} 205,${40-points[2]*2} 240,40`} /></svg>
      <div className="plugin-knobs">
        <Knob label="HP" value={settings.highpass ?? 20} min={20} max={1800} step={1} onChange={(highpass) => update({ highpass })} display={frequency} />
        <Knob label="Low" value={settings.lowGain ?? 0} min={-18} max={18} step={.1} onChange={(lowGain) => update({ lowGain })} display={decibels} />
        <Knob label="Mid" value={settings.midGain ?? 0} min={-18} max={18} step={.1} onChange={(midGain) => update({ midGain })} display={decibels} />
        <Knob label="Mid F" value={settings.midFrequency ?? 1200} min={120} max={9000} step={10} onChange={(midFrequency) => update({ midFrequency })} display={frequency} />
        <Knob label="High" value={settings.highGain ?? 0} min={-18} max={18} step={.1} onChange={(highGain) => update({ highGain })} display={decibels} />
        <Knob label="LP" value={settings.lowpass ?? 20000} min={2000} max={20000} step={10} onChange={(lowpass) => update({ lowpass })} display={frequency} />
      </div>
    </PluginFrame>
  );
}

function DelayPlugin({ settings, update }) {
  const enabled = settings.delayEnabled !== false;
  return (
    <PluginFrame code="DL-08" title="Tempo Delay" subtitle="Synced echoes with feedback and tone control" enabled={enabled} onEnabled={(delayEnabled) => update({ delayEnabled })} accent="violet">
      <div className="delay-taps">{[0,1,2,3,4].map((tap) => <i key={tap} style={{ opacity: Math.max(.08, 1 - tap * (1 - (settings.delayFeedback ?? .18))) }} />)}</div>
      <Toggle label="Tempo sync" checked={settings.delaySync !== false} onChange={(delaySync) => update({ delaySync })} />
      {settings.delaySync !== false
        ? <SelectControl label="Division" value={settings.delayDivision || "1/4"} options={DELAY_DIVISIONS} onChange={(delayDivision) => update({ delayDivision })} />
        : <Knob label="Time" value={settings.delayTime ?? .25} min={.01} max={3.8} step={.01} onChange={(delayTime) => update({ delayTime })} display={seconds} />}
      <div className="plugin-knobs">
        <Knob label="Feedback" value={settings.delayFeedback ?? .18} min={0} max={.84} step={.01} onChange={(delayFeedback) => update({ delayFeedback })} display={percent} />
        <Knob label="Low cut" value={settings.delayFeedbackHighpass ?? 120} min={30} max={1200} step={5} onChange={(delayFeedbackHighpass) => update({ delayFeedbackHighpass })} display={frequency} />
        <Knob label="Tone" value={settings.delayTone ?? 7600} min={800} max={16000} step={10} onChange={(delayTone) => update({ delayTone })} display={frequency} />
        <Knob label="Mix" value={settings.delayMix ?? 0} min={0} max={.9} step={.01} onChange={(delayMix) => update({ delayMix })} display={percent} />
      </div>
    </PluginFrame>
  );
}

function ReverbPlugin({ settings, update }) {
  const enabled = settings.reverbEnabled !== false;
  const room = settings.reverbRoom || "studio";
  return (
    <PluginFrame code="RV-24" title="Room Designer" subtitle="Convolution rooms from booth to cathedral" enabled={enabled} onEnabled={(reverbEnabled) => update({ reverbEnabled })} accent="teal">
      <div className={`room-visual room-${room}`}><i/><i/><i/><span>{ROOM_OPTIONS.find((entry) => entry.value === room)?.label}</span></div>
      <SelectControl label="Room" value={room} options={ROOM_OPTIONS} onChange={(reverbRoom) => update({ reverbRoom })} />
      <div className="plugin-knobs">
        <Knob label="Pre-delay" value={settings.reverbPreDelay ?? .008} min={0} max={.15} step={.001} onChange={(reverbPreDelay) => update({ reverbPreDelay })} display={milliseconds} />
        <Knob label="Damping" value={settings.reverbDamping ?? 9000} min={1200} max={18000} step={10} onChange={(reverbDamping) => update({ reverbDamping })} display={frequency} />
        <Knob label="Mix" value={settings.reverbMix ?? .06} min={0} max={.95} step={.01} onChange={(reverbMix) => update({ reverbMix })} display={percent} />
      </div>
    </PluginFrame>
  );
}

function MasterPlugin({ settings, update, isMaster }) {
  const enabled = settings.compEnabled !== false;
  return (
    <PluginFrame code={isMaster ? "MX-01" : "CL-01"} title={isMaster ? "Plugin Master" : "Channel Polish"} subtitle="Glue, saturation, clarity, and output trim" enabled={enabled} onEnabled={(compEnabled) => update({ compEnabled })} accent="gold">
      <div className="master-plugin-meter"><i/><i/><i/><i/><i/><b>{isMaster ? "MASTER BUS" : "CHANNEL"}</b></div>
      <div className="plugin-knobs">
        <Knob label="Threshold" value={settings.compThreshold ?? -18} min={-60} max={0} step={.5} onChange={(compThreshold) => update({ compThreshold })} display={decibels} />
        <Knob label="Ratio" value={settings.compRatio ?? 3} min={1} max={20} step={.1} onChange={(compRatio) => update({ compRatio })} display={ratio} />
        <Knob label="Attack" value={settings.compAttack ?? .01} min={.001} max={.2} step={.001} onChange={(compAttack) => update({ compAttack })} display={milliseconds} />
        <Knob label="Release" value={settings.compRelease ?? .2} min={.03} max={2} step={.01} onChange={(compRelease) => update({ compRelease })} display={milliseconds} />
        <Knob label="Drive" value={isMaster ? (settings.clipDrive ?? .065) : (settings.drive ?? 0)} min={0} max={.6} step={.005} onChange={(value) => update(isMaster ? { clipDrive: value } : { drive: value })} display={percent} />
        <Knob label="Makeup" value={settings.makeupGain ?? 1} min={.25} max={2} step={.01} onChange={(makeupGain) => update({ makeupGain })} display={percent} />
      </div>
    </PluginFrame>
  );
}


function EngineGuardPlugin({ settings, update }) {
  const quality = settings.engineQuality || "balanced";
  return (
    <PluginFrame code="SG-TP" title="Engine Guard" subtitle="Adaptive polyphony and linked true-peak render protection" enabled onEnabled={() => {}} accent="cyan">
      <div className="engine-guard-display">
        <b>SAFE AUDIO PATH</b>
        <span>phase-aligned crossover</span>
        <span>fair multitrack admission</span>
        <span>node-cost voice budget</span>
        <span>4× ceiling stage</span>
        <span>linked-stereo render limiter</span>
      </div>
      <SelectControl
        label="Realtime quality"
        value={quality}
        options={[
          { value: "economy", label: "Economy · lowest CPU" },
          { value: "balanced", label: "Balanced · lighter projects" },
          { value: "production", label: "Production · multitrack default" },
          { value: "studio", label: "Studio · highest detail" },
        ]}
        onChange={(engineQuality) => update({ engineQuality })}
      />
      <SelectControl
        label="Render rate"
        value={String(settings.renderSampleRate || 48000)}
        options={[
          { value: "44100", label: "44.1 kHz" },
          { value: "48000", label: "48 kHz" },
          { value: "96000", label: "96 kHz" },
        ]}
        onChange={(value) => update({ renderSampleRate: Number(value) })}
      />
      <div className="plugin-knobs">
        <Knob label="Project voices" value={settings.maxPolyphony ?? 84} min={24} max={128} step={1} onChange={(maxPolyphony) => update({ maxPolyphony })} display={(value) => `${value} voices`} />
        <Knob label="Track voices" value={settings.trackPolyphony ?? 22} min={6} max={36} step={1} onChange={(trackPolyphony) => update({ trackPolyphony })} display={(value) => `${value} voices`} />
        <Knob label="Scheduler" value={settings.schedulerLookAheadMs ?? 155} min={90} max={240} step={5} onChange={(schedulerLookAheadMs) => update({ schedulerLookAheadMs })} display={(value) => `${value} ms`} />
        <Knob label="Ceiling" value={settings.renderCeiling ?? -1} min={-6} max={-.1} step={.1} onChange={(renderCeiling) => update({ renderCeiling })} display={decibels} />
        <Knob label="Render lookahead" value={settings.renderLookAheadMs ?? 6} min={1} max={20} step={1} onChange={(renderLookAheadMs) => update({ renderLookAheadMs })} display={(value) => `${value} ms`} />
        <Knob label="Release" value={settings.renderLimiterReleaseMs ?? 140} min={40} max={600} step={5} onChange={(renderLimiterReleaseMs) => update({ renderLimiterReleaseMs })} display={(value) => `${value} ms`} />
      </div>
      <small className="engine-guard-note">The scheduler reserves useful voices across active tracks before allocating dense chords, then applies node-cost budgeting, adaptive headroom, and click-free ceilings before audio reaches the master bus.</small>
    </PluginFrame>
  );
}

const percent = (value) => `${Math.round(Number(value || 0) * 100)}%`;
const signed = (value) => `${Number(value) > 0 ? "+" : ""}${Number(value || 0).toFixed(Number(value) % 1 ? 1 : 0)}`;
const decibels = (value) => `${signed(value)} dB`;
const ratio = (value) => `${Number(value || 1).toFixed(1)}:1`;
const milliseconds = (value) => `${Math.round(Number(value || 0) * 1000)} ms`;
const seconds = (value) => `${Number(value || 0).toFixed(2)} s`;
const frequency = (value) => Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(1)} kHz` : `${Math.round(Number(value))} Hz`;
const panDisplay = (value) => Number(value) === 0 ? "C" : Number(value) < 0 ? `L${Math.round(-Number(value) * 100)}` : `R${Math.round(Number(value) * 100)}`;
