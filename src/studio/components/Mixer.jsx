import React, { useMemo, useState } from "react";
import { Fader, Knob, Meter, Panel } from "./Controls";

export function Mixer({ project, dispatch }) {
  const [selected, setSelected] = useState(project.selectedTrackId);
  const track = project.tracks.find((entry) => entry.id === selected) || project.tracks[0];
  const meterValues = useMemo(
    () => Object.fromEntries(project.tracks.map((entry, index) => [entry.id, 0.25 + ((index * 37) % 60) / 100])),
    [project.tracks],
  );
  const nested = (id, key, patch) => dispatch({ type: "UPDATE_TRACK_NESTED", id, key, patch });

  return (
    <Panel
      title="Enterprise Mixer"
      subtitle="Gain staging, six-band tone shaping, dynamics, saturation, chorus, delay, convolution reverb, and routing-ready channel strips"
      className="mixer-panel"
    >
      <div className="mixer-layout">
        <div className="mixer-strips">
          {project.tracks.map((entry, index) => (
            <button
              type="button"
              key={entry.id}
              className={`mixer-strip ${selected === entry.id ? "selected" : ""}`}
              onClick={() => setSelected(entry.id)}
            >
              <span className="strip-number">{String(index + 1).padStart(2, "0")}</span>
              <Meter value={meterValues[entry.id]} />
              <Fader
                label={entry.name}
                value={entry.mixer.volume}
                onChange={(volume) => nested(entry.id, "mixer", { volume })}
                display={(value) => `${Math.round(value * 100)}%`}
              />
              <Knob
                size="sm"
                label="Pan"
                value={entry.mixer.pan}
                min={-1}
                max={1}
                onChange={(pan) => nested(entry.id, "mixer", { pan })}
                display={panDisplay}
              />
              <div className="strip-buttons">
                <button
                  type="button"
                  className={entry.mute ? "active" : ""}
                  onClick={(event) => {
                    event.stopPropagation();
                    dispatch({ type: "UPDATE_TRACK", id: entry.id, patch: { mute: !entry.mute } });
                  }}
                >M</button>
                <button
                  type="button"
                  className={entry.solo ? "active" : ""}
                  onClick={(event) => {
                    event.stopPropagation();
                    dispatch({ type: "UPDATE_TRACK", id: entry.id, patch: { solo: !entry.solo } });
                  }}
                >S</button>
              </div>
            </button>
          ))}
        </div>
        {track && (
          <div className="insert-rack">
            <h3>{track.name} · Insert Chain</h3>
            <EffectCard title="Input Filters + Parametric EQ">
              <Knob label="HP" value={track.effects.highpass} min={20} max={1500} step={1} onChange={(highpass) => nested(track.id, "effects", { highpass })} display={frequency} />
              <Knob label="LP" value={track.effects.lowpass || 20000} min={1000} max={20000} step={10} onChange={(lowpass) => nested(track.id, "effects", { lowpass })} display={frequency} />
              <Knob label="Low Freq" value={track.effects.lowFrequency || 120} min={40} max={500} step={1} onChange={(lowFrequency) => nested(track.id, "effects", { lowFrequency })} display={frequency} />
              <Knob label="Low" value={track.effects.lowGain} min={-18} max={18} step={0.1} onChange={(lowGain) => nested(track.id, "effects", { lowGain })} display={decibels} />
              <Knob label="Mid Freq" value={track.effects.midFrequency} min={120} max={9000} step={10} onChange={(midFrequency) => nested(track.id, "effects", { midFrequency })} display={frequency} />
              <Knob label="Mid Q" value={track.effects.midQ || 0.8} min={0.1} max={12} step={0.1} onChange={(midQ) => nested(track.id, "effects", { midQ })} />
              <Knob label="Mid" value={track.effects.midGain} min={-18} max={18} step={0.1} onChange={(midGain) => nested(track.id, "effects", { midGain })} display={decibels} />
              <Knob label="High Freq" value={track.effects.highFrequency || 7000} min={1000} max={18000} step={10} onChange={(highFrequency) => nested(track.id, "effects", { highFrequency })} display={frequency} />
              <Knob label="High" value={track.effects.highGain} min={-18} max={18} step={0.1} onChange={(highGain) => nested(track.id, "effects", { highGain })} display={decibels} />
            </EffectCard>
            <EffectCard title="Compressor + Saturation">
              <Knob label="Threshold" value={track.effects.compThreshold} min={-60} max={0} step={0.5} onChange={(compThreshold) => nested(track.id, "effects", { compThreshold })} display={decibels} />
              <Knob label="Knee" value={track.effects.compKnee || 8} min={0} max={40} step={0.5} onChange={(compKnee) => nested(track.id, "effects", { compKnee })} display={decibels} />
              <Knob label="Ratio" value={track.effects.compRatio} min={1} max={20} step={0.1} onChange={(compRatio) => nested(track.id, "effects", { compRatio })} display={(value) => `${value.toFixed(1)}:1`} />
              <Knob label="Attack" value={track.effects.compAttack} min={0.001} max={0.2} step={0.001} onChange={(compAttack) => nested(track.id, "effects", { compAttack })} display={milliseconds} />
              <Knob label="Release" value={track.effects.compRelease} min={0.03} max={2} step={0.01} onChange={(compRelease) => nested(track.id, "effects", { compRelease })} display={milliseconds} />
              <Knob label="Makeup" value={track.effects.makeupGain || 1} min={0.25} max={2} step={0.01} onChange={(makeupGain) => nested(track.id, "effects", { makeupGain })} display={(value) => `${Math.round(value * 100)}%`} />
              <Knob label="Drive" value={track.effects.drive} min={0} max={1} step={0.01} onChange={(drive) => nested(track.id, "effects", { drive })} display={percent} />
            </EffectCard>
            <EffectCard title="Chorus + Stereo">
              <Knob label="Chorus" value={track.effects.chorusMix || 0} min={0} max={1} step={0.01} onChange={(chorusMix) => nested(track.id, "effects", { chorusMix })} display={percent} />
              <Knob label="Rate" value={track.effects.chorusRate || 0.25} min={0.02} max={8} step={0.01} onChange={(chorusRate) => nested(track.id, "effects", { chorusRate })} display={(value) => `${value.toFixed(2)} Hz`} />
              <Knob label="Depth" value={track.effects.chorusDepth || 0.006} min={0.0005} max={0.02} step={0.0001} onChange={(chorusDepth) => nested(track.id, "effects", { chorusDepth })} display={milliseconds} />
              <Knob label="Width" value={track.effects.stereoWidth || 0.5} min={0} max={1} step={0.01} onChange={(stereoWidth) => nested(track.id, "effects", { stereoWidth })} display={percent} />
            </EffectCard>
            <EffectCard title="Delay + Reverb Sends">
              <Knob label="Delay" value={track.effects.delayMix} min={0} max={0.9} step={0.01} onChange={(delayMix) => nested(track.id, "effects", { delayMix })} display={percent} />
              <Knob label="Time" value={track.effects.delayTime} min={0.03} max={2} step={0.01} onChange={(delayTime) => nested(track.id, "effects", { delayTime })} display={(value) => `${value.toFixed(2)} s`} />
              <Knob label="Feedback" value={track.effects.delayFeedback} min={0} max={0.92} step={0.01} onChange={(delayFeedback) => nested(track.id, "effects", { delayFeedback })} display={percent} />
              <Knob label="Reverb" value={track.effects.reverbMix} min={0} max={0.95} step={0.01} onChange={(reverbMix) => nested(track.id, "effects", { reverbMix })} display={percent} />
            </EffectCard>
          </div>
        )}
      </div>
    </Panel>
  );
}

function EffectCard({ title, children }) {
  return <div className="effect-card"><h4>{title}</h4><div className="knob-row">{children}</div></div>;
}

const percent = (value) => `${Math.round(value * 100)}%`;
const decibels = (value) => `${value > 0 ? "+" : ""}${Number(value).toFixed(1)} dB`;
const milliseconds = (value) => `${Math.round(value * 1000)} ms`;
const frequency = (value) => value >= 1000 ? `${(value / 1000).toFixed(1)} kHz` : `${Math.round(value)} Hz`;
const panDisplay = (value) => value === 0 ? "C" : value < 0 ? `L${Math.round(-value * 100)}` : `R${Math.round(value * 100)}`;
