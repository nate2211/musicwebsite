import WebRenderer from "@elemaudio/web-renderer";
import { buildElementaryMasterGraph, elementaryMasterSettings } from "./elementaryGraph.js";

function signatureOf(settings) {
  return JSON.stringify(settings);
}

/**
 * Optional Elementary Audio insert for the shared stereo master bus.
 *
 * Web Audio exposes one stereo input bus to the AudioWorkletNode. Elementary's
 * el.in({ channel }) nodes then select channel 0 or 1 from that bus. The native
 * output remains audible until a real post-render Web Audio analyser confirms
 * that the Elementary return contains signal.
 */
export class ElementaryRealtimeEngine {
  constructor({ RendererClass = WebRenderer, onSignal = null } = {}) {
    this.RendererClass = RendererClass;
    this.onSignal = onSignal;
    this.core = null;
    this.node = null;
    this.returnAnalyser = null;
    this.outputGain = null;
    this.inputSource = null;
    this.context = null;
    this.destination = null;
    this.initializing = null;
    this.lastSignature = "";
    this.lastStats = null;
    this.meter = { left: -120, right: -120 };
    this.backend = "Elementary unavailable";
    this.renderChain = Promise.resolve();
    this.signalConfirmed = false;
    this.signalProbeTimer = null;
    this.signalProbeBuffer = null;
  }

  async initialize(context, destination) {
    if (this.node && this.context === context) return this.node;
    if (this.initializing) return this.initializing;
    this.context = context;
    this.destination = destination;
    this.initializing = (async () => {
      const core = new this.RendererClass();
      const node = await core.initialize(context, {
        numberOfInputs: 1,
        inputChannelCount: [2],
        numberOfOutputs: 1,
        outputChannelCount: [2],
        channelCount: 2,
        channelCountMode: "explicit",
        channelInterpretation: "speakers",
      }, 60);
      node.channelCount = 2;
      node.channelCountMode = "explicit";
      node.channelInterpretation = "speakers";

      const returnAnalyser = context.createAnalyser();
      returnAnalyser.fftSize = 256;
      returnAnalyser.smoothingTimeConstant = 0;
      const outputGain = context.createGain();
      outputGain.gain.setValueAtTime(0, context.currentTime);
      node.connect(returnAnalyser).connect(outputGain).connect(destination);

      core.on("meter", (event) => {
        const source = String(event?.source || "");
        const value = Number(event?.max ?? event?.value ?? event?.min ?? -120);
        if (source.endsWith(":left")) this.meter.left = value;
        if (source.endsWith(":right")) this.meter.right = value;
      });

      this.core = core;
      this.node = node;
      this.returnAnalyser = returnAnalyser;
      this.outputGain = outputGain;
      this.backend = "Elementary Audio optional stereo DSP";
      this.lastSignature = "";
      this.startSignalProbe();
      return node;
    })().finally(() => { this.initializing = null; });
    return this.initializing;
  }

  startSignalProbe() {
    this.stopSignalProbe();
    if (!this.returnAnalyser) return;
    this.signalProbeBuffer = new Float32Array(this.returnAnalyser.fftSize);
    this.signalProbeTimer = globalThis.setInterval(() => {
      if (!this.returnAnalyser || this.signalConfirmed) return;
      this.returnAnalyser.getFloatTimeDomainData(this.signalProbeBuffer);
      let peak = 0;
      for (let index = 0; index < this.signalProbeBuffer.length; index += 1) {
        peak = Math.max(peak, Math.abs(this.signalProbeBuffer[index]));
      }
      if (peak > 0.00001) {
        this.signalConfirmed = true;
        this.onSignal?.({ source: "post-elementary-return", peak });
      }
    }, 45);
  }

  stopSignalProbe() {
    if (this.signalProbeTimer) globalThis.clearInterval(this.signalProbeTimer);
    this.signalProbeTimer = null;
    this.signalProbeBuffer = null;
  }

  async update(project, { force = false } = {}) {
    if (!this.core) return null;
    const settings = elementaryMasterSettings(project);
    const signature = signatureOf(settings);
    if (!force && signature === this.lastSignature) return this.lastStats;
    const roots = buildElementaryMasterGraph(project);
    this.lastSignature = signature;
    this.renderChain = this.renderChain
      .catch(() => null)
      .then(async () => {
        if (!this.core) return null;
        if (typeof this.core.render !== "function") {
          throw new TypeError("Installed @elemaudio/web-renderer does not expose core.render().");
        }
        this.lastStats = await this.core.render(...roots);
        return this.lastStats;
      });
    return this.renderChain;
  }

  connectInput(source) {
    if (!source || !this.node) return false;
    this.disconnectInput();
    source.connect(this.node);
    this.inputSource = source;
    return true;
  }

  setOutputGain(value, when = this.context?.currentTime || 0, timeConstant = 0.018) {
    const parameter = this.outputGain?.gain;
    if (!parameter) return false;
    const target = Math.max(0, Math.min(1, Number(value) || 0));
    try {
      parameter.cancelScheduledValues(when);
      parameter.setTargetAtTime(target, when, Math.max(0.002, timeConstant));
    } catch (_) {
      parameter.value = target;
    }
    return true;
  }

  reconnectDestination(destination) {
    if (!this.outputGain || !destination) return false;
    try { this.outputGain.disconnect(); } catch (_) { /* already disconnected */ }
    this.outputGain.connect(destination);
    this.destination = destination;
    return true;
  }

  disconnectInput() {
    try { this.inputSource?.disconnect(this.node); } catch (_) { /* already disconnected */ }
    this.inputSource = null;
  }

  disconnect() {
    this.stopSignalProbe();
    this.disconnectInput();
    try { this.node?.disconnect(); } catch (_) { /* already disconnected */ }
    try { this.returnAnalyser?.disconnect(); } catch (_) { /* already disconnected */ }
    try { this.outputGain?.disconnect(); } catch (_) { /* already disconnected */ }
    try { this.core?.reset?.(); } catch (_) { /* renderer already stopped */ }
    this.node = null;
    this.returnAnalyser = null;
    this.outputGain = null;
    this.core = null;
    this.context = null;
    this.destination = null;
    this.lastSignature = "";
    this.lastStats = null;
    this.backend = "Elementary unavailable";
    this.renderChain = Promise.resolve();
    this.signalConfirmed = false;
  }
}
