import {
  applyTimeShaperAtStep,
  createChannelStrip,
  masterTrackFromProject,
  pitchShiftSemitones,
  updateChannelStrip,
} from "./effects";
import { scheduleSampleVoice, scheduleSynthVoice } from "./voices";
import { resolveTrackPreset } from "../data/presetLibrary";
import { applyAutomationToPatch, applyAutomationToStrip, collectTrackAutomation } from "./automation";
import { audioBufferToWavBlob } from "./wav";
import { chordHeadroom } from "./audioSafety";
import { finalizeRenderedBuffer } from "./renderSafety";
import { estimateSynthVoiceCost, multitrackHeadroom } from "./multitrackPlanner";

export async function renderProjectToWav(project, bars = project.loopBars || 4, onProgress = () => {}) {
  const sampleRate = Number(project.master?.renderSampleRate || 48000);
  const secondsPerStep = 60 / project.bpm / 4;
  const duration = bars * 16 * secondsPerStep + 10;
  const context = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
  const masterStrip = createChannelStrip(context, context.destination);
  const masterInput = masterStrip.input;
  updateChannelStrip(masterStrip, masterTrackFromProject(project), 0, project.bpm);

  const usedSampleIds = new Set(
    project.tracks.filter((track) => track.type === "sampler").map((track) => track.sampleId),
  );
  const samplesToLoad = project.samples.filter((sample) => usedSampleIds.has(sample.id));
  const sampleBuffers = new Map();
  for (let index = 0; index < samplesToLoad.length; index += 1) {
    const sample = samplesToLoad[index];
    try {
      const response = await fetch(sample.url);
      const bytes = await response.arrayBuffer();
      const buffer = await context.decodeAudioData(bytes);
      sampleBuffers.set(sample.id, buffer);
    } catch (_) {
      // Unavailable samples are skipped so the rest of the project can still render.
    }
    onProgress(Math.round((index / Math.max(1, samplesToLoad.length)) * 18));
  }

  const soloed = project.tracks.some((track) => track.solo);
  const strips = new Map();
  project.tracks.forEach((track) => {
    const strip = createChannelStrip(context, masterInput);
    updateChannelStrip(strip, {
      ...track,
      mute: track.mute || (soloed && !track.solo),
    }, 0, project.bpm);
    strips.set(track.id, strip);
  });

  const patternSteps = Math.max(16, Math.min(256, Number(project.patternBars || 4) * 16));
  const noteIndexes = new Map(project.tracks.map((track) => {
    const byStep = new Map();
    (track.notes || []).forEach((note) => {
      const key = Number(note.start) || 0;
      const bucket = byStep.get(key) || [];
      bucket.push(note);
      byStep.set(key, bucket);
    });
    return [track.id, byStep];
  }));
  const notesAt = (track, step) => noteIndexes.get(track.id)?.get(step) || [];
  const overlapCounts = new Map(project.tracks.map((track) => {
    const counts = new Uint16Array(patternSteps);
    (track.notes || []).forEach((note) => {
      const start = Math.max(0, Math.floor(Number(note.start) || 0));
      const durationSteps = Math.max(1, Math.ceil(Number(note.duration) || 1));
      for (let offset = 0; offset < durationSteps; offset += 1) {
        const step = start + offset;
        if (step >= patternSteps) break;
        counts[step] += 1;
      }
    });
    return [track.id, counts];
  }));
  const overlapAt = (track, step, currentNotes = 0) => Math.max(0, (overlapCounts.get(track.id)?.[step] || 0) - currentNotes);
  const globalStartCounts = new Uint16Array(patternSteps);
  const globalOverlapCounts = new Uint16Array(patternSteps);
  const activeTrackSets = Array.from({ length: patternSteps }, () => new Set());
  project.tracks.forEach((track) => {
    if (track.mute || (soloed && !track.solo)) return;
    const samplerUsesNotes = track.type !== "sampler" || track.sequenceMode === "notes"
      || (track.sequenceMode !== "steps" && (track.notes || []).length > 0);
    if (samplerUsesNotes) {
      (track.notes || []).forEach((note) => {
        const start = Math.max(0, Math.floor(Number(note.start) || 0));
        const durationSteps = Math.max(1, Math.ceil(Number(note.duration) || 1));
        if (start < patternSteps) globalStartCounts[start] += 1;
        for (let offset = 0; offset < durationSteps; offset += 1) {
          const target = start + offset;
          if (target >= patternSteps) break;
          globalOverlapCounts[target] += 1;
          activeTrackSets[target].add(track.id);
        }
      });
    } else {
      (track.steps || []).forEach((velocity, step) => {
        if (step >= patternSteps || Number(velocity || 0) <= 0) return;
        globalStartCounts[step] += 1;
        globalOverlapCounts[step] += 1;
        activeTrackSets[step].add(track.id);
      });
    }
  });

  const arrangementByTrack = new Map();
  (project.arrangement || []).forEach((clip) => {
    const bucket = arrangementByTrack.get(clip.trackId) || [];
    bucket.push(clip);
    arrangementByTrack.set(clip.trackId, bucket);
  });
  for (const clips of arrangementByTrack.values()) clips.sort((a, b) => a.startBar - b.startBar);

  for (let step = 0; step < bars * 16; step += 1) {
    const time = step * secondsPerStep
      + (step % 2 ? secondsPerStep * (project.swing || 0) * 0.34 : 0);
    const globalPatternStep = step % patternSteps;
    const globalStarts = globalStartCounts[globalPatternStep] || 0;
    const globalSustains = Math.max(0, (globalOverlapCounts[globalPatternStep] || 0) - globalStarts);
    const renderHeadroom = multitrackHeadroom(
      globalStarts,
      globalSustains,
      activeTrackSets[globalPatternStep]?.size || 1,
    );
    applyTimeShaperAtStep(masterStrip, project.master || {}, step, time, secondsPerStep);
    for (const track of project.tracks) {
      if (track.mute || (soloed && !track.solo)) continue;
      const strip = strips.get(track.id);
      applyTimeShaperAtStep(strip, track.effects || {}, step, time, secondsPerStep);
      const automationValues = collectTrackAutomation(project, track.id, step);
      applyAutomationToStrip(strip, automationValues, time);
      const localStep = step % patternSteps;
      const currentBar = Math.floor(step / 16);
      const clip = (arrangementByTrack.get(track.id) || []).find((entry) => (
        currentBar >= entry.startBar && currentBar < entry.startBar + entry.lengthBars
      ));
      if (project.arrangement.length && track.useArrangement !== false && !clip) continue;
      const patternStep = clip ? (step - clip.startBar * 16) % patternSteps : localStep;
      const insertPitch = pitchShiftSemitones(track) + Number(track.effects?.pitchShiftFine || 0) / 100;

      if (track.type === "sampler") {
        const buffer = sampleBuffers.get(track.sampleId);
        const samplerUsesNotes = track.sequenceMode === "notes"
          || (track.sequenceMode !== "steps" && (track.notes || []).length > 0);
        if (samplerUsesNotes) {
          const noteEvents = notesAt(track, patternStep);
          const voiceGain = chordHeadroom(noteEvents.length, overlapAt(track, patternStep, noteEvents.length)) * renderHeadroom;
          noteEvents.forEach((note) => {
            if (!buffer) return;
            scheduleSampleVoice(
              context,
              strip.input,
              buffer,
              time,
              note.velocity || 0.8,
              {
                ...track,
                voiceGain,
                pitch: (track.pitch || 0) + insertPitch + (note.midi - (Number.isInteger(note.sliceIndex) ? 60 + note.sliceIndex : 60)),
                noteDurationSeconds: secondsPerStep * (note.duration || 1),
                sliceIndex: Number.isInteger(note.sliceIndex) ? note.sliceIndex : undefined,
                noteEnvelope: note.envelope,
              },
            );
          });
        } else {
          const velocity = track.steps?.[patternStep % Math.max(1, track.steps?.length || 64)] || 0;
          if (velocity > 0 && buffer) {
            scheduleSampleVoice(context, strip.input, buffer, time, velocity, {
              ...track,
              voiceGain: renderHeadroom,
              pitch: (track.pitch || 0) + insertPitch,
            });
          }
        }
      } else {
        const preset = applyAutomationToPatch(resolveTrackPreset(project, track), automationValues);
        const noteEvents = notesAt(track, patternStep);
        const averageCost = noteEvents.length
          ? noteEvents.reduce((sum, note) => sum + estimateSynthVoiceCost(preset, note.midi + insertPitch, "studio"), 0) / noteEvents.length
          : 1;
        const voiceGain = chordHeadroom(noteEvents.length, overlapAt(track, patternStep, noteEvents.length), averageCost) * renderHeadroom;
        noteEvents.forEach((note) => scheduleSynthVoice(
          context,
          strip.input,
          preset,
          note.midi + insertPitch,
          note.velocity || 0.8,
          time,
          secondsPerStep * (note.duration || 1),
          { bpm: project.bpm, noteEnvelope: note.envelope, voiceGain, quality: "studio" },
        ));
      }
    }
    if (step % 16 === 0) {
      onProgress(18 + Math.round((step / Math.max(1, bars * 16)) * 32));
      await Promise.resolve();
    }
  }

  onProgress(55);
  const rendered = await context.startRendering();
  onProgress(91);
  const renderStats = finalizeRenderedBuffer(rendered, {
    ceilingDb: project.master?.renderCeiling ?? project.master?.limiterCeiling ?? -1,
    lookAheadMs: project.master?.renderLookAheadMs ?? 6,
    releaseMs: project.master?.renderLimiterReleaseMs ?? 140,
  });
  rendered.renderSafety = renderStats;
  onProgress(96);
  const blob = audioBufferToWavBlob(rendered);
  onProgress(100);
  return blob;
}
