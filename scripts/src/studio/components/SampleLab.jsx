import React, { useEffect, useMemo, useRef, useState } from "react";
import { buildSlicePattern, computeWaveformPeaks, createEvenSlices, slicesFromCutPoints } from "../audio/sampleTools";
import { Knob, Panel, SelectControl, Toggle } from "./Controls";

const seconds = (value) => `${Number(value || 0).toFixed(3)} s`;
const percent = (value) => `${Math.round(Number(value || 0) * 100)}%`;
const semitones = (value) => `${value >= 0 ? "+" : ""}${Math.round(value)} st`;

export function SampleLab({
  project,
  track,
  sample,
  dispatch,
  onGetSampleBuffer,
  onRasterize,
  onImportAudio,
  onPreviewSlice,
}) {
  const [buffer, setBuffer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sliceCount, setSliceCount] = useState(8);
  const [selectedSlice, setSelectedSlice] = useState(0);
  const fileRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setBuffer(null);
    if (!sample) return undefined;
    setLoading(true);
    onGetSampleBuffer(sample)
      .then((nextBuffer) => { if (!cancelled) setBuffer(nextBuffer); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sample?.id]);

  const peaks = useMemo(() => computeWaveformPeaks(buffer, 640), [buffer]);

  if (!track || track.type !== "sampler") {
    return (
      <Panel title="Sample Lab" subtitle="Select a sampler track or upload audio to create one.">
        <div className="sample-empty-state">
          <strong>No sampler track selected</strong>
          <p>Upload a loop, drum, vocal, instrument, or effect and MusicStudioLab will create a local sampler track.</p>
          <button type="button" className="accent" onClick={() => fileRef.current?.click()}>Upload audio files</button>
          <input ref={fileRef} hidden multiple type="file" accept="audio/*,.wav,.mp3,.ogg,.m4a,.aac,.flac,.webm" onChange={(event) => onImportAudio(event.target.files, { addTracks: true })} />
        </div>
      </Panel>
    );
  }

  const duration = Math.max(0.01, buffer?.duration || sample?.duration || track.endOffset || 5);
  const trimStart = Math.max(0, Math.min(duration - 0.005, track.startOffset || 0));
  const trimEnd = Math.max(trimStart + 0.005, Math.min(duration, track.endOffset || duration));
  const loopStart = Math.max(trimStart, Math.min(trimEnd - 0.005, track.sampleLoopStart ?? trimStart));
  const loopEnd = Math.max(loopStart + 0.005, Math.min(trimEnd, track.sampleLoopEnd ?? trimEnd));
  const slices = track.sampleSlices || [];
  const patch = (changes) => dispatch({ type: "UPDATE_TRACK", id: track.id, patch: changes });

  const setTrimStart = (value) => {
    const next = Math.max(0, Math.min(trimEnd - 0.005, value));
    patch({
      startOffset: next,
      sampleLoopStart: Math.max(next, loopStart),
    });
  };
  const setTrimEnd = (value) => {
    const next = Math.max(trimStart + 0.005, Math.min(duration, value));
    patch({
      endOffset: next,
      sampleLoopEnd: Math.min(next, loopEnd),
    });
  };
  const sliceEvenly = (count = sliceCount) => {
    const nextSlices = createEvenSlices(duration, count, trimStart, trimEnd);
    patch({ sampleSlices: nextSlices });
    setSelectedSlice(0);
  };
  const addCut = (time) => {
    const existingCuts = slices.slice(1).map((slice) => slice.start);
    const next = slicesFromCutPoints(duration, [...existingCuts, time], trimStart, trimEnd);
    patch({ sampleSlices: next });
  };
  const removeCut = (index) => {
    if (index <= 0) return;
    const cuts = slices.slice(1).map((slice) => slice.start).filter((_, cutIndex) => cutIndex !== index - 1);
    patch({ sampleSlices: slicesFromCutPoints(duration, cuts, trimStart, trimEnd) });
    setSelectedSlice((current) => Math.min(current, Math.max(0, slices.length - 2)));
  };
  const moveCut = (index, nextTime) => {
    if (index <= 0 || index >= slices.length) return;
    const previous = slices[index - 1];
    const current = slices[index];
    const minimum = previous.start + 0.005;
    const maximum = current.end - 0.005;
    const time = Math.max(minimum, Math.min(maximum, nextTime));
    patch({
      sampleSlices: slices.map((slice, sliceIndex) => {
        if (sliceIndex === index - 1) return { ...slice, end: time };
        if (sliceIndex === index) return { ...slice, start: time };
        return slice;
      }),
    });
  };
  const generatePattern = () => {
    const activeSlices = slices.length ? slices : createEvenSlices(duration, sliceCount, trimStart, trimEnd);
    if (!slices.length) patch({ sampleSlices: activeSlices });
    const notes = buildSlicePattern(activeSlices, {
      patternSteps: Math.max(16, (project.patternBars || 4) * 16),
      spacing: track.samplePatternSpacing || 4,
      noteLength: track.samplePatternLength || track.samplePatternSpacing || 4,
      mode: track.samplePatternMode || "forward",
    });
    dispatch({ type: "SET_TRACK_NOTES", trackId: track.id, notes });
    dispatch({ type: "SET_VIEW", view: "piano" });
  };
  const rasterize = () => onRasterize(track, sample, {
    start: track.sampleLoopEnabled ? loopStart : trimStart,
    end: track.sampleLoopEnabled ? loopEnd : trimEnd,
  });

  return (
    <Panel
      title={`Sample Lab · ${track.name}`}
      subtitle="Non-destructive waveform editing, loop rasterization, draggable cuts, slice mapping, and automatic sample-pattern generation"
      className="sample-lab-panel"
      actions={(
        <>
          <span className="sample-source-badge">{sample?.user ? "LOCAL" : "FACTORY"}</span>
          <button type="button" onClick={() => fileRef.current?.click()}>Add local files</button>
          <input ref={fileRef} hidden multiple type="file" accept="audio/*,.wav,.mp3,.ogg,.m4a,.aac,.flac,.webm" onChange={(event) => { onImportAudio(event.target.files, { addTracks: true }); event.target.value = ""; }} />
          <button type="button" className="accent" onClick={rasterize} disabled={!buffer}>Rasterize selection</button>
        </>
      )}
    >
      <div className="sample-lab">
        <section className="sample-wave-section">
          <div className="sample-file-meta">
            <div><span>Source</span><strong>{sample?.name || "Missing sample"}</strong></div>
            <div><span>Duration</span><strong>{duration.toFixed(3)} s</strong></div>
            <div><span>Format</span><strong>{sample?.mimeType || "WAV"}</strong></div>
            <div><span>Storage</span><strong>{sample?.user ? "Browser library" : "Factory pack"}</strong></div>
          </div>
          <WaveformEditor
            peaks={peaks}
            duration={duration}
            trimStart={trimStart}
            trimEnd={trimEnd}
            loopStart={loopStart}
            loopEnd={loopEnd}
            loopEnabled={track.sampleLoopEnabled}
            slices={slices}
            selectedSlice={selectedSlice}
            loading={loading}
            onAddCut={addCut}
            onSelectSlice={setSelectedSlice}
            onRemoveCut={removeCut}
            onMoveCut={moveCut}
          />
          <div className="sample-range-grid">
            <label>Trim start<input type="range" min="0" max={duration} step="0.001" value={trimStart} onChange={(event) => setTrimStart(Number(event.target.value))} /><output>{seconds(trimStart)}</output></label>
            <label>Trim end<input type="range" min="0" max={duration} step="0.001" value={trimEnd} onChange={(event) => setTrimEnd(Number(event.target.value))} /><output>{seconds(trimEnd)}</output></label>
            <label>Loop start<input type="range" min={trimStart} max={trimEnd} step="0.001" value={loopStart} onChange={(event) => patch({ sampleLoopStart: Math.min(loopEnd - 0.005, Number(event.target.value)) })} /><output>{seconds(loopStart)}</output></label>
            <label>Loop end<input type="range" min={trimStart} max={trimEnd} step="0.001" value={loopEnd} onChange={(event) => patch({ sampleLoopEnd: Math.max(loopStart + 0.005, Number(event.target.value)) })} /><output>{seconds(loopEnd)}</output></label>
          </div>
        </section>

        <aside className="sample-tools-column">
          <section className="sample-tool-card">
            <h3>Playback & loop</h3>
            <Toggle label="Loop selected region" checked={track.sampleLoopEnabled} onChange={(sampleLoopEnabled) => patch({ sampleLoopEnabled })} hint="Sustained piano-roll notes repeat the loop region until the note ends." />
            <Toggle label="Reverse playback" checked={track.reverse} onChange={(reverse) => patch({ reverse })} />
            <div className="knob-row">
              <Knob label="Pitch" value={track.pitch || 0} min={-36} max={36} step={1} onChange={(pitch) => patch({ pitch })} display={semitones} />
              <Knob label="Attack" value={track.sampleAttack || 0.001} min={0.001} max={2} step={0.001} onChange={(sampleAttack) => patch({ sampleAttack })} />
              <Knob label="Release" value={track.sampleRelease || 0.04} min={0.005} max={4} step={0.005} onChange={(sampleRelease) => patch({ sampleRelease })} />
            </div>
          </section>

          <section className="sample-tool-card">
            <h3>Slice & cut</h3>
            <div className="slice-count-row">
              <SelectControl label="Grid" value={sliceCount} options={[2, 4, 8, 12, 16, 24, 32]} onChange={(value) => setSliceCount(Number(value))} />
              <button type="button" onClick={() => sliceEvenly(sliceCount)}>Slice evenly</button>
              <button type="button" onClick={() => patch({ sampleSlices: [] })}>Clear cuts</button>
            </div>
            <p>Left-click the waveform to add a cut. Drag cut handles to retime them. Right-click a handle to remove it.</p>
            <div className="slice-pad-grid">
              {slices.map((slice, index) => (
                <button
                  type="button"
                  key={slice.id}
                  className={selectedSlice === index ? "active" : ""}
                  onClick={() => { setSelectedSlice(index); onPreviewSlice?.(index); }}
                >
                  <b>{index + 1}</b><span>{(slice.end - slice.start).toFixed(2)}s</span>
                </button>
              ))}
              {!slices.length && <div className="slice-empty">Create cuts to map slices across C4 and upward.</div>}
            </div>
          </section>

          <section className="sample-tool-card">
            <h3>Pattern from slices</h3>
            <SelectControl label="Order" value={track.samplePatternMode || "forward"} options={[
              { value: "forward", label: "Forward" },
              { value: "reverse", label: "Reverse" },
              { value: "bounce", label: "Bounce" },
              { value: "random", label: "Random" },
            ]} onChange={(samplePatternMode) => patch({ samplePatternMode })} />
            <SelectControl label="Spacing" value={track.samplePatternSpacing || 4} options={[
              { value: 1, label: "Every 1/16" },
              { value: 2, label: "Every 1/8" },
              { value: 4, label: "Every beat" },
              { value: 8, label: "Every 2 beats" },
              { value: 16, label: "Every bar" },
            ]} onChange={(samplePatternSpacing) => patch({ samplePatternSpacing: Number(samplePatternSpacing) })} />
            <SelectControl label="Length" value={track.samplePatternLength || track.samplePatternSpacing || 4} options={[1, 2, 4, 8, 16]} onChange={(samplePatternLength) => patch({ samplePatternLength: Number(samplePatternLength) })} />
            <button type="button" className="accent sample-pattern-button" onClick={generatePattern}>Create piano-roll slice pattern</button>
            <small>{slices.length || sliceCount} slices will map from C4 upward through the full {project.patternBars || 4}-bar piano roll.</small>
          </section>
        </aside>
      </div>
    </Panel>
  );
}

function WaveformEditor({ peaks, duration, trimStart, trimEnd, loopStart, loopEnd, loopEnabled, slices, selectedSlice, loading, onAddCut, onSelectSlice, onRemoveCut, onMoveCut }) {
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const xPercent = (secondsValue) => `${(secondsValue / duration) * 100}%`;
  const handlePointer = (event) => {
    if (!svgRef.current) return;
    const bounds = svgRef.current.getBoundingClientRect();
    const time = Math.max(trimStart, Math.min(trimEnd, ((event.clientX - bounds.left) / bounds.width) * duration));
    onAddCut(time);
  };
  const dragCut = (event) => {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId || !svgRef.current) return;
    const bounds = svgRef.current.getBoundingClientRect();
    const time = ((event.clientX - bounds.left) / bounds.width) * duration;
    onMoveCut(active.index, time);
  };
  const endDrag = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragRef.current = null;
  };

  const path = peaks.length
    ? peaks.map((peak, index) => `${index === 0 ? "M" : "L"}${(index / Math.max(1, peaks.length - 1)) * 100},${50 - peak * 42}`).join(" ")
      + " " + [...peaks].reverse().map((peak, reverseIndex) => {
        const index = peaks.length - 1 - reverseIndex;
        return `L${(index / Math.max(1, peaks.length - 1)) * 100},${50 + peak * 42}`;
      }).join(" ") + " Z"
    : "";

  return (
    <div className="sample-waveform-editor">
      <svg ref={svgRef} viewBox="0 0 100 100" preserveAspectRatio="none" onDoubleClick={handlePointer}>
        <defs><linearGradient id="sampleWaveFill" x1="0" x2="1"><stop offset="0" stopColor="#65e3c0" /><stop offset="1" stopColor="#7f8dff" /></linearGradient></defs>
        <g className="wave-grid">{Array.from({ length: 17 }, (_, index) => <line key={index} x1={index * 6.25} x2={index * 6.25} y1="0" y2="100" />)}</g>
        {path && <path d={path} fill="url(#sampleWaveFill)" opacity=".78" />}
        {!path && <text x="50" y="52" textAnchor="middle">{loading ? "DECODING WAVEFORM…" : "NO WAVEFORM"}</text>}
      </svg>
      <div className="trim-mask left" style={{ width: xPercent(trimStart) }} />
      <div className="trim-mask right" style={{ left: xPercent(trimEnd) }} />
      {loopEnabled && <div className="loop-region" style={{ left: xPercent(loopStart), width: `${((loopEnd - loopStart) / duration) * 100}%` }}><span>LOOP</span></div>}
      <button type="button" className="wave-add-cut-layer" onClick={handlePointer} aria-label="Add slice cut" />
      {slices.slice(1).map((slice, relativeIndex) => {
        const index = relativeIndex + 1;
        return (
          <button
            type="button"
            key={slice.id}
            className={`slice-cut-handle ${selectedSlice === index ? "active" : ""}`}
            style={{ left: xPercent(slice.start) }}
            title={`Slice ${index + 1} begins at ${slice.start.toFixed(3)} seconds`}
            onClick={(event) => { event.stopPropagation(); onSelectSlice(index); }}
            onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); onRemoveCut(index); }}
            onPointerDown={(event) => {
              event.preventDefault(); event.stopPropagation();
              event.currentTarget.setPointerCapture?.(event.pointerId);
              dragRef.current = { pointerId: event.pointerId, index };
            }}
            onPointerMove={dragCut}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          ><span>{index + 1}</span></button>
        );
      })}
      <div className="wave-time-ruler"><span>0.000</span><span>{(duration / 2).toFixed(3)}</span><span>{duration.toFixed(3)} s</span></div>
    </div>
  );
}
