import React from "react";
import { Knob, Panel } from "./Controls";

export function Mastering({ project, dispatch, onRender }) {
  const setProject = (field, value) => dispatch({ type: "SET_PROJECT_FIELD", field, value });
  const setMaster = (patch) => setProject("master", { ...(project.master || {}), ...patch });
  const master = {
    inputGain: 1,
    lowGain: 0,
    highGain: 0,
    compThreshold: -10,
    compRatio: 3,
    clipDrive: 0.16,
    limiterCeiling: -1,
    stereoWidth: 0.5,
    ...(project.master || {}),
  };

  return (
    <Panel
      title="Mastering + Delivery"
      subtitle="Final gain staging, broad tone shaping, glue compression, soft clipping, output ceiling, render range, and delivery metadata"
      actions={<button type="button" className="accent" onClick={onRender}>Render master WAV</button>}
    >
      <div className="master-grid">
        <div className="master-chain">
          <MasterModule number="1" name="Input Trim" detail={`${Math.round(master.inputGain * 100)}% gain staging`} />
          <MasterModule number="2" name="Broad EQ" detail={`${signed(master.lowGain)} dB low · ${signed(master.highGain)} dB high`} />
          <MasterModule number="3" name="Glue Compressor" detail={`${master.compRatio.toFixed(1)}:1 · ${master.compThreshold.toFixed(1)} dB threshold`} />
          <MasterModule number="4" name="Soft Clipper" detail={`${Math.round(master.clipDrive * 100)}% harmonic drive`} />
          <MasterModule number="5" name="Output Limiter" detail={`${master.limiterCeiling.toFixed(1)} dB ceiling`} />
        </div>
        <div className="master-controls">
          <Knob label="Master" value={project.masterVolume} min={0} max={1.25} step={0.01} onChange={(masterVolume) => setProject("masterVolume", masterVolume)} display={percent} />
          <Knob label="Input" value={master.inputGain} min={0.25} max={2} step={0.01} onChange={(inputGain) => setMaster({ inputGain })} display={percent} />
          <Knob label="Low EQ" value={master.lowGain} min={-12} max={12} step={0.1} onChange={(lowGain) => setMaster({ lowGain })} display={decibels} />
          <Knob label="High EQ" value={master.highGain} min={-12} max={12} step={0.1} onChange={(highGain) => setMaster({ highGain })} display={decibels} />
          <Knob label="Comp Threshold" value={master.compThreshold} min={-30} max={0} step={0.5} onChange={(compThreshold) => setMaster({ compThreshold })} display={decibels} />
          <Knob label="Comp Ratio" value={master.compRatio} min={1} max={12} step={0.1} onChange={(compRatio) => setMaster({ compRatio })} display={(value) => `${value.toFixed(1)}:1`} />
          <Knob label="Clip Drive" value={master.clipDrive} min={0} max={1} step={0.01} onChange={(clipDrive) => setMaster({ clipDrive })} display={percent} />
          <Knob label="Ceiling" value={master.limiterCeiling} min={-6} max={-0.1} step={0.1} onChange={(limiterCeiling) => setMaster({ limiterCeiling })} display={decibels} />
          <Knob label="Bars" value={project.loopBars} min={4} max={64} step={4} onChange={(loopBars) => setProject("loopBars", loopBars)} />
          <div className="delivery-card">
            <h3>Hip-hop delivery profile</h3>
            <p>Render a stereo PCM WAV from the full Web Audio graph. The offline renderer includes synth voices, samples, channel inserts, automation, master EQ, compression, and clipping.</p>
            <dl>
              <div><dt>Estimated duration</dt><dd>{((project.loopBars * 4 * 60) / project.bpm).toFixed(1)} sec</dd></div>
              <div><dt>Sample rate</dt><dd>44,100 Hz</dd></div>
              <div><dt>Render format</dt><dd>16-bit PCM WAV</dd></div>
              <div><dt>Headroom target</dt><dd>{master.limiterCeiling.toFixed(1)} dB</dd></div>
              <div><dt>Automation lanes</dt><dd>{project.automation?.length || 0}</dd></div>
              <div><dt>Custom patches</dt><dd>{project.customPresets?.length || 0}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function MasterModule({ number, name, detail }) {
  return <div className="master-module enabled"><span>{number}</span><strong>{name}</strong><small>{detail}</small></div>;
}

const signed = (value) => `${value > 0 ? "+" : ""}${Number(value).toFixed(1)}`;
const percent = (value) => `${Math.round(value * 100)}%`;
const decibels = (value) => `${signed(value)} dB`;
