const RUNNING_STATES = new Set(["running"]);
const RESUMABLE_STATES = new Set(["suspended", "interrupted"]);

function userAgentString() {
  if (typeof navigator === "undefined") return "";
  return String(navigator.userAgent || "").toLowerCase();
}

export function detectAudioBrowser(userAgent = userAgentString()) {
  const ua = String(userAgent || "").toLowerCase();
  const firefox = /firefox|fxios/.test(ua);
  const edge = /edg\//.test(ua);
  const chromium = !firefox && /chrome|chromium|crios|edg\//.test(ua);
  const chrome = chromium && !edge;
  const label = firefox ? "Mozilla Firefox" : chrome ? "Google Chrome" : edge ? "Microsoft Edge" : chromium ? "Chromium" : "Web Audio browser";
  return {
    firefox,
    chrome,
    edge,
    chromium,
    label,
    schedulerIntervalMs: firefox ? 20 : 16,
    minimumLookAheadSeconds: firefox ? 0.145 : 0.115,
    resumeTimeoutMs: firefox ? 700 : 450,
  };
}

export function getAudioContextConstructor(scope = globalThis) {
  return scope?.AudioContext || scope?.webkitAudioContext || null;
}

function configureContextDestination(context) {
  try { context.destination.channelInterpretation = "speakers"; } catch (_) { /* read-only in some browsers */ }
  try { context.destination.channelCountMode = "explicit"; } catch (_) { /* read-only in some browsers */ }
  return context;
}

export function createCompatibleAudioContext(options = {}) {
  const Context = getAudioContextConstructor();
  if (!Context) throw new Error("Web Audio is not supported in this browser.");
  const requestedLatency = options.latencyHint || "interactive";
  const attempts = [
    { latencyHint: requestedLatency },
    { latencyHint: "interactive" },
    undefined,
  ];
  let lastError = null;
  for (const settings of attempts) {
    try {
      const context = settings ? new Context(settings) : new Context();
      return configureContextDestination(context);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("The browser could not create an AudioContext.");
}

function waitForContextState(context, desiredState = "running", timeoutMs = 500) {
  if (!context || context.state === desiredState) return Promise.resolve(context?.state || "closed");
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      globalThis.clearTimeout(timer);
      try { context.removeEventListener?.("statechange", check); } catch (_) { /* no-op */ }
      resolve(context.state);
    };
    const check = () => {
      if (context.state === desiredState || context.state === "closed") finish();
    };
    const timer = globalThis.setTimeout(finish, Math.max(50, timeoutMs));
    try { context.addEventListener?.("statechange", check); } catch (_) { /* onstatechange-only implementation */ }
  });
}

export async function resumeCompatibleAudioContext(context, { timeoutMs } = {}) {
  if (!context) throw new Error("AudioContext is not initialized.");
  if (context.state === "closed") throw new Error("AudioContext is closed.");
  if (RUNNING_STATES.has(context.state)) return context;
  const profile = detectAudioBrowser();
  const waitMs = Number(timeoutMs) || profile.resumeTimeoutMs;
  if (RESUMABLE_STATES.has(context.state) || context.state !== "running") {
    try { await context.resume(); } catch (_) { /* a user gesture retry below may recover */ }
  }
  await waitForContextState(context, "running", waitMs);
  if (!RUNNING_STATES.has(context.state)) {
    try { await context.resume(); } catch (_) { /* preserve the useful state error below */ }
    await waitForContextState(context, "running", Math.max(120, waitMs / 2));
  }
  if (!RUNNING_STATES.has(context.state)) {
    throw new Error(`${profile.label} kept the audio context ${context.state}. Press Play again or use Reset audio.`);
  }
  return context;
}

export async function unlockCompatibleAudioContext(context, destination = context?.destination) {
  await resumeCompatibleAudioContext(context);
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(220, now);
  gain.gain.setValueAtTime(0.000001, now);
  gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.000001, now + 0.012);
  oscillator.connect(gain).connect(destination || context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.014);
  oscillator.onended = () => {
    try { oscillator.disconnect(); } catch (_) { /* no-op */ }
    try { gain.disconnect(); } catch (_) { /* no-op */ }
  };
  await resumeCompatibleAudioContext(context);
  return context.state === "running";
}

export function decodeAudioDataCompat(context, arrayBuffer) {
  if (!context?.decodeAudioData) return Promise.reject(new Error("Audio decoding is not supported in this browser."));
  const bytes = arrayBuffer?.slice ? arrayBuffer.slice(0) : arrayBuffer;
  return new Promise((resolve, reject) => {
    let settled = false;
    const success = (buffer) => {
      if (settled) return;
      settled = true;
      resolve(buffer);
    };
    const failure = (error) => {
      if (settled) return;
      settled = true;
      reject(error || new Error("The browser could not decode this audio file."));
    };
    try {
      const result = context.decodeAudioData(bytes, success, failure);
      if (result && typeof result.then === "function") result.then(success, failure);
    } catch (error) {
      failure(error);
    }
  });
}

function makePanShim(panner) {
  let current = 0;
  const apply = (value, time, method = "setValueAtTime", timeConstant = 0.01) => {
    current = Math.max(-1, Math.min(1, Number(value) || 0));
    if (panner.positionX && typeof panner.positionX[method] === "function") {
      panner.positionX[method](current, time, timeConstant);
      if (panner.positionZ && typeof panner.positionZ[method] === "function") {
        panner.positionZ[method](Math.max(0.01, 1 - Math.abs(current) * 0.22), time, timeConstant);
      }
    } else if (typeof panner.setPosition === "function") {
      panner.setPosition(current, 0, Math.max(0.01, 1 - Math.abs(current) * 0.22));
    }
  };
  return {
    get value() { return current; },
    set value(value) { apply(value, 0); },
    setValueAtTime(value, time) { apply(value, time); },
    setTargetAtTime(value, time, timeConstant) { apply(value, time, "setTargetAtTime", timeConstant); },
    linearRampToValueAtTime(value, time) { apply(value, time, "linearRampToValueAtTime"); },
    exponentialRampToValueAtTime(value, time) { apply(value, time, "linearRampToValueAtTime"); },
    cancelScheduledValues(time) {
      panner.positionX?.cancelScheduledValues?.(time);
      panner.positionZ?.cancelScheduledValues?.(time);
    },
    cancelAndHoldAtTime(time) {
      if (panner.positionX?.cancelAndHoldAtTime) panner.positionX.cancelAndHoldAtTime(time);
      else this.cancelScheduledValues(time);
    },
  };
}

export function createStereoPannerCompat(context) {
  if (typeof context?.createStereoPanner === "function") {
    const panner = context.createStereoPanner();
    try { panner.channelInterpretation = "speakers"; } catch (_) { /* no-op */ }
    return panner;
  }
  if (typeof context?.createPanner === "function") {
    const panner = context.createPanner();
    panner.panningModel = "equalpower";
    panner.distanceModel = "inverse";
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 0;
    Object.defineProperty(panner, "pan", { configurable: true, enumerable: true, value: makePanShim(panner) });
    return panner;
  }
  const passthrough = context.createGain();
  Object.defineProperty(passthrough, "pan", { configurable: true, enumerable: true, value: makePanShim({}) });
  return passthrough;
}

export function compatibleBaseLatency(context) {
  const profile = detectAudioBrowser();
  const base = Number(context?.baseLatency);
  const output = Number(context?.outputLatency);
  if (Number.isFinite(base) && base > 0) return base + (Number.isFinite(output) && output > 0 ? output * 0.35 : 0);
  return profile.firefox ? 0.022 : 0.012;
}

export function installAudioResumeRecovery(getContext, onRecovered = () => {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  let recovering = false;
  const recover = async () => {
    const context = getContext?.();
    if (!context || context.state === "running" || context.state === "closed" || recovering) return;
    recovering = true;
    try {
      await resumeCompatibleAudioContext(context);
      onRecovered(context);
    } catch (_) {
      // Autoplay policy may require another explicit user interaction.
    } finally {
      recovering = false;
    }
  };
  const gestureOptions = { capture: true, passive: true };
  window.addEventListener("pointerdown", recover, gestureOptions);
  window.addEventListener("touchend", recover, gestureOptions);
  window.addEventListener("keydown", recover, true);
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") recover();
  };
  window.addEventListener("pageshow", recover);
  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    window.removeEventListener("pointerdown", recover, true);
    window.removeEventListener("touchend", recover, true);
    window.removeEventListener("keydown", recover, true);
    window.removeEventListener("pageshow", recover);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
