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
import { chordHeadroom } from "./audioSafety";

const AudioContextClass = () => window.AudioContext || window.webkitAudioContext;

export class AudioEngine {
  constructor(onStep) {
    this.context = null;
    this.master = null;
    this.masterStrip = null;
    this.strips = new Map();
    this.samples = new Map();
    this.timer = null;
    this.nextStepTime = 0;
    this.absoluteStep = 0;
    this.onStep = onStep;
    this.getProject = null;
    this.lookAhead = 0.12;
    this.interval = 25;
    this.activeVoices = new Map();
    this.previewVoice = null;
    this.maxVoicesPerTrack = 24;
    this.maxVoicesTotal = 96;
  }


  cleanupVoices(now = this.context?.currentTime || 0) {
    for (const [trackId, voices] of this.activeVoices.entries()) {
      const active = voices.filter((voice) => !Number.isFinite(voice.endTime) || voice.endTime > now - 0.02);
      if (active.length) this.activeVoices.set(trackId, active);
      else this.activeVoices.delete(trackId);
    }
  }

  activeVoiceCount(trackId = null) {
    this.cleanupVoices();
    if (trackId) return (this.activeVoices.get(trackId) || []).length;
    return [...this.activeVoices.values()].reduce((sum, voices) => sum + voices.length, 0);
  }

  registerVoice(trackId, voice, scheduledTime, limit = this.maxVoicesPerTrack) {
    if (!voice) return voice;
    this.cleanupVoices();
    const voices = this.activeVoices.get(trackId) || [];
    while (voices.length >= limit) {
      const stolen = voices.shift();
      stolen?.stop?.(Math.max(this.context.currentTime, scheduledTime - 0.004));
    }
    while (this.activeVoiceCount() >= this.maxVoicesTotal) {
      const firstEntry = this.activeVoices.entries().next().value;
      if (!firstEntry) break;
      const [oldestTrack, oldestVoices] = firstEntry;
      const stolen = oldestVoices.shift();
      stolen?.stop?.(Math.max(this.context.currentTime, scheduledTime - 0.004));
      if (!oldestVoices.length) this.activeVoices.delete(oldestTrack);
    }
    voices.push(voice);
    this.activeVoices.set(trackId, voices);
    return voice;
  }

  releaseAllVoices(when = this.context?.currentTime || 0) {
    for (const voices of this.activeVoices.values()) {
      voices.forEach((voice) => voice?.stop?.(when));
    }
    this.activeVoices.clear();
    this.previewVoice?.stop?.(when);
    this.previewVoice = null;
  }

  async ensure() {
    if (!this.context) {
      const Context = AudioContextClass();
      this.context = new Context({ latencyHint: "interactive" });
      this.masterStrip = createChannelStrip(this.context, this.context.destination);
      this.master = this.masterStrip.input;
    }
    if (this.context.state === "suspended") await this.context.resume();
    return this.context;
  }

  async loadSample(sample) {
    if (!sample?.url || this.samples.has(sample.id)) return this.samples.get(sample.id);
    const context = await this.ensure();
    const response = await fetch(sample.url);
    if (!response.ok) throw new Error(`Could not load ${sample.name || sample.url}`);
    const bytes = await response.arrayBuffer();
    const decoded = await context.decodeAudioData(bytes.slice(0));
    this.samples.set(sample.id, decoded);
    return decoded;
  }

  sync(project, { prune = true } = {}) {
    if (!this.context) return;
    const now = this.context.currentTime;
    const soloed = project.tracks.some((track) => track.solo);
    if (prune) {
      const liveTrackIds = new Set(project.tracks.map((track) => track.id));
      for (const [trackId, strip] of this.strips.entries()) {
        if (liveTrackIds.has(trackId)) continue;
        try { strip.chorusLfo?.stop(); } catch (_) { /* already stopped */ }
        try { strip.input?.disconnect(); } catch (_) { /* no-op */ }
        this.strips.delete(trackId);
        (this.activeVoices.get(trackId) || []).forEach((voice) => voice?.stop?.(now));
        this.activeVoices.delete(trackId);
      }
    }
    project.tracks.forEach((track) => {
      let strip = this.strips.get(track.id);
      if (!strip) {
        strip = createChannelStrip(this.context, this.master);
        this.strips.set(track.id, strip);
      }
      updateChannelStrip(strip, {
        ...track,
        mute: track.mute || (soloed && !track.solo),
      }, now, project.bpm);
    });
    if (this.masterStrip) {
      updateChannelStrip(this.masterStrip, masterTrackFromProject(project), now, project.bpm);
    }
  }

  async previewTrack(track, preset, sample, midi = 60, project = null) {
    await this.ensure();
    const previewProject = project || { tracks: [track], masterVolume: 0.85, bpm: 120, customPresets: [], master: {} };
    this.sync(previewProject, { prune: false });
    const strip = this.strips.get(track.id) || createChannelStrip(this.context, this.master);
    this.strips.set(track.id, strip);
    const now = this.context.currentTime;
    this.previewVoice?.stop?.(now);
    this.previewVoice = null;
    const insertPitch = pitchShiftSemitones(track);
    if (track.type === "sampler" && sample) {
      const buffer = await this.loadSample(sample);
      this.previewVoice = scheduleSampleVoice(
        this.context,
        strip.input,
        buffer,
        now + 0.012,
        0.82,
        {
          ...track,
          voiceGain: 0.72,
          pitch: (track.pitch || 0) + insertPitch + (midi - (Number.isInteger(track.sliceIndex) ? 60 + track.sliceIndex : 60)),
        },
      );
    } else {
      const resolved = preset || resolveTrackPreset(previewProject, track);
      this.previewVoice = scheduleSynthVoice(
        this.context,
        strip.input,
        resolved,
        midi + insertPitch,
        0.78,
        now + 0.012,
        0.55,
        { bpm: previewProject.bpm || 120, voiceGain: 0.72 },
      );
    }
  }

  async play(getProject, startStep = 0) {
    await this.ensure();
    this.getProject = getProject;
    const project = getProject();
    this.sync(project);
    this.absoluteStep = startStep;
    this.nextStepTime = this.context.currentTime + 0.06;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.scheduler(), this.interval);
    this.scheduler();
  }

  pause() {
    clearInterval(this.timer);
    this.timer = null;
  }

  stop() {
    this.pause();
    this.releaseAllVoices(this.context?.currentTime || 0);
    this.absoluteStep = 0;
    this.onStep?.(0);
  }

  scheduler() {
    if (!this.context || !this.getProject) return;
    const project = this.getProject();
    this.sync(project);
    while (this.nextStepTime < this.context.currentTime + this.lookAhead) {
      this.scheduleStep(project, this.absoluteStep, this.nextStepTime);
      const stepSeconds = 60 / Math.max(40, project.bpm) / 4;
      const swingOffset = this.absoluteStep % 2 === 1
        ? stepSeconds * (project.swing || 0) * 0.34
        : 0;
      this.nextStepTime += stepSeconds + swingOffset;
      this.absoluteStep = (this.absoluteStep + 1) % Math.max(16, project.loopBars * 16);
    }
  }

  scheduleStep(project, absoluteStep, time) {
    const patternSteps = Math.max(16, Math.min(256, Number(project.patternBars || 4) * 16));
    const localStep = absoluteStep % patternSteps;
    const stepSeconds = 60 / Math.max(40, project.bpm) / 4;
    window.setTimeout(
      () => this.onStep?.(absoluteStep),
      Math.max(0, (time - this.context.currentTime) * 1000),
    );
    const soloed = project.tracks.some((track) => track.solo);
    applyTimeShaperAtStep(this.masterStrip, project.master || {}, absoluteStep, time, stepSeconds);

    project.tracks.forEach((track) => {
      if (track.mute || (soloed && !track.solo)) return;
      const strip = this.strips.get(track.id);
      if (!strip) return;
      applyTimeShaperAtStep(strip, track.effects || {}, absoluteStep, time, stepSeconds);
      const automationValues = collectTrackAutomation(project, track.id, absoluteStep);
      applyAutomationToStrip(strip, automationValues, time);
      const activeClip = project.arrangement.find((clip) => (
        clip.trackId === track.id
        && Math.floor(absoluteStep / 16) >= clip.startBar
        && Math.floor(absoluteStep / 16) < clip.startBar + clip.lengthBars
      ));
      if (project.arrangement.length && track.useArrangement !== false && !activeClip) return;
      const patternStep = activeClip
        ? (absoluteStep - activeClip.startBar * 16) % patternSteps
        : localStep;
      const insertPitch = pitchShiftSemitones(track) + Number(track.effects?.pitchShiftFine || 0) / 100;

      if (track.type === "sampler") {
        const sample = project.samples.find((entry) => entry.id === track.sampleId);
        const buffer = this.samples.get(track.sampleId);
        const samplerUsesNotes = track.sequenceMode === "notes"
          || (track.sequenceMode !== "steps" && (track.notes || []).length > 0);

        if (samplerUsesNotes) {
          const noteEvents = (track.notes || []).filter((note) => note.start === patternStep);
          if (buffer) {
            const activeCount = this.activeVoiceCount(track.id);
            const voiceGain = chordHeadroom(noteEvents.length, activeCount);
            noteEvents.forEach((note) => {
              const voice = scheduleSampleVoice(
                this.context,
                strip.input,
                buffer,
                time,
                note.velocity || 0.8,
                {
                  ...track,
                  voiceGain,
                  pitch: (track.pitch || 0) + insertPitch + (note.midi - (Number.isInteger(note.sliceIndex) ? 60 + note.sliceIndex : 60)),
                  noteDurationSeconds: stepSeconds * (note.duration || 1),
                  sliceIndex: Number.isInteger(note.sliceIndex) ? note.sliceIndex : undefined,
                  noteEnvelope: note.envelope,
                },
              );
              this.registerVoice(track.id, voice, time, 24);
            });
          } else if (sample && noteEvents.length) {
            this.loadSample(sample).catch(() => {});
          }
          return;
        }

        const velocity = track.steps?.[patternStep % Math.max(1, track.steps?.length || 64)] || 0;
        if (velocity <= 0) return;
        if (buffer) {
          const voice = scheduleSampleVoice(this.context, strip.input, buffer, time, velocity, {
            ...track,
            voiceGain: chordHeadroom(1, this.activeVoiceCount(track.id)),
            pitch: (track.pitch || 0) + insertPitch,
          });
          this.registerVoice(track.id, voice, time, 24);
        } else if (sample) {
          this.loadSample(sample).catch(() => {});
        }
        return;
      }

      const preset = applyAutomationToPatch(resolveTrackPreset(project, track), automationValues);
      const noteEvents = (track.notes || []).filter((note) => note.start === patternStep);
      const voiceGain = chordHeadroom(noteEvents.length, this.activeVoiceCount(track.id));
      noteEvents.forEach((note) => {
        const voice = scheduleSynthVoice(
          this.context,
          strip.input,
          preset,
          note.midi + insertPitch,
          note.velocity || 0.8,
          time,
          stepSeconds * (note.duration || 1),
          { bpm: project.bpm, noteEnvelope: note.envelope, voiceGain },
        );
        this.registerVoice(track.id, voice, time, 24);
      });
    });
  }

  destroy() {
    this.stop();
    [...this.strips.values(), this.masterStrip].filter(Boolean).forEach((strip) => {
      try { strip.chorusLfo?.stop(); } catch (_) { /* already stopped */ }
    });
    try { this.context?.close(); } catch (_) { /* no-op */ }
    this.context = null;
    this.master = null;
    this.masterStrip = null;
    this.strips.clear();
    this.samples.clear();
    this.activeVoices.clear();
    this.previewVoice = null;
  }
}
