import { createChannelStrip, distortionCurve, updateChannelStrip } from "./effects";
import { scheduleSampleVoice, scheduleSynthVoice } from "./voices";
import { resolveTrackPreset } from "../data/presetLibrary";
import { applyAutomationToPatch, applyAutomationToStrip, collectTrackAutomation } from "./automation";
import { audioBufferToWavBlob } from "./wav";

export async function renderProjectToWav(project, bars = project.loopBars || 4, onProgress = () => {}) {
  const sampleRate = 44100;
  const secondsPerStep = 60 / project.bpm / 4;
  const duration = bars * 16 * secondsPerStep + 8;
  const context = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
  const masterInput = context.createGain();
  const masterLow = context.createBiquadFilter();
  const masterHigh = context.createBiquadFilter();
  const masterCompressor = context.createDynamicsCompressor();
  const masterClipper = context.createWaveShaper();
  const gain = context.createGain();
  const masterSettings = project.master || {};
  masterInput.gain.value = masterSettings.inputGain ?? 1;
  masterLow.type = "lowshelf";
  masterLow.frequency.value = 120;
  masterLow.gain.value = masterSettings.lowGain ?? 0;
  masterHigh.type = "highshelf";
  masterHigh.frequency.value = 7000;
  masterHigh.gain.value = masterSettings.highGain ?? 0;
  masterCompressor.threshold.value = masterSettings.compThreshold ?? -8;
  masterCompressor.ratio.value = masterSettings.compRatio ?? 10;
  masterCompressor.knee.value = 5;
  masterCompressor.attack.value = 0.003;
  masterCompressor.release.value = 0.12;
  masterClipper.curve = distortionCurve(masterSettings.clipDrive ?? 0.16);
  masterClipper.oversample = "4x";
  gain.gain.value = (project.masterVolume ?? 0.85) * (10 ** ((masterSettings.limiterCeiling ?? -1) / 20));
  masterInput
    .connect(masterLow)
    .connect(masterHigh)
    .connect(masterCompressor)
    .connect(masterClipper)
    .connect(gain)
    .connect(context.destination);

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
    }, 0);
    strips.set(track.id, strip);
  });

  for (let step = 0; step < bars * 16; step += 1) {
    const time = step * secondsPerStep
      + (step % 2 ? secondsPerStep * (project.swing || 0) * 0.34 : 0);
    for (const track of project.tracks) {
      if (track.mute || (soloed && !track.solo)) continue;
      const strip = strips.get(track.id);
      const automationValues = collectTrackAutomation(project, track.id, step);
      applyAutomationToStrip(strip, automationValues, time);
      const localStep = step % 64;
      const clip = project.arrangement.find((entry) => (
        entry.trackId === track.id
        && Math.floor(step / 16) >= entry.startBar
        && Math.floor(step / 16) < entry.startBar + entry.lengthBars
      ));
      if (project.arrangement.length && track.useArrangement !== false && !clip) continue;
      const patternStep = clip ? (step - clip.startBar * 16) % 64 : localStep;

      if (track.type === "sampler") {
        const velocity = track.steps?.[patternStep] || 0;
        const buffer = sampleBuffers.get(track.sampleId);
        if (velocity > 0 && buffer) {
          scheduleSampleVoice(context, strip.input, buffer, time, velocity, track);
        }
      } else {
        const preset = applyAutomationToPatch(resolveTrackPreset(project, track), automationValues);
        (track.notes || [])
          .filter((note) => note.start === patternStep)
          .forEach((note) => scheduleSynthVoice(
            context,
            strip.input,
            preset,
            note.midi,
            note.velocity || 0.8,
            time,
            secondsPerStep * (note.duration || 1),
            { bpm: project.bpm },
          ));
      }
    }
    if (step % 8 === 0) onProgress(20 + Math.round((step / (bars * 16)) * 65));
  }

  onProgress(88);
  const rendered = await context.startRendering();
  strips.forEach((strip) => {
    try { strip.chorusLfo.stop(); } catch (_) { /* already stopped */ }
  });
  onProgress(100);
  return audioBufferToWavBlob(rendered);
}
