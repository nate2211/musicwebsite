import { el } from "@elemaudio/core";

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Number(value) || 0));
const dbToGain = (db) => 10 ** (Number(db || 0) / 20);

function keyedValue(key, value, smoothingSeconds = 0.025) {
  const source = el.const({ key, value: Number(value) || 0 });
  if (smoothingSeconds <= 0) return source;
  return el.smooth(el.tau2pole(smoothingSeconds), source);
}

function panGains(pan = 0) {
  const normalized = clamp(pan, -1, 1);
  const angle = (normalized + 1) * Math.PI * 0.25;
  return { left: Math.cos(angle), right: Math.sin(angle) };
}

/**
 * Converts the existing project master state into a stable, bounded set of
 * Elementary parameters. The graph shape never changes when controls move;
 * only keyed constants are reconciled by Elementary.
 */
export function elementaryMasterSettings(projectOrMaster = {}) {
  const project = projectOrMaster?.master ? projectOrMaster : { master: projectOrMaster };
  const master = project.master || {};
  const volume = clamp(project.masterVolume ?? master.outputGain ?? 0.82, 0, 1.25);
  const ceilingDb = clamp(master.limiterCeiling ?? master.renderCeiling ?? -1, -12, -0.1);
  const pan = clamp(master.stereoPan ?? 0, -1, 1);
  const width = clamp(master.stereoEnabled === false ? 1 : (master.stereoWidth ?? 1), 0, 1.6);
  const inputGain = clamp(master.inputGain ?? 1, 0, 2);
  const clipDrive = clamp(master.saturationEnabled === false ? 0 : (master.clipDrive ?? 0.035), 0, 1);
  const compEnabled = master.compEnabled !== false;
  const eqEnabled = master.eqEnabled !== false;

  return {
    inputGain,
    outputGain: volume * dbToGain(ceilingDb),
    lowGain: eqEnabled ? clamp(master.lowGain ?? 0.45, -9, 9) : 0,
    lowFrequency: clamp(master.lowFrequency ?? 145, 50, 480),
    mudGain: eqEnabled ? clamp((master.midGain ?? -0.9) * 0.72, -8, 5) : 0,
    mudFrequency: clamp(master.midFrequency ? Math.min(master.midFrequency, 900) : 330, 180, 900),
    presenceGain: eqEnabled ? clamp((master.midGain ?? -0.9) * 0.28, -4, 3) : 0,
    presenceFrequency: clamp(master.midFrequency ?? 3250, 1400, 5200),
    airGain: eqEnabled ? clamp(master.highGain ?? 0.42, -6, 5) : 0,
    airFrequency: clamp(master.highFrequency ?? 9800, 6500, 14500),
    highpass: clamp(master.highpass ?? 24, 10, 120),
    lowpass: clamp(master.lowpass ?? 19500, 8000, 22000),
    compAttackMs: clamp((master.compAttack ?? 0.02) * 1000, 1, 160),
    compReleaseMs: clamp((master.compRelease ?? 0.26) * 1000, 30, 1200),
    compThreshold: compEnabled ? clamp(master.compThreshold ?? -12, -36, 0) : 0,
    compRatio: compEnabled ? clamp(master.compRatio ?? 2, 1, 12) : 1,
    compKnee: compEnabled ? clamp(master.compKnee ?? 12, 0, 30) : 0,
    makeupGain: compEnabled ? clamp(master.makeupGain ?? 1, 0.5, 2) : 1,
    drive: 1 + clipDrive * 1.75,
    width,
    pan,
    ceilingDb,
  };
}

function buildChannel(key, signal, settings, sidechain) {
  let output = el.mul(signal, keyedValue(`${key}:input-gain`, settings.inputGain));
  output = el.highpass(keyedValue(`${key}:highpass`, settings.highpass), 0.707, output);
  output = el.lowshelf(
    keyedValue(`${key}:low-frequency`, settings.lowFrequency),
    0.72,
    keyedValue(`${key}:low-gain`, settings.lowGain),
    output,
  );
  output = el.peak(
    keyedValue(`${key}:mud-frequency`, settings.mudFrequency),
    0.82,
    keyedValue(`${key}:mud-gain`, settings.mudGain),
    output,
  );
  output = el.peak(
    keyedValue(`${key}:presence-frequency`, settings.presenceFrequency),
    0.72,
    keyedValue(`${key}:presence-gain`, settings.presenceGain),
    output,
  );
  output = el.highshelf(
    keyedValue(`${key}:air-frequency`, settings.airFrequency),
    0.68,
    keyedValue(`${key}:air-gain`, settings.airGain),
    output,
  );
  output = el.lowpass(keyedValue(`${key}:lowpass`, settings.lowpass), 0.707, output);
  output = el.skcompress(
    keyedValue(`${key}:comp-attack`, settings.compAttackMs),
    keyedValue(`${key}:comp-release`, settings.compReleaseMs),
    keyedValue(`${key}:comp-threshold`, settings.compThreshold),
    keyedValue(`${key}:comp-ratio`, settings.compRatio),
    keyedValue(`${key}:comp-knee`, settings.compKnee),
    sidechain,
    output,
  );
  output = el.mul(output, keyedValue(`${key}:makeup`, settings.makeupGain));
  return output;
}

/**
 * Stable stereo master graph used by both the browser renderer and the
 * offline renderer. Inputs are expected to be a stereo interleaved WebAudio
 * input exposed as Elementary channels 0 and 1.
 */
export function buildElementaryMasterGraph(settingsInput = {}, prefix = "musicstudio-master") {
  const settings = elementaryMasterSettings(settingsInput);
  const inputLeft = el.in({ key: `${prefix}:input-left`, channel: 0 });
  const inputRight = el.in({ key: `${prefix}:input-right`, channel: 1 });
  const linkedDetector = el.mul(0.5, el.add(el.abs(inputLeft), el.abs(inputRight)));

  let left = buildChannel(`${prefix}:left`, inputLeft, settings, linkedDetector);
  let right = buildChannel(`${prefix}:right`, inputRight, settings, linkedDetector);

  const mid = el.mul(0.5, el.add(left, right));
  const side = el.mul(0.5, el.sub(left, right));
  const width = keyedValue(`${prefix}:stereo-width`, settings.width);
  left = el.add(mid, el.mul(side, width));
  right = el.sub(mid, el.mul(side, width));

  const gains = panGains(settings.pan);
  left = el.mul(left, keyedValue(`${prefix}:pan-left`, gains.left));
  right = el.mul(right, keyedValue(`${prefix}:pan-right`, gains.right));

  // A gentle normalized tanh stage catches isolated peaks without the hard
  // discontinuity that creates clicks or brittle upper harmonics.
  const drive = keyedValue(`${prefix}:drive`, settings.drive);
  const normalization = Math.max(0.0001, Math.tanh(settings.drive));
  left = el.div(el.tanh(el.mul(left, drive)), normalization);
  right = el.div(el.tanh(el.mul(right, drive)), normalization);

  const outputGain = keyedValue(`${prefix}:output-gain`, settings.outputGain, 0.035);
  left = el.dcblock(el.mul(left, outputGain));
  right = el.dcblock(el.mul(right, outputGain));

  return [
    el.meter({ key: `${prefix}:meter-left`, name: `${prefix}:left` }, left),
    el.meter({ key: `${prefix}:meter-right`, name: `${prefix}:right` }, right),
  ];
}
