import { createChannelStrip, distortionCurve, updateChannelStrip } from "./effects";
import { scheduleSampleVoice, scheduleSynthVoice } from "./voices";
import { resolveTrackPreset } from "../data/presetLibrary";
import { applyAutomationToPatch, applyAutomationToStrip, collectTrackAutomation } from "./automation";

const AudioContextClass = () => window.AudioContext || window.webkitAudioContext;

export class AudioEngine {
  constructor(onStep) {
    this.context = null;
    this.master = null;
    this.masterGain = null;
    this.strips = new Map();
    this.samples = new Map();
    this.timer = null;
    this.nextStepTime = 0;
    this.absoluteStep = 0;
    this.onStep = onStep;
    this.getProject = null;
    this.lookAhead = 0.12;
    this.interval = 25;
  }

  async ensure() {
    if (!this.context) {
      const Context = AudioContextClass();
      this.context = new Context({ latencyHint: "interactive" });
      this.master = this.context.createGain();
      this.masterLow = this.context.createBiquadFilter();
      this.masterHigh = this.context.createBiquadFilter();
      this.masterCompressor = this.context.createDynamicsCompressor();
      this.masterClipper = this.context.createWaveShaper();
      this.masterGain = this.context.createGain();
      this.masterLow.type = "lowshelf";
      this.masterLow.frequency.value = 120;
      this.masterHigh.type = "highshelf";
      this.masterHigh.frequency.value = 7000;
      this.masterCompressor.threshold.value = -7;
      this.masterCompressor.knee.value = 5;
      this.masterCompressor.ratio.value = 12;
      this.masterCompressor.attack.value = 0.003;
      this.masterCompressor.release.value = 0.12;
      this.masterClipper.curve = distortionCurve(0.12);
      this.masterClipper.oversample = "4x";
      this.master
        .connect(this.masterLow)
        .connect(this.masterHigh)
        .connect(this.masterCompressor)
        .connect(this.masterClipper)
        .connect(this.masterGain)
        .connect(this.context.destination);
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

  sync(project) {
    if (!this.context) return;
    const soloed = project.tracks.some((track) => track.solo);
    project.tracks.forEach((track) => {
      let strip = this.strips.get(track.id);
      if (!strip) {
        strip = createChannelStrip(this.context, this.master);
        this.strips.set(track.id, strip);
      }
      updateChannelStrip(strip, {
        ...track,
        mute: track.mute || (soloed && !track.solo),
      }, this.context.currentTime);
    });
    const master = project.master || {};
    this.master.gain.setTargetAtTime(master.inputGain ?? 1, this.context.currentTime, 0.02);
    this.masterLow.gain.setTargetAtTime(master.lowGain ?? 0, this.context.currentTime, 0.02);
    this.masterHigh.gain.setTargetAtTime(master.highGain ?? 0, this.context.currentTime, 0.02);
    this.masterCompressor.threshold.setTargetAtTime(master.compThreshold ?? -10, this.context.currentTime, 0.02);
    this.masterCompressor.ratio.setTargetAtTime(master.compRatio ?? 3, this.context.currentTime, 0.02);
    this.masterClipper.curve = distortionCurve(master.clipDrive ?? 0.16);
    const ceilingGain = 10 ** ((master.limiterCeiling ?? -1) / 20);
    this.masterGain.gain.setTargetAtTime((project.masterVolume ?? 0.85) * ceilingGain, this.context.currentTime, 0.02);
  }

  async previewTrack(track, preset, sample, midi = 60, project = null) {
    await this.ensure();
    const previewProject = project || { tracks: [track], masterVolume: 0.85, bpm: 120, customPresets: [] };
    this.sync({ ...previewProject, tracks: [track] });
    const strip = this.strips.get(track.id) || createChannelStrip(this.context, this.master);
    this.strips.set(track.id, strip);
    if (track.type === "sampler" && sample) {
      const buffer = await this.loadSample(sample);
      scheduleSampleVoice(this.context, strip.input, buffer, this.context.currentTime + 0.01, 0.9, track);
    } else {
      const resolved = preset || resolveTrackPreset(previewProject, track);
      scheduleSynthVoice(
        this.context,
        strip.input,
        resolved,
        midi,
        0.85,
        this.context.currentTime + 0.01,
        0.55,
        { bpm: previewProject.bpm || 120 },
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
    const localStep = absoluteStep % 64;
    window.setTimeout(
      () => this.onStep?.(absoluteStep),
      Math.max(0, (time - this.context.currentTime) * 1000),
    );
    const soloed = project.tracks.some((track) => track.solo);

    project.tracks.forEach((track) => {
      if (track.mute || (soloed && !track.solo)) return;
      const strip = this.strips.get(track.id);
      if (!strip) return;
      const automationValues = collectTrackAutomation(project, track.id, absoluteStep);
      applyAutomationToStrip(strip, automationValues, time);
      const activeClip = project.arrangement.find((clip) => (
        clip.trackId === track.id
        && Math.floor(absoluteStep / 16) >= clip.startBar
        && Math.floor(absoluteStep / 16) < clip.startBar + clip.lengthBars
      ));
      if (project.arrangement.length && track.useArrangement !== false && !activeClip) return;
      const patternStep = activeClip
        ? (absoluteStep - activeClip.startBar * 16) % 64
        : localStep;

      if (track.type === "sampler") {
        const velocity = track.steps?.[patternStep] || 0;
        if (velocity <= 0) return;
        const sample = project.samples.find((entry) => entry.id === track.sampleId);
        const buffer = this.samples.get(track.sampleId);
        if (buffer) {
          scheduleSampleVoice(this.context, strip.input, buffer, time, velocity, track);
        } else if (sample) {
          this.loadSample(sample).catch(() => {});
        }
        return;
      }

      const preset = applyAutomationToPatch(resolveTrackPreset(project, track), automationValues);
      (track.notes || [])
        .filter((note) => note.start === patternStep)
        .forEach((note) => scheduleSynthVoice(
          this.context,
          strip.input,
          preset,
          note.midi,
          note.velocity || 0.8,
          time,
          (60 / project.bpm / 4) * (note.duration || 1),
          { bpm: project.bpm },
        ));
    });
  }

  destroy() {
    this.stop();
    this.strips.forEach((strip) => {
      try { strip.chorusLfo?.stop(); } catch (_) { /* already stopped */ }
    });
    try { this.context?.close(); } catch (_) { /* no-op */ }
    this.context = null;
    this.strips.clear();
    this.samples.clear();
  }
}
