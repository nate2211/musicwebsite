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

export async function renderProjectToWav(project, bars = project.loopBars || 4, onProgress = () => {}) {
  const sampleRate = 44100;
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

  for (let step = 0; step < bars * 16; step += 1) {
    const time = step * secondsPerStep
      + (step % 2 ? secondsPerStep * (project.swing || 0) * 0.34 : 0);
    applyTimeShaperAtStep(masterStrip, project.master || {}, step, time, secondsPerStep);
    for (const track of project.tracks) {
      if (track.mute || (soloed && !track.solo)) continue;
      const strip = strips.get(track.id);
      applyTimeShaperAtStep(strip, track.effects || {}, step, time, secondsPerStep);
      const automationValues = collectTrackAutomation(project, track.id, step);
      applyAutomationToStrip(strip, automationValues, time);
      const localStep = step % patternSteps;
      const clip = project.arrangement.find((entry) => (
        entry.trackId === track.id
        && Math.floor(step / 16) >= entry.startBar
        && Math.floor(step / 16) < entry.startBar + entry.lengthBars
      ));
      if (project.arrangement.length && track.useArrangement !== false && !clip) continue;
      const patternStep = clip ? (step - clip.startBar * 16) % patternSteps : localStep;
      const insertPitch = pitchShiftSemitones(track) + Number(track.effects?.pitchShiftFine || 0) / 100;

      if (track.type === "sampler") {
        const buffer = sampleBuffers.get(track.sampleId);
        const samplerUsesNotes = track.sequenceMode === "notes"
          || (track.sequenceMode !== "steps" && (track.notes || []).length > 0);
        if (samplerUsesNotes) {
          const noteEvents = (track.notes || []).filter((note) => note.start === patternStep);
          const voiceGain = chordHeadroom(noteEvents.length, 0);
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
              voiceGain: 1,
              pitch: (track.pitch || 0) + insertPitch,
            });
          }
        }
      } else {
        const preset = applyAutomationToPatch(resolveTrackPreset(project, track), automationValues);
        const noteEvents = (track.notes || []).filter((note) => note.start === patternStep);
        const voiceGain = chordHeadroom(noteEvents.length, 0);
        noteEvents.forEach((note) => scheduleSynthVoice(
          context,
          strip.input,
          preset,
          note.midi + insertPitch,
          note.velocity || 0.8,
          time,
          secondsPerStep * (note.duration || 1),
          { bpm: project.bpm, noteEnvelope: note.envelope, voiceGain },
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
  onProgress(93);
  const blob = audioBufferToWavBlob(rendered);
  onProgress(100);
  return blob;
}
