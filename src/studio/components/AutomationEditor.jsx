import React, { useMemo, useState } from "react";
import { AUTOMATION_PARAMETERS } from "../audio/automation";
import { Panel, Toggle } from "./Controls";

export function AutomationEditor({ project, playhead, dispatch }) {
  const [trackId, setTrackId] = useState(project.selectedTrackId || project.tracks[0]?.id);
  const [parameter, setParameter] = useState("volume");
  const selectedTrack = project.tracks.find((track) => track.id === trackId) || project.tracks[0];
  const lanes = useMemo(
    () => (project.automation || []).filter((lane) => lane.trackId === selectedTrack?.id),
    [project.automation, selectedTrack?.id],
  );
  const addLane = () => {
    if (!selectedTrack) return;
    dispatch({ type: "ADD_AUTOMATION_LANE", trackId: selectedTrack.id, parameter });
  };

  return (
    <Panel
      title="Automation Editor"
      subtitle="Draw smooth 64-step automation for mixer controls, channel effects, and Synth Lab performance macros"
      className="automation-panel"
      actions={(
        <div className="automation-toolbar">
          <select value={trackId} onChange={(event) => setTrackId(event.target.value)}>
            {project.tracks.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}
          </select>
          <select value={parameter} onChange={(event) => setParameter(event.target.value)}>
            {AUTOMATION_PARAMETERS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
          </select>
          <button type="button" onClick={addLane}>+ Add lane</button>
        </div>
      )}
    >
      <div className="automation-editor">
        {lanes.length === 0 && (
          <div className="empty-state">Choose a destination and add an automation lane. Click or drag inside a lane to draw values.</div>
        )}
        {lanes.map((lane) => (
          <AutomationLane key={lane.id} lane={lane} playhead={playhead} dispatch={dispatch} />
        ))}
      </div>
    </Panel>
  );
}

function AutomationLane({ lane, playhead, dispatch }) {
  const definition = AUTOMATION_PARAMETERS.find((entry) => entry.value === lane.parameter) || AUTOMATION_PARAMETERS[0];
  const points = new Map((lane.points || []).map((point) => [point.step, point.value]));
  const setFromPointer = (event, step) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const normalized = Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height));
    const value = definition.logarithmic
      ? definition.min * ((definition.max / definition.min) ** normalized)
      : definition.min + normalized * (definition.max - definition.min);
    dispatch({ type: "SET_AUTOMATION_POINT", laneId: lane.id, step, value });
  };

  return (
    <section className="automation-lane">
      <header>
        <div>
          <strong>{definition.label}</strong>
          <span>{definition.min} → {definition.max}</span>
        </div>
        <Toggle
          label="Smooth"
          checked={lane.smooth}
          onChange={(smooth) => dispatch({ type: "UPDATE_AUTOMATION_LANE", laneId: lane.id, patch: { smooth } })}
        />
        <button type="button" onClick={() => dispatch({ type: "CLEAR_AUTOMATION_LANE", laneId: lane.id })}>Clear</button>
        <button type="button" className="danger" onClick={() => dispatch({ type: "DELETE_AUTOMATION_LANE", laneId: lane.id })}>Delete</button>
      </header>
      <div className="automation-grid">
        {Array.from({ length: 64 }, (_, step) => {
          const value = points.get(step);
          const normalized = value == null
            ? 0
            : definition.logarithmic
              ? Math.log(value / definition.min) / Math.log(definition.max / definition.min)
              : (value - definition.min) / (definition.max - definition.min);
          return (
            <button
              type="button"
              key={step}
              className={`${step % 16 === 0 ? "bar" : step % 4 === 0 ? "beat" : ""} ${playhead % 64 === step ? "playhead" : ""}`}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setFromPointer(event, step);
              }}
              onPointerMove={(event) => {
                if (event.buttons) setFromPointer(event, step);
              }}
              onDoubleClick={() => dispatch({ type: "DELETE_AUTOMATION_POINT", laneId: lane.id, step })}
              title={value == null ? `Step ${step + 1}` : `Step ${step + 1}: ${value.toFixed(3)}`}
            >
              {value != null && <span style={{ height: `${Math.max(2, normalized * 100)}%` }} />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
