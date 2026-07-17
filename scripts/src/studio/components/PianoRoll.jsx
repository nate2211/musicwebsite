import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NOTE_NAMES,
  SCALE_OPTIONS,
  SCALES,
  getScalePitchClasses,
  midiToName,
} from "../audio/musicTheory";
import { Panel } from "./Controls";
import { resolveTrackPreset } from "../data/presetLibrary";
import { GpuPianoRollSurface } from "./GpuPianoRollSurface";
import { GpuAudioScope } from "./GpuAudioScope";

const LOW_MIDI = 12; // C0
const HIGH_MIDI = 120; // C9
const KEYS_WIDTH = 72;
const LENGTH_OPTIONS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64];
const BAR_OPTIONS = Array.from({ length: 16 }, (_, index) => index + 1);
const SCALE_DEGREE_LABELS = {
  0: "1",
  1: "♭2",
  2: "2",
  3: "♭3",
  4: "3",
  5: "4",
  6: "♭5",
  7: "5",
  8: "♭6",
  9: "6",
  10: "♭7",
  11: "7",
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const unique = (values) => [...new Set(values)];
const DEFAULT_NOTE_ENVELOPE = Object.freeze({ attack: 0.01, decay: 0.12, sustain: 0.75, release: 0.3, gain: 1, pan: 0, stereo: 1 });
const NOTE_ENVELOPE_PRESETS = {
  soft: { attack: 0.08, decay: 0.24, sustain: 0.72, release: 0.75, gain: 0.9, pan: 0, stereo: 1 },
  pluck: { attack: 0.002, decay: 0.18, sustain: 0.28, release: 0.16, gain: 0.92, pan: 0, stereo: 1.05 },
  pad: { attack: 0.45, decay: 0.7, sustain: 0.82, release: 2.4, gain: 0.82, pan: 0, stereo: 1.35 },
  gate: { attack: 0.002, decay: 0.03, sustain: 1, release: 0.025, gain: 0.88, pan: 0, stereo: 0.92 },
};

function normalizeEnvelope(envelope) {
  if (!envelope) return undefined;
  return {
    attack: clamp(Number(envelope.attack ?? DEFAULT_NOTE_ENVELOPE.attack), 0.001, 4),
    decay: clamp(Number(envelope.decay ?? DEFAULT_NOTE_ENVELOPE.decay), 0.001, 6),
    sustain: clamp(Number(envelope.sustain ?? DEFAULT_NOTE_ENVELOPE.sustain), 0.01, 1),
    release: clamp(Number(envelope.release ?? DEFAULT_NOTE_ENVELOPE.release), 0.01, 8),
    gain: clamp(Number(envelope.gain ?? DEFAULT_NOTE_ENVELOPE.gain), 0.05, 1.5),
    pan: clamp(Number(envelope.pan ?? DEFAULT_NOTE_ENVELOPE.pan), -1, 1),
    stereo: clamp(Number(envelope.stereo ?? DEFAULT_NOTE_ENVELOPE.stereo), 0, 2),
  };
}

function noteLengthLabel(steps) {
  const labels = {
    1: "1/16",
    2: "1/8",
    3: "3/16",
    4: "1 beat",
    6: "dotted beat",
    8: "2 beats",
    12: "3 beats",
    16: "1 bar",
    24: "1½ bars",
    32: "2 bars",
    48: "3 bars",
    64: "4 bars",
  };
  return labels[steps] || `${steps} steps`;
}

function normalizeNotes(notes, patternSteps) {
  return (notes || [])
    .filter((note) => Number.isFinite(note.start) && note.start < patternSteps)
    .map((note) => ({
      ...note,
      start: clamp(Math.round(note.start), 0, patternSteps - 1),
      duration: clamp(Math.round(note.duration || 1), 1, patternSteps - Math.round(note.start)),
      midi: clamp(Math.round(note.midi), LOW_MIDI, HIGH_MIDI),
      velocity: clamp(Number(note.velocity || 0.78), 0.1, 1),
      ...(note.envelope ? { envelope: normalizeEnvelope(note.envelope) } : {}),
    }));
}



const PianoRow = React.memo(function PianoRow({
  midi,
  row,
  patternSteps,
  inScale,
  isRoot,
  name,
  scaleDegree,
  showScaleHighlights,
  showScaleGhosts,
  beginRowInteraction,
  continueRowInteraction,
  onPreview,
  rootName,
  scaleLabel,
}) {
  const isSharp = name.includes("#");
  return (
    <React.Fragment>
      <button
        type="button"
        className={`piano-key ${isSharp ? "black" : "white"} ${isRoot ? "root" : ""} ${inScale ? "in-scale" : "out-scale"}`}
        style={{ gridRow: row + 1 }}
        onClick={() => onPreview?.(midi)}
        title={`Preview ${name}${isRoot ? " · selected scale root" : inScale ? " · selected scale tone" : " · outside selected scale"}`}
      >
        {name}
        {isRoot && <small>ROOT</small>}
        {!isRoot && inScale && showScaleHighlights && <small>{scaleDegree}</small>}
      </button>
      <div
        className={`note-row optimized-note-row ${inScale ? "in-scale" : "out-scale"} ${isRoot ? "root-scale-row" : ""}`}
        style={{ gridRow: row + 1 }}
        data-scale-tone={inScale ? name : undefined}
        data-scale-degree={inScale ? scaleDegree : undefined}
        data-scale-midi={inScale ? midi : undefined}
        role="row"
        aria-label={`${name} row in ${rootName} ${scaleLabel}`}
        onPointerDown={(event) => beginRowInteraction(event, midi)}
        onPointerMove={(event) => continueRowInteraction(event, midi)}
      >
        {showScaleHighlights && inScale && <span className={`scale-row-highlight ${isRoot ? "root" : ""}`} aria-hidden="true" />}
        {showScaleGhosts && inScale && (
          <span
            className={`scale-guide-layer scale-guide-note optimized ${isRoot ? "root" : ""}`}
            aria-hidden="true"
            data-scale-guide-note={name}
            data-scale-guide-midi={midi}
            data-scale-guide-step="beat-repeat"
          >
            <b>{name}</b><small>{isRoot ? "ROOT" : scaleDegree}</small>
          </span>
        )}
        <span className="piano-row-hit-surface" aria-hidden="true" data-pattern-steps={patternSteps} />
      </div>
    </React.Fragment>
  );
});

const PianoNoteBlock = React.memo(function PianoNoteBlock({
  note,
  row,
  selected,
  dragging,
  selectedCount,
  trackColor,
  stepWidth,
  rowHeight,
  continueNoteErase,
  beginNoteDrag,
  moveNoteDrag,
  finishNoteDrag,
}) {
  const envelope = note.envelope;
  const attack = envelope?.attack ?? DEFAULT_NOTE_ENVELOPE.attack;
  const decay = envelope?.decay ?? DEFAULT_NOTE_ENVELOPE.decay;
  const sustain = envelope?.sustain ?? DEFAULT_NOTE_ENVELOPE.sustain;
  const release = envelope?.release ?? DEFAULT_NOTE_ENVELOPE.release;
  const total = Math.max(0.001, attack + decay + release);
  const attackPercent = clamp((attack / total) * 46, 4, 42);
  const decayPercent = clamp(attackPercent + (decay / total) * 35, attackPercent + 4, 78);
  const releaseStart = clamp(100 - (release / total) * 38, decayPercent + 4, 94);
  return (
    <div
      className={`piano-note ${selected ? "selected" : ""} ${dragging ? "transforming" : ""} ${envelope ? "has-note-envelope" : ""}`}
      data-note-envelope={envelope ? "custom" : "track"}
      style={{
        transform: `translate3d(${KEYS_WIDTH + note.start * stepWidth}px, ${row * rowHeight}px, 0)`,
        width: `${Math.max(4, note.duration * stepWidth - 2)}px`,
        height: `${Math.max(4, rowHeight - 2)}px`,
        background: trackColor,
        opacity: 0.45 + note.velocity * 0.5,
        "--env-attack": `${attackPercent}%`,
        "--env-decay": `${decayPercent}%`,
        "--env-sustain-y": `${100 - sustain * 85}%`,
        "--env-release-start": `${releaseStart}%`,
      }}
      onPointerEnter={(event) => continueNoteErase(event, note)}
      onContextMenu={(event) => event.preventDefault()}
      title={`Drag center to move · drag edges to stretch · right click to erase · ${midiToName(note.midi)} · ${note.duration} steps${envelope ? " · custom note envelope" : ""}`}
    >
      <span className="note-envelope-curve" aria-hidden="true" />
      <button
        type="button"
        className="note-handle left"
        aria-label={`Stretch start of ${midiToName(note.midi)}`}
        onPointerDown={(event) => beginNoteDrag(event, note, "resize-left")}
        onPointerMove={moveNoteDrag}
        onPointerUp={finishNoteDrag}
        onPointerCancel={finishNoteDrag}
      />
      <button
        type="button"
        className="note-body"
        aria-label={`Move ${midiToName(note.midi)}`}
        onPointerDown={(event) => beginNoteDrag(event, note, "move")}
        onPointerMove={moveNoteDrag}
        onPointerUp={finishNoteDrag}
        onPointerCancel={finishNoteDrag}
      >
        <span>{midiToName(note.midi)}</span>
        {selected && <small>{selectedCount > 1 ? `${selectedCount} notes` : envelope ? "ENV" : "selected"}</small>}
      </button>
      <button
        type="button"
        className="note-handle right"
        aria-label={`Stretch end of ${midiToName(note.midi)}`}
        onPointerDown={(event) => beginNoteDrag(event, note, "resize-right")}
        onPointerMove={moveNoteDrag}
        onPointerUp={finishNoteDrag}
        onPointerCancel={finishNoteDrag}
      />
    </div>
  );
});

export function PianoRoll({ project, track, playhead, dispatch, onPreview, audioEngine }) {
  const [velocity, setVelocity] = useState(0.78);
  const [noteLength, setNoteLength] = useState(4);
  const [foldToScale, setFoldToScale] = useState(false);
  const [scaleHelperMode, setScaleHelperMode] = useState("notes");
  const [stepWidth, setStepWidth] = useState(26);
  const [rowHeight, setRowHeight] = useState(22);
  const [tool, setTool] = useState("draw");
  const [selectedNoteIds, setSelectedNoteIds] = useState([]);
  const [dragPreview, setDragPreview] = useState(null);
  const [selectionRect, setSelectionRect] = useState(null);
  const [translateSteps, setTranslateSteps] = useState(1);
  const [translateSemitones, setTranslateSemitones] = useState(1);
  const [fillMode, setFillMode] = useState("scale-up");
  const [envelopeEditorOpen, setEnvelopeEditorOpen] = useState(true);
  const [rollRenderer, setRollRenderer] = useState("gpu");
  const [gpuBackend, setGpuBackend] = useState("Initializing GPU");

  const scrollRef = useRef(null);
  const gridRef = useRef(null);
  const drawingRef = useRef(false);
  const erasingRef = useRef(false);
  const lastDrawKeyRef = useRef("");
  const lastEraseKeyRef = useRef("");
  const noteDragRef = useRef(null);
  const marqueeRef = useRef(null);
  const dragFrameRef = useRef(0);
  const pendingDragPointRef = useRef(null);

  const patternBars = clamp(Number(project.patternBars || 4), 1, 16);
  const patternSteps = patternBars * 16;
  const notes = useMemo(
    () => normalizeNotes(track?.notes || [], patternSteps),
    [patternSteps, track?.notes],
  );
  const displayNotes = dragPreview?.notes || notes;
  const selectedSet = useMemo(() => new Set(selectedNoteIds), [selectedNoteIds]);
  const notesById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);
  const notesByMidi = useMemo(() => {
    const index = new Map();
    notes.forEach((note) => {
      const rowNotes = index.get(note.midi) || [];
      rowNotes.push(note);
      index.set(note.midi, rowNotes);
    });
    return index;
  }, [notes]);
  const selectedNotes = useMemo(
    () => selectedNoteIds.map((id) => notesById.get(id)).filter(Boolean),
    [notesById, selectedNoteIds],
  );
  const trackEnvelopeDefaults = useMemo(() => {
    if (!track) return DEFAULT_NOTE_ENVELOPE;
    if (track.type === "sampler") {
      return normalizeEnvelope({
        attack: track.sampleAttack ?? 0.004,
        decay: 0.04,
        sustain: 1,
        release: track.sampleRelease ?? 0.08,
        gain: 1,
        pan: 0,
        stereo: 1,
      });
    }
    const preset = resolveTrackPreset(project, track);
    return normalizeEnvelope({ ...preset?.ampEnv, gain: 1, pan: 0, stereo: 1 }) || DEFAULT_NOTE_ENVELOPE;
  }, [project, track]);
  const selectedEnvelope = useMemo(() => (
    selectedNotes[0]?.envelope || trackEnvelopeDefaults
  ), [selectedNotes, trackEnvelopeDefaults]);
  const selectedSample = track?.type === "sampler"
    ? project.samples.find((sample) => sample.id === track.sampleId)
    : null;
  const showScaleHighlights = scaleHelperMode !== "off";
  const showScaleGhosts = scaleHelperMode === "notes";
  const scaleIntervals = SCALES[project.scale] || SCALES.minor;
  const scalePitchClasses = useMemo(
    () => getScalePitchClasses(project.key, project.scale),
    [project.key, project.scale],
  );
  const scaleNoteNames = useMemo(
    () => Array.from({ length: 12 }, (_, offset) => (Number(project.key) + offset) % 12)
      .filter((pitchClass) => scalePitchClasses.has(pitchClass))
      .map((pitchClass) => NOTE_NAMES[pitchClass]),
    [project.key, scalePitchClasses],
  );
  const scaleDegreeByPitchClass = useMemo(
    () => new Map(scaleIntervals.map((interval) => [
      (Number(project.key) + interval + 120) % 12,
      SCALE_DEGREE_LABELS[interval] || String(interval),
    ])),
    [project.key, project.scale, scaleIntervals],
  );
  const allRows = useMemo(
    () => Array.from({ length: HIGH_MIDI - LOW_MIDI + 1 }, (_, index) => HIGH_MIDI - index),
    [],
  );
  const rows = useMemo(
    () => (foldToScale
      ? allRows.filter((midi) => scalePitchClasses.has(midi % 12))
      : allRows),
    [allRows, foldToScale, scalePitchClasses],
  );
  const rowIndexByMidi = useMemo(
    () => new Map(rows.map((midi, index) => [midi, index])),
    [rows],
  );

  const commitNotes = useCallback((nextNotes) => {
    if (!track) return;
    dispatch({
      type: "SET_TRACK_NOTES",
      trackId: track.id,
      notes: normalizeNotes(nextNotes, patternSteps),
    });
  }, [dispatch, patternSteps, track]);

  useEffect(() => {
    const stopPointerModes = () => {
      drawingRef.current = false;
      erasingRef.current = false;
      lastDrawKeyRef.current = "";
      lastEraseKeyRef.current = "";
    };
    window.addEventListener("pointerup", stopPointerModes);
    window.addEventListener("pointercancel", stopPointerModes);
    window.addEventListener("blur", stopPointerModes);
    return () => {
      window.removeEventListener("pointerup", stopPointerModes);
      window.removeEventListener("pointercancel", stopPointerModes);
      window.removeEventListener("blur", stopPointerModes);
    };
  }, []);

  useEffect(() => {
    drawingRef.current = false;
    erasingRef.current = false;
    noteDragRef.current = null;
    marqueeRef.current = null;
    setDragPreview(null);
    if (dragFrameRef.current) window.cancelAnimationFrame(dragFrameRef.current);
    dragFrameRef.current = 0;
    pendingDragPointRef.current = null;
    setSelectionRect(null);
    setSelectedNoteIds([]);
  }, [track?.id]);

  useEffect(() => {
    setSelectedNoteIds((current) => current.filter((id) => notes.some((note) => note.id === id)));
  }, [notes]);

  useEffect(() => {
    if (!track || track.type !== "sampler" || track.sequenceMode === "notes") return;
    dispatch({
      type: "MIGRATE_SAMPLER_PATTERN_TO_NOTES",
      id: track.id,
      rootMidi: 60,
    });
  }, [dispatch, track?.id, track?.sequenceMode, track?.type]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const middleC = rowIndexByMidi.get(60) ?? Math.floor(rows.length / 2);
      node.scrollTop = Math.max(0, middleC * rowHeight - node.clientHeight / 2);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [foldToScale, project.key, project.scale, rowHeight, rowIndexByMidi, rows.length, track?.id]);

  const drawAt = useCallback((midi, step) => {
    if (!track || step >= patternSteps) return;
    const key = `${midi}:${step}`;
    if (lastDrawKeyRef.current === key) return;
    lastDrawKeyRef.current = key;
    const alreadyExists = (notesByMidi.get(midi) || []).some((note) => step >= note.start && step < note.start + note.duration);
    if (alreadyExists) return;
    dispatch({
      type: "ADD_NOTE",
      id: track.id,
      note: {
        start: step,
        duration: Math.min(noteLength, patternSteps - step),
        midi,
        velocity,
      },
    });
    onPreview?.(midi);
  }, [dispatch, noteLength, notesByMidi, onPreview, patternSteps, track, velocity]);

  const eraseNote = useCallback((noteId) => {
    if (!track || !noteId) return;
    const key = `note:${noteId}`;
    if (lastEraseKeyRef.current === key) return;
    lastEraseKeyRef.current = key;
    dispatch({ type: "DELETE_NOTE", trackId: track.id, noteId });
    setSelectedNoteIds((ids) => ids.filter((id) => id !== noteId));
  }, [dispatch, track]);

  const eraseAt = useCallback((midi, step) => {
    if (!track) return;
    const key = `${midi}:${step}`;
    if (lastEraseKeyRef.current === key) return;
    lastEraseKeyRef.current = key;
    (notesByMidi.get(midi) || [])
      .filter((note) => step >= note.start && step < note.start + note.duration)
      .forEach((note) => dispatch({ type: "DELETE_NOTE", trackId: track.id, noteId: note.id }));
  }, [dispatch, notesByMidi, track]);

  const pointerStepFromRow = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return clamp(Math.floor((event.clientX - rect.left) / stepWidth), 0, patternSteps - 1);
  }, [patternSteps, stepWidth]);

  const beginRowInteraction = useCallback((event, midi) => {
    const step = pointerStepFromRow(event);
    if (event.button === 2) {
      event.preventDefault();
      erasingRef.current = true;
      drawingRef.current = false;
      lastEraseKeyRef.current = "";
      eraseAt(midi, step);
      return;
    }
    if (event.button !== 0 || tool !== "draw") return;
    event.preventDefault();
    drawingRef.current = true;
    erasingRef.current = false;
    lastDrawKeyRef.current = "";
    drawAt(midi, step);
  }, [drawAt, eraseAt, pointerStepFromRow, tool]);

  const continueRowInteraction = useCallback((event, midi) => {
    const step = pointerStepFromRow(event);
    if (drawingRef.current && (event.buttons & 1) && tool === "draw") {
      event.preventDefault();
      drawAt(midi, step);
      return;
    }
    if (erasingRef.current && (event.buttons & 2)) {
      event.preventDefault();
      eraseAt(midi, step);
    }
  }, [drawAt, eraseAt, pointerStepFromRow, tool]);

  const selectForDrag = useCallback((noteId, shiftKey) => {
    let ids = selectedNoteIds;
    if (shiftKey) {
      ids = selectedSet.has(noteId)
        ? selectedNoteIds.filter((id) => id !== noteId)
        : [...selectedNoteIds, noteId];
    } else if (!selectedSet.has(noteId)) {
      ids = [noteId];
    }
    setSelectedNoteIds(ids);
    return ids.includes(noteId) ? ids : [noteId];
  }, [selectedNoteIds, selectedSet]);

  const beginNoteDrag = useCallback((event, note, mode) => {
    if (event.button === 2) {
      event.preventDefault();
      event.stopPropagation();
      erasingRef.current = true;
      lastEraseKeyRef.current = "";
      eraseNote(note.id);
      return;
    }
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const ids = selectForDrag(note.id, event.shiftKey);
    const originals = notes.filter((entry) => ids.includes(entry.id)).map((entry) => ({ ...entry }));
    noteDragRef.current = {
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      anchorId: note.id,
      originals,
      dragged: false,
      preview: notes,
    };
    setDragPreview({ mode, notes });
  }, [eraseNote, notes, selectForDrag]);

  const applyNoteDragPoint = useCallback((clientX, clientY) => {
    const drag = noteDragRef.current;
    if (!drag) return;
    const rawStepDelta = Math.round((clientX - drag.startX) / stepWidth);
    const rawMidiDelta = -Math.round((clientY - drag.startY) / rowHeight);
    if (Math.abs(clientX - drag.startX) > 3 || Math.abs(clientY - drag.startY) > 3) drag.dragged = true;

    let stepDelta = rawStepDelta;
    let midiDelta = rawMidiDelta;
    const minStart = Math.min(...drag.originals.map((note) => note.start));
    const maxEnd = Math.max(...drag.originals.map((note) => note.start + note.duration));
    const minMidi = Math.min(...drag.originals.map((note) => note.midi));
    const maxMidi = Math.max(...drag.originals.map((note) => note.midi));

    if (drag.mode === "move") {
      stepDelta = clamp(stepDelta, -minStart, patternSteps - maxEnd);
      midiDelta = clamp(midiDelta, LOW_MIDI - minMidi, HIGH_MIDI - maxMidi);
    } else if (drag.mode === "resize-left") {
      const shortestDuration = Math.min(...drag.originals.map((note) => note.duration));
      stepDelta = clamp(stepDelta, -minStart, shortestDuration - 1);
      midiDelta = 0;
    } else {
      const minDuration = Math.min(...drag.originals.map((note) => note.duration));
      const maxAvailable = Math.min(...drag.originals.map((note) => patternSteps - note.start - note.duration));
      stepDelta = clamp(stepDelta, 1 - minDuration, maxAvailable);
      midiDelta = 0;
    }

    const originalById = new Map(drag.originals.map((note) => [note.id, note]));
    const preview = notes.map((note) => {
      const original = originalById.get(note.id);
      if (!original) return note;
      if (drag.mode === "move") return { ...note, start: original.start + stepDelta, midi: original.midi + midiDelta };
      if (drag.mode === "resize-left") return { ...note, start: original.start + stepDelta, duration: original.duration - stepDelta };
      return { ...note, duration: original.duration + stepDelta };
    });
    drag.preview = preview;
    drag.stepDelta = stepDelta;
    drag.midiDelta = midiDelta;
    setDragPreview({ mode: drag.mode, notes: preview });
  }, [notes, patternSteps, rowHeight, stepWidth]);

  const moveNoteDrag = useCallback((event) => {
    const drag = noteDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    pendingDragPointRef.current = { clientX: event.clientX, clientY: event.clientY };
    if (dragFrameRef.current) return;
    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = 0;
      const point = pendingDragPointRef.current;
      pendingDragPointRef.current = null;
      if (point) applyNoteDragPoint(point.clientX, point.clientY);
    });
  }, [applyNoteDragPoint]);

  const finishNoteDrag = useCallback((event) => {
    const drag = noteDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (dragFrameRef.current) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = 0;
      const point = pendingDragPointRef.current;
      pendingDragPointRef.current = null;
      if (point) applyNoteDragPoint(point.clientX, point.clientY);
    }
    const finalDrag = noteDragRef.current || drag;
    if (finalDrag.dragged) {
      commitNotes(finalDrag.preview);
      if (drag.mode !== "move") {
        const anchor = finalDrag.preview.find((note) => note.id === finalDrag.anchorId);
        if (anchor) setNoteLength(anchor.duration);
      }
    } else {
      const anchor = notes.find((note) => note.id === finalDrag.anchorId);
      if (anchor) onPreview?.(anchor.midi);
    }
    noteDragRef.current = null;
    setDragPreview(null);
  }, [applyNoteDragPoint, commitNotes, notes, onPreview]);

  const continueNoteErase = useCallback((event, note) => {
    if (!erasingRef.current || !(event.buttons & 2)) return;
    event.preventDefault();
    event.stopPropagation();
    eraseNote(note.id);
  }, [eraseNote]);

  const pointerToGrid = useCallback((event) => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    return {
      x: clamp(event.clientX - rect.left - KEYS_WIDTH, 0, patternSteps * stepWidth),
      y: clamp(event.clientY - rect.top, 0, rows.length * rowHeight),
    };
  }, [patternSteps, rowHeight, rows.length, stepWidth]);

  const beginMarquee = useCallback((event) => {
    if (tool !== "select" || event.button !== 0) return;
    const point = pointerToGrid(event);
    if (!point) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    marqueeRef.current = {
      pointerId: event.pointerId,
      start: point,
      additive: event.shiftKey,
      previousIds: event.shiftKey ? selectedNoteIds : [],
    };
    setSelectionRect({ left: point.x, top: point.y, width: 0, height: 0 });
    if (!event.shiftKey) setSelectedNoteIds([]);
  }, [pointerToGrid, selectedNoteIds, tool]);

  const moveMarquee = useCallback((event) => {
    const marquee = marqueeRef.current;
    if (!marquee || marquee.pointerId !== event.pointerId) return;
    const point = pointerToGrid(event);
    if (!point) return;
    event.preventDefault();
    const left = Math.min(marquee.start.x, point.x);
    const right = Math.max(marquee.start.x, point.x);
    const top = Math.min(marquee.start.y, point.y);
    const bottom = Math.max(marquee.start.y, point.y);
    setSelectionRect({ left, top, width: right - left, height: bottom - top });
    const hitIds = notes.filter((note) => {
      const row = rowIndexByMidi.get(note.midi);
      if (row === undefined) return false;
      const noteLeft = note.start * stepWidth;
      const noteRight = (note.start + note.duration) * stepWidth;
      const noteTop = row * rowHeight;
      const noteBottom = noteTop + rowHeight;
      return noteRight >= left && noteLeft <= right && noteBottom >= top && noteTop <= bottom;
    }).map((note) => note.id);
    setSelectedNoteIds(unique([...marquee.previousIds, ...hitIds]));
  }, [notes, pointerToGrid, rowHeight, rowIndexByMidi, stepWidth]);

  const finishMarquee = useCallback((event) => {
    const marquee = marqueeRef.current;
    if (!marquee || marquee.pointerId !== event.pointerId) return;
    event.preventDefault();
    marqueeRef.current = null;
    setSelectionRect(null);
  }, []);

  const getTransformTargetIds = useCallback(() => (
    selectedNoteIds.length ? selectedNoteIds : notes.map((note) => note.id)
  ), [notes, selectedNoteIds]);

  const transformSelected = useCallback((transform) => {
    if (!track || notes.length === 0) return;
    const ids = new Set(getTransformTargetIds());
    commitNotes(notes.map((note) => (ids.has(note.id) ? transform(note, notes.filter((entry) => ids.has(entry.id))) : note)));
  }, [commitNotes, getTransformTargetIds, notes, track]);

  const translateSelection = useCallback((stepDelta, midiDelta) => {
    const ids = new Set(getTransformTargetIds());
    const target = notes.filter((note) => ids.has(note.id));
    if (!target.length) return;
    const minStart = Math.min(...target.map((note) => note.start));
    const maxEnd = Math.max(...target.map((note) => note.start + note.duration));
    const minMidi = Math.min(...target.map((note) => note.midi));
    const maxMidi = Math.max(...target.map((note) => note.midi));
    const safeStep = clamp(stepDelta, -minStart, patternSteps - maxEnd);
    const safeMidi = clamp(midiDelta, LOW_MIDI - minMidi, HIGH_MIDI - maxMidi);
    commitNotes(notes.map((note) => ids.has(note.id)
      ? { ...note, start: note.start + safeStep, midi: note.midi + safeMidi }
      : note));
  }, [commitNotes, getTransformTargetIds, notes, patternSteps]);

  const flipTime = useCallback(() => {
    const ids = new Set(getTransformTargetIds());
    const target = notes.filter((note) => ids.has(note.id));
    if (!target.length) return;
    const minStart = Math.min(...target.map((note) => note.start));
    const maxEnd = Math.max(...target.map((note) => note.start + note.duration));
    commitNotes(notes.map((note) => ids.has(note.id)
      ? { ...note, start: minStart + (maxEnd - (note.start + note.duration)) }
      : note));
  }, [commitNotes, getTransformTargetIds, notes]);

  const reflectPitch = useCallback(() => {
    const ids = new Set(getTransformTargetIds());
    const target = notes.filter((note) => ids.has(note.id));
    if (!target.length) return;
    const minMidi = Math.min(...target.map((note) => note.midi));
    const maxMidi = Math.max(...target.map((note) => note.midi));
    commitNotes(notes.map((note) => ids.has(note.id)
      ? { ...note, midi: minMidi + maxMidi - note.midi }
      : note));
  }, [commitNotes, getTransformTargetIds, notes]);

  const scaleTime = useCallback((factor) => {
    const ids = new Set(getTransformTargetIds());
    const target = notes.filter((note) => ids.has(note.id));
    if (!target.length) return;
    const pivot = Math.min(...target.map((note) => note.start));
    commitNotes(notes.map((note) => {
      if (!ids.has(note.id)) return note;
      const start = Math.round(pivot + (note.start - pivot) * factor);
      const duration = Math.max(1, Math.round(note.duration * factor));
      return {
        ...note,
        start: clamp(start, 0, patternSteps - 1),
        duration: clamp(duration, 1, patternSteps - clamp(start, 0, patternSteps - 1)),
      };
    }));
  }, [commitNotes, getTransformTargetIds, notes, patternSteps]);

  const scalePitch = useCallback((factor) => {
    const ids = new Set(getTransformTargetIds());
    const target = notes.filter((note) => ids.has(note.id));
    if (!target.length) return;
    const center = target.reduce((sum, note) => sum + note.midi, 0) / target.length;
    commitNotes(notes.map((note) => ids.has(note.id)
      ? { ...note, midi: clamp(Math.round(center + (note.midi - center) * factor), LOW_MIDI, HIGH_MIDI) }
      : note));
  }, [commitNotes, getTransformTargetIds, notes]);

  const duplicateSelection = useCallback(() => {
    const ids = new Set(getTransformTargetIds());
    const target = notes.filter((note) => ids.has(note.id));
    if (!target.length) return;
    const minStart = Math.min(...target.map((note) => note.start));
    const maxEnd = Math.max(...target.map((note) => note.start + note.duration));
    const span = Math.max(1, maxEnd - minStart);
    const available = patternSteps - maxEnd;
    const offset = Math.min(span, available);
    if (offset <= 0) return;
    const copies = target.map((note, index) => ({
      ...note,
      id: `${note.id}-copy-${Date.now().toString(36)}-${index}`,
      start: note.start + offset,
    }));
    commitNotes([...notes, ...copies]);
    setSelectedNoteIds(copies.map((note) => note.id));
  }, [commitNotes, getTransformTargetIds, notes, patternSteps]);

  const deleteSelection = useCallback(() => {
    if (!selectedNoteIds.length) return;
    const ids = new Set(selectedNoteIds);
    commitNotes(notes.filter((note) => !ids.has(note.id)));
    setSelectedNoteIds([]);
  }, [commitNotes, notes, selectedNoteIds]);

  const fillPattern = useCallback(() => {
    if (!track) return;
    const rootBase = 60 + ((Number(project.key) - (60 % 12) + 12) % 12);
    const scaleMidis = [];
    for (let midi = LOW_MIDI; midi <= HIGH_MIDI; midi += 1) {
      if (scalePitchClasses.has(midi % 12)) scaleMidis.push(midi);
    }
    const safeScale = scaleMidis.filter((midi) => midi >= 48 && midi <= 84);
    const makeNote = (start, midi, duration = noteLength, index = 0) => ({
      id: `fill-${Date.now().toString(36)}-${start}-${midi}-${index}`,
      start,
      duration: Math.min(duration, patternSteps - start),
      midi: clamp(midi, LOW_MIDI, HIGH_MIDI),
      velocity,
    });
    let filled = [];
    if (fillMode === "root-beats") {
      filled = Array.from({ length: Math.ceil(patternSteps / 4) }, (_, index) => makeNote(index * 4, rootBase, Math.min(noteLength, 4), index));
    } else if (fillMode === "scale-down") {
      const descending = [...safeScale].reverse();
      filled = Array.from({ length: Math.ceil(patternSteps / 4) }, (_, index) => makeNote(index * 4, descending[index % descending.length], Math.min(noteLength, 4), index));
    } else if (fillMode === "chords") {
      const chord = [0, 2, 4].map((degree) => safeScale[(safeScale.findIndex((midi) => midi >= rootBase) + degree) % safeScale.length]);
      filled = Array.from({ length: patternBars }, (_, bar) => chord.map((midi, index) => makeNote(bar * 16, midi, Math.min(noteLength, 16), index))).flat();
    } else if (fillMode === "repeat-selection") {
      const source = selectedNotes.length ? selectedNotes : notes;
      if (!source.length) return;
      const minStart = Math.min(...source.map((note) => note.start));
      const maxEnd = Math.max(...source.map((note) => note.start + note.duration));
      const span = Math.max(1, maxEnd - minStart);
      for (let offset = 0, copyIndex = 0; offset < patternSteps; offset += span, copyIndex += 1) {
        source.forEach((note, index) => {
          const start = offset + (note.start - minStart);
          if (start < patternSteps) filled.push({ ...note, id: `repeat-${Date.now().toString(36)}-${copyIndex}-${index}`, start, duration: Math.min(note.duration, patternSteps - start) });
        });
      }
    } else {
      filled = Array.from({ length: Math.ceil(patternSteps / 4) }, (_, index) => makeNote(index * 4, safeScale[index % safeScale.length], Math.min(noteLength, 4), index));
    }
    commitNotes(filled);
    setSelectedNoteIds(filled.map((note) => note.id));
  }, [commitNotes, fillMode, noteLength, notes, patternBars, patternSteps, project.key, scalePitchClasses, selectedNotes, track, velocity]);

  const applyEnvelopePatch = useCallback((patch) => {
    if (!selectedNoteIds.length) return;
    const ids = new Set(selectedNoteIds);
    commitNotes(notes.map((note) => {
      if (!ids.has(note.id)) return note;
      const base = note.envelope || trackEnvelopeDefaults;
      return { ...note, envelope: normalizeEnvelope({ ...base, ...patch }) };
    }));
  }, [commitNotes, notes, selectedNoteIds, trackEnvelopeDefaults]);

  const applyEnvelopePreset = useCallback((presetName) => {
    const preset = NOTE_ENVELOPE_PRESETS[presetName];
    if (preset) applyEnvelopePatch(preset);
  }, [applyEnvelopePatch]);

  const resetSelectedEnvelopes = useCallback(() => {
    if (!selectedNoteIds.length) return;
    const ids = new Set(selectedNoteIds);
    commitNotes(notes.map((note) => {
      if (!ids.has(note.id)) return note;
      const { envelope, ...rest } = note;
      return rest;
    }));
  }, [commitNotes, notes, selectedNoteIds]);

  useEffect(() => {
    const handleKey = (event) => {
      const target = event.target;
      if (target?.matches?.("input,select,textarea")) return;
      if ((event.key === "Delete" || event.key === "Backspace") && selectedNoteIds.length) {
        event.preventDefault();
        deleteSelection();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelectedNoteIds(notes.map((note) => note.id));
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelection();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [deleteSelection, duplicateSelection, notes, selectedNoteIds.length]);

  if (!track) {
    return (
      <Panel title="Piano Roll" subtitle="Select a track to open its note editor" className="piano-panel">
        <div className="empty-state piano-empty-state">
          Select any track in the track list. Its C0–C9 piano roll will render here automatically.
        </div>
      </Panel>
    );
  }

  const scaleLabel = SCALE_OPTIONS.find((option) => option.value === project.scale)?.label || project.scale;
  const trackModeLabel = track.type === "sampler" ? "Sampler pitch mode" : "Instrument note mode";

  return (
    <Panel
      title={`Scale Piano Roll · ${track.name}`}
      subtitle="Left draw · right erase · drag note center to move · drag either edge to stretch · Select tool for marquee and group transforms."
      actions={(
        <div className="piano-tools piano-tools-expanded piano-tools-67">
          <div className="piano-tool-mode" aria-label="Piano roll tool">
            <button type="button" className={tool === "draw" ? "active" : ""} onClick={() => setTool("draw")}>✎ Draw</button>
            <button type="button" className={tool === "select" ? "active" : ""} onClick={() => setTool("select")}>▱ Select</button>
          </div>
          <label>
            Pattern bars
            <div className="bar-stepper">
              <button type="button" onClick={() => dispatch({ type: "SET_PATTERN_BARS", value: patternBars - 1 })} disabled={patternBars <= 1}>−</button>
              <select value={patternBars} onChange={(event) => dispatch({ type: "SET_PATTERN_BARS", value: Number(event.target.value) })}>
                {BAR_OPTIONS.map((bars) => <option key={bars} value={bars}>{bars} bars · {bars * 16} steps</option>)}
              </select>
              <button type="button" onClick={() => dispatch({ type: "SET_PATTERN_BARS", value: patternBars + 1 })} disabled={patternBars >= 16}>＋</button>
            </div>
          </label>
          <label>
            Key note
            <select
              value={project.key}
              onChange={(event) => dispatch({ type: "SET_PROJECT_FIELD", field: "key", value: Number(event.target.value) })}
            >
              {NOTE_NAMES.map((name, index) => <option key={name} value={index}>{name}</option>)}
            </select>
          </label>
          <label>
            Scale
            <select
              value={project.scale}
              onChange={(event) => dispatch({ type: "SET_PROJECT_FIELD", field: "scale", value: event.target.value })}
            >
              {SCALE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            Roll
            <select value={foldToScale ? "scale" : "all"} onChange={(event) => setFoldToScale(event.target.value === "scale")}>
              <option value="scale">Selected scale · C0–C9</option>
              <option value="all">All notes · C0–C9</option>
            </select>
          </label>
          <label>
            Scale helpers
            <select value={scaleHelperMode} onChange={(event) => setScaleHelperMode(event.target.value)}>
              <option value="notes">FL-style highlights + ghosts</option>
              <option value="highlight">Scale highlighting only</option>
              <option value="off">Helpers off</option>
            </select>
          </label>
          <label>
            Next length
            <select value={noteLength} onChange={(event) => setNoteLength(Number(event.target.value))}>
              {LENGTH_OPTIONS.filter((length) => length <= patternSteps).map((length) => (
                <option key={length} value={length}>{length} · {noteLengthLabel(length)}</option>
              ))}
            </select>
          </label>
          <label className="velocity-control">
            Velocity {Math.round(velocity * 100)}%
            <input type="range" min="0.1" max="1" step="0.01" value={velocity} onChange={(event) => setVelocity(Number(event.target.value))} />
          </label>
          <label>
            H zoom
            <input type="range" min="18" max="44" step="1" value={stepWidth} onChange={(event) => setStepWidth(Number(event.target.value))} />
          </label>
          <label>
            V zoom
            <input type="range" min="18" max="34" step="1" value={rowHeight} onChange={(event) => setRowHeight(Number(event.target.value))} />
          </label>
          <label>
            Renderer
            <select value={rollRenderer} onChange={(event) => setRollRenderer(event.target.value)}>
              <option value="gpu">GPU accelerated</option>
              <option value="dom">DOM compatibility</option>
            </select>
          </label>
        </div>
      )}
      className="piano-panel"
    >
      <div className="selected-track-banner" data-selected-track-id={track.id}>
        <span className="selected-track-color" style={{ background: track.color }} />
        <div>
          <small>Selected track</small>
          <strong>{track.name}</strong>
        </div>
        <span className={`track-type-badge ${track.type}`}>{trackModeLabel}</span>
        {selectedSample && <span className="selected-sample-name">Sample: {selectedSample.name}</span>}
      </div>

      <div className="piano-transform-toolbar">
        <div className="selection-count"><strong>{selectedNoteIds.length}</strong> selected <small>Ctrl/Cmd+A selects all</small></div>
        <button type="button" onClick={() => setSelectedNoteIds(notes.map((note) => note.id))}>Select all</button>
        <button type="button" onClick={() => setSelectedNoteIds([])} disabled={!selectedNoteIds.length}>Clear selection</button>
        <button type="button" onClick={duplicateSelection} disabled={!notes.length}>Duplicate</button>
        <button type="button" onClick={deleteSelection} disabled={!selectedNoteIds.length}>Delete</button>
        <span className="toolbar-divider" />
        <label>Translate steps <input type="number" min="1" max={patternSteps} value={translateSteps} onChange={(event) => setTranslateSteps(Math.max(1, Number(event.target.value) || 1))} /></label>
        <button type="button" onClick={() => translateSelection(-translateSteps, 0)}>← Time</button>
        <button type="button" onClick={() => translateSelection(translateSteps, 0)}>Time →</button>
        <label>Semitones <input type="number" min="1" max="24" value={translateSemitones} onChange={(event) => setTranslateSemitones(Math.max(1, Number(event.target.value) || 1))} /></label>
        <button type="button" onClick={() => translateSelection(0, translateSemitones)}>Pitch ↑</button>
        <button type="button" onClick={() => translateSelection(0, -translateSemitones)}>Pitch ↓</button>
        <span className="toolbar-divider" />
        <button type="button" onClick={flipTime}>Flip time</button>
        <button type="button" onClick={reflectPitch}>Reflect pitch</button>
        <button type="button" onClick={() => scaleTime(0.5)}>Time ×½</button>
        <button type="button" onClick={() => scaleTime(2)}>Time ×2</button>
        <button type="button" onClick={() => scalePitch(0.5)}>Pitch compress</button>
        <button type="button" onClick={() => scalePitch(1.5)}>Pitch expand</button>
        <span className="toolbar-divider" />
        <label>Fill
          <select value={fillMode} onChange={(event) => setFillMode(event.target.value)}>
            <option value="scale-up">Scale ascending</option>
            <option value="scale-down">Scale descending</option>
            <option value="root-beats">Root every beat</option>
            <option value="chords">Scale triads each bar</option>
            <option value="repeat-selection">Repeat selection to end</option>
          </select>
        </label>
        <button type="button" className="accent" onClick={fillPattern}>Fill whole roll</button>
      </div>

      <section className={`note-envelope-editor ${envelopeEditorOpen ? "open" : "collapsed"}`} data-selected-note-count={selectedNoteIds.length}>
        <header>
          <button type="button" className="envelope-editor-toggle" onClick={() => setEnvelopeEditorOpen((open) => !open)}>
            {envelopeEditorOpen ? "▾" : "▸"} Per-note envelope
          </button>
          <span>{selectedNoteIds.length ? `${selectedNoteIds.length} selected note${selectedNoteIds.length === 1 ? "" : "s"}` : "Select notes to edit ADSR, gain, pan, and stereo width"}</span>
          <button type="button" onClick={resetSelectedEnvelopes} disabled={!selectedNoteIds.length}>Use track envelope</button>
        </header>
        {envelopeEditorOpen && (
          <div className="note-envelope-controls">
            {[
              ["attack", "Attack", 0.001, 4, 0.001, "s"],
              ["decay", "Decay", 0.001, 6, 0.001, "s"],
              ["sustain", "Sustain", 0.01, 1, 0.01, "%"],
              ["release", "Release", 0.01, 8, 0.01, "s"],
              ["gain", "Gain", 0.05, 1.5, 0.01, "%"],
              ["pan", "Pan", -1, 1, 0.01, "pan"],
              ["stereo", "Stereo", 0, 2, 0.01, "stereo"],
            ].map(([field, label, min, max, step, unit]) => {
              const value = Number(selectedEnvelope?.[field] ?? DEFAULT_NOTE_ENVELOPE[field]);
              const display = unit === "%"
                ? `${Math.round(value * 100)}%`
                : unit === "pan"
                  ? value === 0 ? "Center" : value < 0 ? `L${Math.round(-value * 100)}` : `R${Math.round(value * 100)}`
                  : unit === "stereo"
                    ? `${Math.round(value * 100)}% width`
                    : `${value < 0.1 ? value.toFixed(3) : value.toFixed(2)}s`;
              return (
                <label key={field}>
                  <span>{label}<b>{display}</b></span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    disabled={!selectedNoteIds.length}
                    onChange={(event) => applyEnvelopePatch({ [field]: Number(event.target.value) })}
                    aria-label={`${label} for selected notes`}
                  />
                </label>
              );
            })}
            <div className="note-envelope-presets">
              <small>Envelope shapes</small>
              <button type="button" onClick={() => applyEnvelopePreset("soft")} disabled={!selectedNoteIds.length}>Soft</button>
              <button type="button" onClick={() => applyEnvelopePreset("pluck")} disabled={!selectedNoteIds.length}>Pluck</button>
              <button type="button" onClick={() => applyEnvelopePreset("pad")} disabled={!selectedNoteIds.length}>Pad</button>
              <button type="button" onClick={() => applyEnvelopePreset("gate")} disabled={!selectedNoteIds.length}>Gate</button>
            </div>
          </div>
        )}
      </section>

      <div className="piano-roll-summary">
        <strong>{NOTE_NAMES[project.key]} {scaleLabel}</strong>
        <span>{rows.length} visible keys · {patternBars} bars · {patternSteps} steps</span>
        <span className={`scale-ghost-legend ${showScaleHighlights ? "visible" : "hidden"}`}>
          <em>Scale notes</em>
          {showScaleHighlights ? scaleNoteNames.map((noteName, index) => (
            <b key={noteName} className={index === 0 ? "root" : ""} data-selected-scale-note={noteName}>{noteName}</b>
          )) : <i>hidden</i>}
        </span>
        <span className="scale-helper-status">
          {scaleHelperMode === "notes" ? "Ghost notes repeat every beat through every octave" : scaleHelperMode === "highlight" ? "Scale rows highlighted through the full roll" : "Scale helpers disabled"}
        </span>
        <span>Inherited note length: {noteLength} steps</span>
        <span>{notes.length} notes</span>
        <span className="gpu-render-status">{rollRenderer === "gpu" ? gpuBackend : "DOM renderer"}</span>
      </div>
      <GpuAudioScope audioEngine={audioEngine} />

      <div className={`piano-scroll ${rollRenderer === "gpu" ? "gpu-roll-enabled" : ""}`} ref={scrollRef} onContextMenu={(event) => event.preventDefault()}>
        <GpuPianoRollSurface
          enabled={rollRenderer === "gpu"}
          scrollRef={scrollRef}
          rows={rows}
          notes={displayNotes}
          rowIndexByMidi={rowIndexByMidi}
          selectedSet={selectedSet}
          scalePitchClasses={scalePitchClasses}
          rootPitchClass={Number(project.key)}
          showScaleHighlights={showScaleHighlights}
          showScaleGhosts={showScaleGhosts}
          trackColor={track.color}
          playhead={playhead}
          patternSteps={patternSteps}
          stepWidth={stepWidth}
          rowHeight={rowHeight}
          keysWidth={KEYS_WIDTH}
          onBackendChange={setGpuBackend}
        />
        <div
          ref={gridRef}
          className={`piano-grid piano-grid-67 ${rollRenderer === "gpu" ? "gpu-rendered-roll" : ""} ${tool === "select" ? "select-tool" : "draw-tool"} ${showScaleGhosts ? "show-scale-ghosts" : "hide-scale-ghosts"} ${showScaleHighlights ? "show-scale-highlights" : "hide-scale-highlights"}`}
          data-piano-track-id={track.id}
          data-scale-root={NOTE_NAMES[project.key]}
          data-scale-name={project.scale}
          data-scale-notes={scaleNoteNames.join(",")}
          data-scale-helper-mode={scaleHelperMode}
          data-pattern-bars={patternBars}
          data-pattern-steps={patternSteps}
          style={{
            "--rows": rows.length,
            "--row-h": `${rowHeight}px`,
            "--step-w": `${stepWidth}px`,
            "--pattern-steps": patternSteps,
          }}
        >
          {rows.map((midi, row) => {
            const pitchClass = midi % 12;
            const name = midiToName(midi);
            const isRoot = pitchClass === Number(project.key);
            const inScale = scalePitchClasses.has(pitchClass);
            const scaleDegree = scaleDegreeByPitchClass.get(pitchClass);
            return (
              <PianoRow
                key={midi}
                midi={midi}
                row={row}
                patternSteps={patternSteps}
                inScale={inScale}
                isRoot={isRoot}
                name={name}
                scaleDegree={scaleDegree}
                showScaleHighlights={showScaleHighlights}
                showScaleGhosts={showScaleGhosts}
                beginRowInteraction={beginRowInteraction}
                continueRowInteraction={continueRowInteraction}
                onPreview={onPreview}
                rootName={NOTE_NAMES[project.key]}
                scaleLabel={scaleLabel}
              />
            );
          })}

          <div className="note-overlay">
            <div
              className="piano-playhead-line"
              aria-hidden="true"
              style={{ transform: `translate3d(${KEYS_WIDTH + (playhead % patternSteps) * stepWidth}px, 0, 0)` }}
            />
            <div
              className="selection-surface"
              onPointerDown={beginMarquee}
              onPointerMove={moveMarquee}
              onPointerUp={finishMarquee}
              onPointerCancel={finishMarquee}
            />
            {selectionRect && (
              <div
                className="marquee-selection"
                style={{
                  left: `calc(var(--keys-w) + ${selectionRect.left}px)`,
                  top: `${selectionRect.top}px`,
                  width: `${selectionRect.width}px`,
                  height: `${selectionRect.height}px`,
                }}
              />
            )}
            {displayNotes.map((note) => {
              const row = rowIndexByMidi.get(note.midi);
              if (row === undefined) return null;
              const selected = selectedSet.has(note.id);
              return (
                <PianoNoteBlock
                  key={note.id}
                  note={note}
                  row={row}
                  selected={selected}
                  dragging={Boolean(dragPreview && selected)}
                  selectedCount={selectedNoteIds.length}
                  trackColor={track.color}
                  stepWidth={stepWidth}
                  rowHeight={rowHeight}
                  continueNoteErase={continueNoteErase}
                  beginNoteDrag={beginNoteDrag}
                  moveNoteDrag={moveNoteDrag}
                  finishNoteDrag={finishNoteDrag}
                />
              );
            })}
          </div>
        </div>
      </div>
    </Panel>
  );
}
