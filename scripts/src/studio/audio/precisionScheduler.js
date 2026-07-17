/**
 * Runs the Web Audio look-ahead scheduler from a dedicated worker when the
 * browser supports it. Keeping timing ticks off the React/main thread avoids
 * UI painting, piano-roll dragging, and DOM work delaying multitrack audio.
 */
export function createPrecisionScheduler(onTick, intervalMs = 20) {
  let worker = null;
  let workerUrl = null;
  let fallbackTimer = null;
  let running = false;

  const tick = () => {
    if (!running) return;
    try { onTick(); } catch (error) { globalThis.setTimeout(() => { throw error; }, 0); }
  };

  const stop = () => {
    running = false;
    if (worker) {
      try { worker.postMessage({ type: "stop" }); } catch (_) { /* worker already gone */ }
      worker.terminate();
      worker = null;
    }
    if (workerUrl) {
      try { URL.revokeObjectURL(workerUrl); } catch (_) { /* unsupported */ }
      workerUrl = null;
    }
    if (fallbackTimer) {
      globalThis.clearInterval(fallbackTimer);
      fallbackTimer = null;
    }
  };

  const start = () => {
    stop();
    running = true;
    const safeInterval = Math.max(8, Math.min(50, Math.round(Number(intervalMs) || 20)));
    const supportsWorkerClock = typeof Worker !== "undefined"
      && typeof Blob !== "undefined"
      && typeof URL !== "undefined"
      && typeof URL.createObjectURL === "function";

    if (supportsWorkerClock) {
      const source = `
        let timer = null;
        let interval = 20;
        const schedule = () => {
          timer = setTimeout(() => {
            postMessage({ type: 'tick', at: performance.now() });
            schedule();
          }, interval);
        };
        onmessage = (event) => {
          if (event.data?.type === 'start') {
            interval = Math.max(8, Math.min(50, Number(event.data.interval) || 20));
            clearTimeout(timer);
            schedule();
          } else if (event.data?.type === 'stop') {
            clearTimeout(timer);
            timer = null;
          }
        };
      `;
      workerUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
      try {
        worker = new Worker(workerUrl, { name: "musicstudiolab-audio-clock" });
      } catch (_) {
        try { URL.revokeObjectURL(workerUrl); } catch (__) { /* unsupported */ }
        workerUrl = null;
        fallbackTimer = globalThis.setInterval(tick, safeInterval);
        tick();
        return;
      }
      worker.onmessage = (event) => {
        if (event.data?.type === "tick") tick();
      };
      worker.onerror = () => {
        if (!running) return;
        try { worker?.terminate(); } catch (_) { /* no-op */ }
        worker = null;
        fallbackTimer = globalThis.setInterval(tick, safeInterval);
      };
      worker.postMessage({ type: "start", interval: safeInterval });
      tick();
      return;
    }

    fallbackTimer = globalThis.setInterval(tick, safeInterval);
    tick();
  };

  return {
    start,
    stop,
    get running() { return running; },
    get mode() { return worker ? "worker" : "main-thread-fallback"; },
  };
}
