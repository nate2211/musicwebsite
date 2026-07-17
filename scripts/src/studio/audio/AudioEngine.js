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
import { createPrecisionScheduler } from "./precisionScheduler";
import {
  estimateSynthVoiceCost,
  multitrackHeadroom,
  planMultitrackStep,
} from "./multitrackPlanner";
import {
  createNativeMixBuses,
  inferTrackRole,
  teardownNativeMixBuses,
  updateNativeMixBuses,
} from "./nativeMixBus";
import {
  compatibleBaseLatency,
  createCompatibleAudioContext,
  decodeAudioDataCompat,
  detectAudioBrowser,
  installAudioResumeRecovery,
  resumeCompatibleAudioContext,
  unlockCompatibleAudioContext,
} from "./browserAudioCompat";

export function selectDenseNoteBatch(noteEvents = [], limit = 20) {
  const safeLimit = Math.max(1, Math.floor(Number(limit) || 1));
  const unique = new Map();
  noteEvents.forEach((note) => {
    const sliceKey = Number.isInteger(note?.sliceIndex) ? note.sliceIndex : -1;
    const key = `${Number(note?.midi) || 0}:${sliceKey}:${Number(note?.duration) || 1}`;
    const current = unique.get(key);
    if (!current || Number(note?.velocity || 0) > Number(current?.velocity || 0)) unique.set(key, note);
  });
  const notes = [...unique.values()];
  if (notes.length <= safeLimit) return notes.sort((a, b) => (a.midi - b.midi) || (b.velocity - a.velocity));

  const byPitch = [...notes].sort((a, b) => a.midi - b.midi);
  const chosen = new Map();
  const keep = (note) => { if (note) chosen.set(note.id || `${note.midi}:${note.duration}`, note); };
  keep(byPitch[0]);
  keep(byPitch.at(-1));
  byPitch
    .slice()
    .sort((a, b) => Number(b.velocity || 0) - Number(a.velocity || 0))
    .forEach((note) => { if (chosen.size < safeLimit) keep(note); });
  return [...chosen.values()].sort((a, b) => (a.midi - b.midi) || (b.velocity - a.velocity));
}

function denseStartOffset(index, count) {
  if (count < 7) return 0;
  return Math.min(0.0024, Math.max(0, index) * 0.00008);
}

export class AudioEngine {
  constructor(onStep) {
    this.browserProfile = detectAudioBrowser();
    this.context = null;
    this.master = null;
    this.masterStrip = null;
    this.streamInput = null;
    this.transportGain = null;
    this.masterBypassGain = null;
    this.preMasterAnalyser = null;
    this.streamBackend = `${this.browserProfile.label} · native Web Audio`;
    this.streamStats = { peak: 0, rms: 0, gain: 1 };
    this.analyser = null;
    this.strips = new Map();
    this.nativeBuses = new Map();
    this.busCounts = new Map();
    this.samples = new Map();
    this.rawSamples = new Map();
    this.rawSamplePromises = new Map();
    this.decodePromises = new Map();
    this.outputUnlocked = false;
    this.contextGeneration = 0;
    this.timer = null;
    this.schedulerClock = null;
    this.nextStepTime = 0;
    this.absoluteStep = 0;
    this.onStep = onStep;
    this.getProject = null;
    this.lookAhead = 0.12;
    this.interval = 25;
    this.activeVoices = new Map();
    this.previewVoice = null;
    this.maxVoicesPerTrack = 20;
    this.maxVoicesTotal = 72;
    this.maxVoiceCostPerTrack = 84;
    this.maxVoiceCostTotal = 280;
    this.engineQuality = "balanced";
    this.noteIndexCache = new Map();
    this.arrangementIndexCache = { arrangement: null, byTrack: new Map() };
    this.schedulerRecoveries = 0;
    this.schedulerPressure = 0;
    this.uiStepTimers = new Set();
    this.graphResetTimer = null;
    this.processingGraphNeedsReset = false;
    this.maintenanceCounter = 0;
    this.lastSyncedProject = null;
    this.audibleCheckTimer = null;
    this.removeResumeRecovery = null;
  }

  clearScheduledUiTimers() {
    for (const timer of this.uiStepTimers) globalThis.clearTimeout(timer);
    this.uiStepTimers.clear();
  }

  teardownStrip(strip) {
    if (!strip) return;
    try { strip.chorusLfo?.stop(); } catch (_) { /* already stopped */ }
    [
      strip.input,
      strip.feedback,
      strip.delaySend,
      strip.delay,
      strip.chorusSend,
      strip.reverbSend,
      strip.reverbPreDelay,
      strip.fxSum,
      strip.multiband?.wetInput,
      strip.safetyCeiling,
      strip.compatBypass,
      ...(strip.reverbSlots || []).flatMap((slot) => [slot.convolver, slot.tone, slot.wet]),
    ].filter(Boolean).forEach((node) => {
      try { node.disconnect(); } catch (_) { /* disconnected */ }
    });
  }

  rebuildProcessingGraph() {
    if (!this.context) return;
    for (const strip of this.strips.values()) this.teardownStrip(strip);
    teardownNativeMixBuses(this.nativeBuses);
    this.teardownStrip(this.masterStrip);
    this.strips.clear();
    this.masterStrip = createChannelStrip(this.context, this.streamInput || this.context.destination);
    this.master = this.masterStrip.input;
    if (this.masterBypassGain) {
      this.masterBypassGain.gain.setValueAtTime(0, this.context.currentTime);
      this.master.connect(this.masterBypassGain);
    }
    if (this.preMasterAnalyser) this.master.connect(this.preMasterAnalyser);
    this.nativeBuses = createNativeMixBuses(this.context, this.master);
    this.busCounts = new Map();
    this.processingGraphNeedsReset = false;
    this.lastSyncedProject = null;
    if (this.graphResetTimer) globalThis.clearTimeout(this.graphResetTimer);
    if (this.audibleCheckTimer) globalThis.clearTimeout(this.audibleCheckTimer);
    this.graphResetTimer = null;
  }

  queueProcessingGraphReset(delayMs = 90) {
    this.processingGraphNeedsReset = true;
    if (this.graphResetTimer) globalThis.clearTimeout(this.graphResetTimer);
    this.graphResetTimer = globalThis.setTimeout(() => {
      this.graphResetTimer = null;
      if (this.processingGraphNeedsReset) this.rebuildProcessingGraph();
    }, Math.max(20, delayMs));
  }

  configurePerformance(project) {
    const master = project?.master || {};
    const quality = ["economy", "balanced", "production", "studio"].includes(master.engineQuality)
      ? master.engineQuality
      : "production";
    const profiles = {
      economy: { perTrack: 10, total: 40, costTrack: 38, costTotal: 125, lookAhead: 0.18 },
      balanced: { perTrack: 14, total: 56, costTrack: 58, costTotal: 195, lookAhead: 0.16 },
      production: { perTrack: 18, total: 72, costTrack: 78, costTotal: 260, lookAhead: 0.165 },
      studio: { perTrack: 22, total: 88, costTrack: 104, costTotal: 340, lookAhead: 0.175 },
    };
    const profile = profiles[quality];
    const requestedTotal = Math.max(24, Math.min(128, Number(master.maxPolyphony || profile.total)));
    const requestedPerTrack = Math.max(6, Math.min(36, Number(master.trackPolyphony || profile.perTrack)));
    this.engineQuality = quality;
    this.maxVoicesTotal = requestedTotal;
    this.maxVoicesPerTrack = Math.min(requestedPerTrack, requestedTotal);
    this.maxVoiceCostPerTrack = profile.costTrack;
    this.maxVoiceCostTotal = profile.costTotal;
    const configuredLookAhead = Number(master.schedulerLookAheadMs || profile.lookAhead * 1000) / 1000;
    const deviceFloor = compatibleBaseLatency(this.context) * 3 + 0.04;
    const browserFloor = this.browserProfile?.minimumLookAheadSeconds || 0.12;
    this.lookAhead = Math.max(browserFloor, Math.min(0.26, Math.max(configuredLookAhead, deviceFloor)));
    this.interval = Math.max(12, Math.min(30, Number(this.browserProfile?.schedulerIntervalMs || 20)));
  }

  getNotesAtStep(track, step) {
    const notes = track?.notes || [];
    const cached = this.noteIndexCache.get(track.id);
    if (!cached || cached.notes !== notes) {
      const byStep = new Map();
      notes.forEach((note) => {
        const key = Number(note.start) || 0;
        const bucket = byStep.get(key) || [];
        bucket.push(note);
        byStep.set(key, bucket);
      });
      this.noteIndexCache.set(track.id, { notes, byStep });
      return byStep.get(step) || [];
    }
    return cached.byStep.get(step) || [];
  }

  getActiveClip(project, trackId, absoluteStep) {
    const arrangement = project?.arrangement || [];
    if (this.arrangementIndexCache.arrangement !== arrangement) {
      const byTrack = new Map();
      arrangement.forEach((clip) => {
        const bucket = byTrack.get(clip.trackId) || [];
        bucket.push(clip);
        byTrack.set(clip.trackId, bucket);
      });
      for (const clips of byTrack.values()) clips.sort((a, b) => a.startBar - b.startBar);
      this.arrangementIndexCache = { arrangement, byTrack };
    }
    const bar = Math.floor(absoluteStep / 16);
    return (this.arrangementIndexCache.byTrack.get(trackId) || []).find((clip) => (
      bar >= clip.startBar && bar < clip.startBar + clip.lengthBars
    ));
  }


  snapshotActiveVoiceStats(now = this.context?.currentTime || 0) {
    this.cleanupVoices(now);
    const byTrack = new Map();
    let count = 0;
    let cost = 0;
    for (const [trackId, voices] of this.activeVoices.entries()) {
      const trackCost = voices.reduce((sum, voice) => sum + Math.max(1, Number(voice?.cost || 1)), 0);
      byTrack.set(trackId, { count: voices.length, cost: trackCost });
      count += voices.length;
      cost += trackCost;
    }
    return { byTrack, count, cost };
  }

  startSchedulerClock() {
    this.stopSchedulerClock();
    this.schedulerClock = createPrecisionScheduler(() => this.scheduler(), this.interval);
    this.schedulerClock.start();
  }

  stopSchedulerClock() {
    this.schedulerClock?.stop?.();
    this.schedulerClock = null;
    if (this.timer) {
      globalThis.clearInterval(this.timer);
      this.timer = null;
    }
  }

  activeVoiceCost(trackId = null) {
    this.cleanupVoices();
    const costOf = (voices) => voices.reduce((sum, voice) => sum + Math.max(1, Number(voice?.cost || 1)), 0);
    if (trackId) return costOf(this.activeVoices.get(trackId) || []);
    return [...this.activeVoices.values()].reduce((sum, voices) => sum + costOf(voices), 0);
  }

  stealVoice(voices, scheduledTime) {
    if (!voices?.length) return null;
    let candidateIndex = 0;
    let candidateScore = Number.POSITIVE_INFINITY;
    voices.forEach((voice, index) => {
      const age = Math.max(0, scheduledTime - Number(voice?.startedAt || scheduledTime));
      const priority = Math.max(0.001, Number(voice?.priority || 0.5));
      const remaining = Math.max(0, Number(voice?.endTime || scheduledTime) - scheduledTime);
      const score = priority * 4 + remaining * 0.08 - age * 0.04;
      if (score < candidateScore) {
        candidateScore = score;
        candidateIndex = index;
      }
    });
    const [stolen] = voices.splice(candidateIndex, 1);
    stolen?.stop?.(Math.max(this.context.currentTime, scheduledTime - 0.003));
    return stolen;
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
    const incomingCost = Math.max(1, Number(voice.cost || 1));
    while (voices.length >= limit || this.activeVoiceCost(trackId) + incomingCost > this.maxVoiceCostPerTrack) {
      if (!this.stealVoice(voices, scheduledTime)) break;
    }
    while (this.activeVoiceCount() >= this.maxVoicesTotal || this.activeVoiceCost() + incomingCost > this.maxVoiceCostTotal) {
      let selectedTrack = null;
      let selectedVoices = null;
      let selectedScore = Number.POSITIVE_INFINITY;
      for (const [candidateTrack, candidateVoices] of this.activeVoices.entries()) {
        candidateVoices.forEach((candidate) => {
          const score = Math.max(0.001, Number(candidate?.priority || 0.5))
            + Math.max(0, Number(candidate?.endTime || scheduledTime) - scheduledTime) * 0.02;
          if (score < selectedScore) {
            selectedScore = score;
            selectedTrack = candidateTrack;
            selectedVoices = candidateVoices;
          }
        });
      }
      if (!selectedVoices || !this.stealVoice(selectedVoices, scheduledTime)) break;
      if (!selectedVoices.length) this.activeVoices.delete(selectedTrack);
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

  createContext() {
    this.browserProfile = detectAudioBrowser();
    this.context = createCompatibleAudioContext({ latencyHint: "interactive" });
    this.contextGeneration += 1;
    this.outputUnlocked = false;
    this.streamBackend = `${this.browserProfile.label} · native Web Audio`;
    this.streamStats = { peak: 0, rms: 0, gain: 1 };
    this.streamInput = this.context.createGain();
    this.streamInput.gain.value = 1;
    this.transportGain = this.context.createGain();
    this.transportGain.gain.value = 1;
    this.masterBypassGain = this.context.createGain();
    this.masterBypassGain.gain.value = 0;
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.78;
    this.analyser.minDecibels = -96;
    this.analyser.maxDecibels = -8;
    this.preMasterAnalyser = this.context.createAnalyser();
    this.preMasterAnalyser.fftSize = 1024;
    this.preMasterAnalyser.smoothingTimeConstant = 0.72;
    this.streamInput.connect(this.analyser).connect(this.transportGain).connect(this.context.destination);
    this.masterBypassGain.connect(this.streamInput);
    this.masterStrip = createChannelStrip(this.context, this.streamInput);
    this.master = this.masterStrip.input;
    this.master.connect(this.masterBypassGain);
    this.master.connect(this.preMasterAnalyser);
    this.nativeBuses = createNativeMixBuses(this.context, this.master);
    this.busCounts = new Map();
    this.strips.clear();
    this.activeVoices.clear();
    this.noteIndexCache.clear();
    this.arrangementIndexCache = { arrangement: null, byTrack: new Map() };
    this.context.onstatechange = () => {
      if (this.context?.state !== "running") this.outputUnlocked = false;
    };
    this.removeResumeRecovery?.();
    this.removeResumeRecovery = installAudioResumeRecovery(
      () => this.context,
      () => {
        this.outputUnlocked = true;
        this.streamBackend = `${this.browserProfile.label} · native Web Audio`;
      },
    );
    return this.context;
  }


  activateDirectOutputFallback(reason = "silent processed stream") {
    if (!this.context || !this.masterBypassGain || !this.transportGain) return false;
    const now = this.context.currentTime;
    try {
      this.masterBypassGain.gain.cancelScheduledValues(now);
      this.masterBypassGain.gain.setTargetAtTime(0.72, now, 0.018);
      this.transportGain.gain.cancelScheduledValues(now);
      this.transportGain.gain.setTargetAtTime(1, now, 0.008);
    } catch (_) { return false; }
    this.streamBackend = "Native compatibility bypass";
    console.warn(`Native compatibility bypass activated: ${reason}.`);
    return true;
  }

  activateTrackInputFallback(reason = "silent track processing") {
    if (!this.context) return false;
    const now = this.context.currentTime;
    let activated = 0;
    for (const strip of this.strips.values()) {
      if (!strip.compatBypass?.gain) continue;
      try {
        strip.compatBypass.gain.cancelScheduledValues(now);
        strip.compatBypass.gain.setTargetAtTime(0.58, now, 0.018);
        activated += 1;
      } catch (_) { /* disconnected */ }
    }
    if (activated) {
      this.activateDirectOutputFallback(reason);
      this.streamBackend = "Native track + master bypass";
      return true;
    }
    return false;
  }

  readAnalyserPeak(analyser) {
    if (!analyser) return 0;
    const probe = new Float32Array(Math.min(512, analyser.fftSize || 512));
    try { analyser.getFloatTimeDomainData(probe); } catch (_) { return 0; }
    let peak = 0;
    for (let index = 0; index < probe.length; index += 1) peak = Math.max(peak, Math.abs(probe[index]));
    return peak;
  }

  scheduleAudibleOutputCheck(delayMs = 720) {
    if (this.audibleCheckTimer) globalThis.clearTimeout(this.audibleCheckTimer);
    this.audibleCheckTimer = globalThis.setTimeout(() => {
      this.audibleCheckTimer = null;
      if (!this.context || this.context.state !== "running" || !this.analyser) return;
      const active = this.activeVoiceCount();
      if (active <= 0) return;
      const outputPeak = this.readAnalyserPeak(this.analyser);
      if (outputPeak >= 0.000001) return;
      const preMasterPeak = this.readAnalyserPeak(this.preMasterAnalyser);
      if (preMasterPeak >= 0.000001) {
        this.activateDirectOutputFallback("processed master produced no audible signal");
        return;
      }
      this.activateTrackInputFallback("active voices produced no pre-master signal");
    }, Math.max(240, Number(delayMs) || 720));
  }

  getAnalyserNode() {
    return this.analyser;
  }

  getStreamStatus() {
    const peak = Math.max(1e-9, this.readAnalyserPeak(this.analyser));
    const peakDb = peak > 1e-8 ? `${(20 * Math.log10(peak)).toFixed(1)}` : "−∞";
    const load = Math.round(Math.min(100, this.activeVoiceCount() / Math.max(1, this.maxVoicesTotal) * 100));
    return {
      backend: this.streamBackend,
      browser: this.browserProfile?.label || "Web Audio browser",
      contextState: this.context?.state || "not-started",
      sampleRate: this.context?.sampleRate || 0,
      latencyMs: Math.round(compatibleBaseLatency(this.context) * 1000),
      peakDb,
      load,
      buses: Object.fromEntries(this.busCounts || []),
    };
  }

  async unlockOutputGraph() {
    if (!this.context) return false;
    if (this.outputUnlocked && this.context.state === "running") return true;
    const unlocked = await unlockCompatibleAudioContext(this.context, this.context.destination);
    this.outputUnlocked = Boolean(unlocked);
    return this.outputUnlocked;
  }

  async ensure({ unlock = true } = {}) {
    if (!this.context || this.context.state === "closed") this.createContext();
    await resumeCompatibleAudioContext(this.context);
    if (unlock) await this.unlockOutputGraph();
    return this.context;
  }

  async prefetchSample(sample) {
    if (!sample?.url || !sample?.id) return null;
    if (this.rawSamples.has(sample.id)) return this.rawSamples.get(sample.id);
    if (this.rawSamplePromises.has(sample.id)) return this.rawSamplePromises.get(sample.id);
    const pending = fetch(sample.url)
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load ${sample.name || sample.url}`);
        return response.arrayBuffer();
      })
      .then((bytes) => {
        this.rawSamples.set(sample.id, bytes);
        this.rawSamplePromises.delete(sample.id);
        return bytes;
      })
      .catch((error) => {
        this.rawSamplePromises.delete(sample.id);
        throw error;
      });
    this.rawSamplePromises.set(sample.id, pending);
    return pending;
  }

  async loadSample(sample) {
    if (!sample?.url || !sample?.id) return null;
    if (this.samples.has(sample.id)) return this.samples.get(sample.id);
    if (this.decodePromises.has(sample.id)) return this.decodePromises.get(sample.id);
    const pending = (async () => {
      const context = await this.ensure({ unlock: false });
      const bytes = this.rawSamples.get(sample.id) || await this.prefetchSample(sample);
      const decoded = await decodeAudioDataCompat(context, bytes);
      this.samples.set(sample.id, decoded);
      this.decodePromises.delete(sample.id);
      return decoded;
    })().catch((error) => {
      this.decodePromises.delete(sample.id);
      throw error;
    });
    this.decodePromises.set(sample.id, pending);
    return pending;
  }

  async prepareProject(project) {
    await this.ensure({ unlock: true });
    this.sync(project);
    const required = new Map();
    (project?.tracks || []).forEach((track) => {
      if (track.type !== "sampler" || !track.sampleId) return;
      const sample = (project.samples || []).find((entry) => entry.id === track.sampleId);
      if (sample) required.set(sample.id, sample);
    });
    await Promise.allSettled([...required.values()].map((sample) => this.loadSample(sample)));
    (project?.tracks || []).forEach((track) => {
      if (track.type === "synth") resolveTrackPreset(project, track);
    });
    this.sync(project);
    return project;
  }

  sync(project, { prune = true } = {}) {
    if (!this.context) return;
    this.configurePerformance(project);
    const now = this.context.currentTime;
    const soloed = project.tracks.some((track) => track.solo);
    if (prune) {
      const liveTrackIds = new Set(project.tracks.map((track) => track.id));
      for (const [trackId, strip] of this.strips.entries()) {
        if (liveTrackIds.has(trackId)) continue;
        try { strip.chorusLfo?.stop(); } catch (_) { /* already stopped */ }
        try { strip.input?.disconnect(); } catch (_) { /* no-op */ }
        this.strips.delete(trackId);
        this.noteIndexCache.delete(trackId);
        (this.activeVoices.get(trackId) || []).forEach((voice) => voice?.stop?.(now));
        this.activeVoices.delete(trackId);
      }
    }
    if (!this.nativeBuses?.size) this.nativeBuses = createNativeMixBuses(this.context, this.master);
    this.busCounts = updateNativeMixBuses(this.nativeBuses, project, now);
    project.tracks.forEach((track) => {
      const role = inferTrackRole(track);
      let strip = this.strips.get(track.id);
      if (strip && strip.nativeRole !== role) {
        this.teardownStrip(strip);
        this.strips.delete(track.id);
        strip = null;
      }
      if (!strip) {
        const roleDestination = this.nativeBuses.get(role)?.input || this.master;
        strip = createChannelStrip(this.context, roleDestination);
        strip.nativeRole = role;
        strip.compatBypass = this.context.createGain();
        strip.compatBypass.gain.value = 0;
        strip.input.connect(strip.compatBypass).connect(roleDestination);
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
    this.lastSyncedProject = project;
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
        { bpm: previewProject.bpm || 120, voiceGain: 0.72, quality: this.engineQuality },
      );
    }
  }

  async play(getProject, startStep = 0) {
    await this.ensure({ unlock: true });
    if (this.processingGraphNeedsReset) this.rebuildProcessingGraph();
    this.getProject = getProject;
    const project = getProject();
    await this.prepareProject(project);
    if (this.context?.state && this.context.state !== "running") {
      await resumeCompatibleAudioContext(this.context);
    }
    const now = this.context.currentTime;
    if (this.transportGain?.gain) {
      this.transportGain.gain.cancelScheduledValues(now);
      this.transportGain.gain.setTargetAtTime(1, now, 0.006);
    }
    if (this.masterStrip?.inputTrim?.gain) {
      this.masterStrip.parameterCache?.delete?.("input.gain");
      this.masterStrip.inputTrim.gain.cancelScheduledValues(now);
      this.masterStrip.inputTrim.gain.setValueAtTime(1, now);
    }
    if (this.masterBypassGain?.gain && !this.streamBackend.includes("bypass")) {
      this.masterBypassGain.gain.cancelScheduledValues(now);
      this.masterBypassGain.gain.setValueAtTime(0, now);
    }
    for (const strip of this.strips.values()) {
      if (strip.compatBypass?.gain && !this.streamBackend.includes("bypass")) strip.compatBypass.gain.setValueAtTime(0, now);
    }
    this.sync(project);
    this.absoluteStep = Math.max(0, Number(startStep) || 0);
    this.nextStepTime = this.context.currentTime + 0.075;
    this.clearScheduledUiTimers();
    this.startSchedulerClock();
    this.scheduleAudibleOutputCheck();
  }

  pause({ flushVoices = true, resetProcessing = true } = {}) {
    this.stopSchedulerClock();
    this.clearScheduledUiTimers();
    if (this.audibleCheckTimer) globalThis.clearTimeout(this.audibleCheckTimer);
    this.audibleCheckTimer = null;
    const now = this.context?.currentTime || 0;
    if (this.transportGain?.gain) {
      try { this.transportGain.gain.setTargetAtTime(0.00001, now, 0.008); } catch (_) { /* disconnected */ }
    }
    if (flushVoices) this.releaseAllVoices(now);
    if (resetProcessing) this.queueProcessingGraphReset(90);
  }

  stop() {
    this.pause({ flushVoices: true, resetProcessing: true });
    this.absoluteStep = 0;
    this.onStep?.(0);
  }

  scheduler() {
    if (!this.context || !this.getProject) return;
    const project = this.getProject();
    if (this.lastSyncedProject !== project) this.sync(project);
    const stepSeconds = 60 / Math.max(40, project.bpm) / 4;
    if (this.nextStepTime < this.context.currentTime - Math.max(0.08, stepSeconds * 0.75)) {
      const missedSteps = Math.max(1, Math.floor((this.context.currentTime - this.nextStepTime) / stepSeconds));
      this.absoluteStep = (this.absoluteStep + missedSteps) % Math.max(16, project.loopBars * 16);
      this.nextStepTime = this.context.currentTime + 0.025;
      this.schedulerRecoveries += 1;
      this.schedulerPressure = Math.min(1, this.schedulerPressure + 0.2);
    } else {
      this.schedulerPressure *= 0.985;
      if (this.schedulerPressure < 0.002) this.schedulerPressure = 0;
    }
    while (this.nextStepTime < this.context.currentTime + this.lookAhead) {
      this.scheduleStep(project, this.absoluteStep, this.nextStepTime);
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
    const uiTimer = globalThis.setTimeout(() => {
      this.uiStepTimers.delete(uiTimer);
      this.onStep?.(absoluteStep);
    }, Math.max(0, (time - this.context.currentTime) * 1000));
    this.uiStepTimers.add(uiTimer);
    const soloed = project.tracks.some((track) => track.solo);
    applyTimeShaperAtStep(this.masterStrip, project.master || {}, absoluteStep, time, stepSeconds);
    this.maintenanceCounter += 1;
    if (this.maintenanceCounter % 96 === 0) {
      this.cleanupVoices(time);
      const liveTrackIds = new Set(project.tracks.map((track) => track.id));
      for (const trackId of this.noteIndexCache.keys()) {
        if (!liveTrackIds.has(trackId)) this.noteIndexCache.delete(trackId);
      }
    }

    // Gather every note-start across every active track before creating any
    // AudioNodes. The professional multitrack planner then allocates the
    // current realtime voice/cost budget fairly across the whole project.
    const candidates = [];
    // Snapshot the complete voice ledger once. The previous implementation
    // rescanned every active voice twice for every track on every step.
    const activeSnapshot = this.snapshotActiveVoiceStats(time);
    const activeByTrack = activeSnapshot.byTrack;

    project.tracks.forEach((track) => {
      if (track.mute || (soloed && !track.solo)) return;
      const strip = this.strips.get(track.id);
      if (!strip) return;
      applyTimeShaperAtStep(strip, track.effects || {}, absoluteStep, time, stepSeconds);
      const automationValues = collectTrackAutomation(project, track.id, absoluteStep);
      applyAutomationToStrip(strip, automationValues, time);
      const activeClip = this.getActiveClip(project, track.id, absoluteStep);
      if (project.arrangement.length && track.useArrangement !== false && !activeClip) return;
      const patternStep = activeClip
        ? (absoluteStep - activeClip.startBar * 16) % patternSteps
        : localStep;
      const insertPitch = pitchShiftSemitones(track) + Number(track.effects?.pitchShiftFine || 0) / 100;
      const selectedTrack = track.id === project.selectedTrackId;
      const role = inferTrackRole(track);

      if (track.type === "sampler") {
        const sample = project.samples.find((entry) => entry.id === track.sampleId);
        const buffer = this.samples.get(track.sampleId);
        const samplerUsesNotes = track.sequenceMode === "notes"
          || (track.sequenceMode !== "steps" && (track.notes || []).length > 0);

        if (samplerUsesNotes) {
          const noteEvents = selectDenseNoteBatch(this.getNotesAtStep(track, patternStep), 48);
          if (!buffer) {
            if (sample && noteEvents.length) this.loadSample(sample).catch(() => {});
            return;
          }
          noteEvents.forEach((note) => {
            candidates.push({
              kind: "sample-note",
              trackId: track.id,
              track,
              strip,
              buffer,
              note,
              midi: note.midi,
              velocity: note.velocity || 0.8,
              duration: note.duration || 1,
              insertPitch,
              cost: 1,
              selectedTrack,
              solo: Boolean(track.solo),
              role,
            });
          });
          return;
        }

        const velocity = track.steps?.[patternStep % Math.max(1, track.steps?.length || 64)] || 0;
        if (velocity <= 0) return;
        if (!buffer) {
          if (sample) this.loadSample(sample).catch(() => {});
          return;
        }
        candidates.push({
          kind: "sample-step",
          trackId: track.id,
          track,
          strip,
          buffer,
          midi: 60,
          velocity,
          duration: 1,
          insertPitch,
          cost: 1,
          selectedTrack,
          solo: Boolean(track.solo),
          role,
        });
        return;
      }

      const preset = applyAutomationToPatch(resolveTrackPreset(project, track), automationValues);
      const noteEvents = selectDenseNoteBatch(this.getNotesAtStep(track, patternStep), 64);
      noteEvents.forEach((note) => {
        const outputMidi = note.midi + insertPitch;
        candidates.push({
          kind: "synth-note",
          trackId: track.id,
          track,
          strip,
          preset,
          note,
          midi: outputMidi,
          velocity: note.velocity || 0.8,
          duration: note.duration || 1,
          insertPitch,
          cost: estimateSynthVoiceCost(preset, outputMidi, this.engineQuality),
          selectedTrack,
          solo: Boolean(track.solo),
          role,
        });
      });
    });

    const activeCount = activeSnapshot.count;
    const activeCost = activeSnapshot.cost;
    const roleByTrack = new Map(project.tracks.map((track) => [track.id, inferTrackRole(track)]));
    const activeByRole = new Map();
    activeByTrack.forEach((stats, trackId) => {
      const role = roleByTrack.get(trackId) || "samples";
      const current = activeByRole.get(role) || { count: 0, cost: 0 };
      activeByRole.set(role, { count: current.count + stats.count, cost: current.cost + stats.cost });
    });
    const pressureScale = Math.max(0.55, 1 - this.schedulerPressure * 0.45);
    const admitted = planMultitrackStep(candidates, {
      globalVoiceBudget: Math.max(20, Math.floor(this.maxVoicesTotal * pressureScale)),
      globalCostBudget: Math.max(90, this.maxVoiceCostTotal * pressureScale),
      perTrackVoiceBudget: Math.max(6, Math.floor(this.maxVoicesPerTrack * pressureScale)),
      perTrackCostBudget: Math.max(32, this.maxVoiceCostPerTrack * pressureScale),
      activeVoiceCount: activeCount,
      activeVoiceCost: activeCost,
      activeByTrack,
      activeByRole,
      perRoleVoiceBudget: Math.max(10, Math.floor(this.maxVoicesTotal * 0.38 * pressureScale)),
      perRoleCostBudget: Math.max(42, this.maxVoiceCostTotal * 0.4 * pressureScale),
    });
    if (!admitted.length) return;

    const activeTrackCount = new Set(admitted.map((job) => job.trackId)).size;
    const projectHeadroom = multitrackHeadroom(admitted.length, activeCount, activeTrackCount);
    const streamLoad = Math.max(
      activeCount / Math.max(1, this.maxVoicesTotal),
      activeCost / Math.max(1, this.maxVoiceCostTotal),
      admitted.length / Math.max(1, this.maxVoicesTotal * 0.45),
    );
    // Reduce only duplicated oscillator complexity under heavy multitrack load;
    // pitch, timing, envelopes, and all admitted notes remain intact.
    const complexityScale = Math.max(0.3, Math.min(1,
      1 - Math.max(0, activeTrackCount - 3) * 0.06 - streamLoad * 0.38 - this.schedulerPressure * 0.28,
    ));
    admitted.forEach((job) => {
      const activeTrack = activeByTrack.get(job.trackId) || { count: 0, cost: 0 };
      const voiceGain = chordHeadroom(job.trackStackSize, activeTrack.count, job.cost) * projectHeadroom;
      const scheduledTime = time + Number(job.startOffset || 0);
      let voice = null;
      if (job.kind === "synth-note") {
        voice = scheduleSynthVoice(
          this.context,
          job.strip.input,
          job.preset,
          job.midi,
          job.velocity,
          scheduledTime,
          stepSeconds * (job.note.duration || 1),
          {
            bpm: project.bpm,
            noteEnvelope: job.note.envelope,
            voiceGain,
            quality: this.engineQuality,
            complexityScale,
          },
        );
      } else if (job.kind === "sample-note") {
        voice = scheduleSampleVoice(
          this.context,
          job.strip.input,
          job.buffer,
          scheduledTime,
          job.velocity,
          {
            ...job.track,
            voiceGain,
            pitch: (job.track.pitch || 0) + job.insertPitch
              + (job.note.midi - (Number.isInteger(job.note.sliceIndex) ? 60 + job.note.sliceIndex : 60)),
            noteDurationSeconds: stepSeconds * (job.note.duration || 1),
            sliceIndex: Number.isInteger(job.note.sliceIndex) ? job.note.sliceIndex : undefined,
            noteEnvelope: job.note.envelope,
          },
        );
      } else {
        voice = scheduleSampleVoice(
          this.context,
          job.strip.input,
          job.buffer,
          scheduledTime,
          job.velocity,
          {
            ...job.track,
            voiceGain,
            pitch: (job.track.pitch || 0) + job.insertPitch,
          },
        );
      }
      this.registerVoice(job.trackId, voice, scheduledTime);
    });
  }

  async resetAudio(project = null) {
    const currentProject = project || this.getProject?.() || null;
    this.stopSchedulerClock();
    this.clearScheduledUiTimers();
    this.releaseAllVoices(this.context?.currentTime || 0);
    try { await this.context?.close?.(); } catch (_) { /* already closed */ }
    this.context = null;
    this.master = null;
    this.masterStrip = null;
    this.streamInput = null;
    this.transportGain = null;
    this.masterBypassGain = null;
    this.preMasterAnalyser = null;
    this.analyser = null;
    this.strips.clear();
    teardownNativeMixBuses(this.nativeBuses);
    this.nativeBuses = new Map();
    this.outputUnlocked = false;
    this.streamBackend = `${this.browserProfile.label} · native Web Audio`;
    if (currentProject) await this.prepareProject(currentProject);
    else await this.ensure({ unlock: true });
    return this.getStreamStatus();
  }

  destroy() {
    this.stop();
    this.clearScheduledUiTimers();
    if (this.graphResetTimer) globalThis.clearTimeout(this.graphResetTimer);
    this.graphResetTimer = null;
    this.processingGraphNeedsReset = false;
    [...this.strips.values(), this.masterStrip].filter(Boolean).forEach((strip) => {
      try { strip.chorusLfo?.stop(); } catch (_) { /* already stopped */ }
    });
    try { this.context?.close(); } catch (_) { /* no-op */ }
    this.context = null;
    this.master = null;
    this.masterStrip = null;
    try { this.streamInput?.disconnect(); } catch (_) { /* no-op */ }
    try { this.transportGain?.disconnect(); } catch (_) { /* no-op */ }
    try { this.masterBypassGain?.disconnect(); } catch (_) { /* no-op */ }
    try { this.preMasterAnalyser?.disconnect(); } catch (_) { /* no-op */ }
    try { this.analyser?.disconnect(); } catch (_) { /* no-op */ }
    this.streamInput = null;
    this.transportGain = null;
    this.masterBypassGain = null;
    this.preMasterAnalyser = null;
    this.analyser = null;
    this.streamBackend = `${detectAudioBrowser().label} · native Web Audio`;
    this.removeResumeRecovery?.();
    this.removeResumeRecovery = null;
    this.strips.clear();
    teardownNativeMixBuses(this.nativeBuses);
    this.nativeBuses = new Map();
    this.busCounts = new Map();
    this.samples.clear();
    this.rawSamples.clear();
    this.rawSamplePromises.clear();
    this.decodePromises.clear();
    this.outputUnlocked = false;
    this.activeVoices.clear();
    this.noteIndexCache.clear();
    this.arrangementIndexCache = { arrangement: null, byTrack: new Map() };
    this.schedulerPressure = 0;
    this.lastSyncedProject = null;
    this.previewVoice = null;
  }
}
