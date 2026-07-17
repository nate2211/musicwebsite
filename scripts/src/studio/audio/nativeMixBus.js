import { createStereoWidthStage } from "./effects";
import { safeFrequency, smoothCachedParam } from "./audioSafety";

export const NATIVE_BUS_ROLES = ["drums", "bass", "harmony", "melody", "samples"];

const ROLE_SETTINGS = {
  drums: { volume: 0.94, hp: 20, lp: 19200, low: 0.2, lowHz: 90, mud: -0.4, mudHz: 430, air: 0.3, airHz: 9200, threshold: -15, ratio: 2.7, attack: 0.006, release: 0.12, width: 1.02 },
  bass: { volume: 0.9, hp: 16, lp: 11800, low: 0.5, lowHz: 95, mud: -0.7, mudHz: 310, air: -0.2, airHz: 6800, threshold: -17, ratio: 2.4, attack: 0.018, release: 0.22, width: 0.82 },
  harmony: { volume: 0.84, hp: 42, lp: 17800, low: -0.2, lowHz: 180, mud: -0.9, mudHz: 360, air: 0.45, airHz: 9800, threshold: -18, ratio: 2.05, attack: 0.024, release: 0.28, width: 1.14 },
  melody: { volume: 0.87, hp: 75, lp: 18800, low: -0.3, lowHz: 180, mud: -0.55, mudHz: 2850, air: 0.55, airHz: 10400, threshold: -17, ratio: 1.9, attack: 0.012, release: 0.19, width: 1.08 },
  samples: { volume: 0.87, hp: 24, lp: 18400, low: 0, lowHz: 120, mud: -0.4, mudHz: 520, air: 0.3, airHz: 9400, threshold: -17, ratio: 2.2, attack: 0.014, release: 0.2, width: 1.04 },
};

function median(values = []) {
  if (!values.length) return 60;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export function inferTrackRole(track) {
  if (NATIVE_BUS_ROLES.includes(track?.role)) return track.role;
  const name = String(track?.name || "").toLowerCase();
  if (/kick|snare|hat|clap|perc|drum|rim|tom|cymbal/.test(name)) return "drums";
  if (/808|bass|sub/.test(name)) return "bass";
  if (/lead|melody|flute|whistle|solo|vocal|counter/.test(name)) return "melody";
  if (/pad|chord|choir|piano|keys|harmony|poly|organ|string|brass/.test(name)) return "harmony";
  if (track?.type === "sampler") return "samples";
  const center = median((track?.notes || []).map((note) => Number(note.midi) || 60));
  if (center < 48) return "bass";
  if (center > 72) return "melody";
  return "harmony";
}

function roleVolume(base, count) {
  return base / Math.sqrt(1 + Math.max(0, Number(count || 0) - 1) * 0.14);
}

function createNativeGroupBus(context, destination, role) {
  const input = context.createGain();
  const highpass = context.createBiquadFilter();
  const lowpass = context.createBiquadFilter();
  const low = context.createBiquadFilter();
  const mud = context.createBiquadFilter();
  const air = context.createBiquadFilter();
  const compressor = context.createDynamicsCompressor();
  const width = createStereoWidthStage(context);
  const gain = context.createGain();
  const ceiling = context.createDynamicsCompressor();
  highpass.type = "highpass";
  lowpass.type = "lowpass";
  low.type = "lowshelf";
  mud.type = "peaking";
  mud.Q.value = 0.78;
  air.type = "highshelf";
  ceiling.threshold.value = -2.4;
  ceiling.knee.value = 2;
  ceiling.ratio.value = 10;
  ceiling.attack.value = 0.003;
  ceiling.release.value = 0.12;
  input.connect(highpass).connect(lowpass).connect(low).connect(mud).connect(air).connect(compressor).connect(width.input);
  width.output.connect(gain).connect(ceiling).connect(destination);
  return {
    nativeRole: role,
    input,
    highpass,
    lowpass,
    low,
    mud,
    air,
    compressor,
    widthStage: width,
    gain,
    ceiling,
    parameterCache: new Map(),
    destroy() {
      [input, highpass, lowpass, low, mud, air, compressor, width.input, width.output, gain, ceiling].forEach((node) => {
        try { node.disconnect(); } catch (_) { /* already disconnected */ }
      });
    },
  };
}

function updateNativeGroupBus(strip, count, time = 0) {
  const context = strip.input.context;
  const settings = ROLE_SETTINGS[strip.nativeRole] || ROLE_SETTINGS.samples;
  const when = Math.max(context.currentTime, Number(time) || context.currentTime);
  const set = (key, param, value, constant = 0.04, tolerance = 0.0001) => smoothCachedParam(strip, key, param, value, when, constant, tolerance);
  set("hp", strip.highpass.frequency, safeFrequency(context, settings.hp, 10, 0.45), 0.05, 0.5);
  set("lp", strip.lowpass.frequency, safeFrequency(context, settings.lp, 300, 0.45), 0.05, 0.5);
  set("low.hz", strip.low.frequency, settings.lowHz, 0.05, 0.5);
  set("low.gain", strip.low.gain, settings.low, 0.04);
  set("mud.hz", strip.mud.frequency, settings.mudHz, 0.05, 0.5);
  set("mud.gain", strip.mud.gain, settings.mud, 0.04);
  set("air.hz", strip.air.frequency, safeFrequency(context, settings.airHz, 1200, 0.4), 0.05, 0.5);
  set("air.gain", strip.air.gain, settings.air, 0.04);
  set("comp.threshold", strip.compressor.threshold, settings.threshold, 0.05);
  set("comp.ratio", strip.compressor.ratio, settings.ratio, 0.05);
  set("comp.knee", strip.compressor.knee, 14, 0.05);
  set("comp.attack", strip.compressor.attack, settings.attack, 0.05);
  set("comp.release", strip.compressor.release, settings.release, 0.06);
  set("gain", strip.gain.gain, count > 0 ? roleVolume(settings.volume, count) : 0.00001, 0.045);
  strip.widthStage.setWidth(settings.width, when);
}

export function createNativeMixBuses(context, destination) {
  return new Map(NATIVE_BUS_ROLES.map((role) => [role, createNativeGroupBus(context, destination, role)]));
}

export function updateNativeMixBuses(buses, project, time = 0) {
  const counts = new Map(NATIVE_BUS_ROLES.map((role) => [role, 0]));
  const soloed = (project?.tracks || []).some((track) => track.solo);
  (project?.tracks || []).forEach((track) => {
    if (track.mute || (soloed && !track.solo)) return;
    const role = inferTrackRole(track);
    counts.set(role, (counts.get(role) || 0) + 1);
  });
  NATIVE_BUS_ROLES.forEach((role) => updateNativeGroupBus(buses.get(role), counts.get(role) || 0, time));
  return counts;
}

export function teardownNativeMixBuses(buses) {
  if (!buses) return;
  for (const strip of buses.values()) strip?.destroy?.();
  buses.clear();
}
