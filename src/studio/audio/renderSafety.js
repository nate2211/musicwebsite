import { clampFinite } from "./audioSafety.js";

const dbToGain = (db) => 10 ** (db / 20);

function softLimitSample(sample, ceiling) {
  const sign = sample < 0 ? -1 : 1;
  const magnitude = Math.abs(sample);
  const knee = ceiling * 0.78;
  if (magnitude <= knee) return sample;
  const room = Math.max(0.000001, ceiling - knee);
  const compressed = knee + room * (1 - Math.exp(-(magnitude - knee) / room));
  return sign * Math.min(ceiling, compressed);
}

function removeDcInPlace(channels) {
  channels.forEach((data) => {
    let mean = 0;
    for (let i = 0; i < data.length; i += 1) mean += data[i];
    mean /= Math.max(1, data.length);
    let previousInput = 0;
    let previousOutput = 0;
    const coefficient = 0.995;
    for (let i = 0; i < data.length; i += 1) {
      const input = data[i] - mean;
      const output = input - previousInput + coefficient * previousOutput;
      data[i] = output;
      previousInput = input;
      previousOutput = output;
    }
  });
}

function linkedPeakAt(channels, index) {
  let peak = 0;
  for (let channel = 0; channel < channels.length; channel += 1) {
    peak = Math.max(peak, Math.abs(channels[channel][index] || 0));
  }
  return peak;
}

/**
 * Offline safety mastering with a linked-stereo look-ahead envelope. It does
 * not chase loudness; it only removes DC, catches inter-sample-risk peaks,
 * and applies a transparent ceiling so any legal piano-roll combination can
 * be exported without integer clipping.
 */
export function finalizeRenderedBuffer(buffer, options = {}) {
  const ceilingDb = clampFinite(options.ceilingDb ?? -1, -6, -0.1, -1);
  const ceiling = dbToGain(ceilingDb);
  const lookAheadMs = clampFinite(options.lookAheadMs ?? 6, 1, 20, 6);
  const releaseMs = clampFinite(options.releaseMs ?? 140, 40, 600, 140);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel));
  const length = buffer.length;
  const lookAhead = Math.max(1, Math.round(buffer.sampleRate * lookAheadMs / 1000));
  const releaseCoefficient = Math.exp(-1 / Math.max(1, buffer.sampleRate * releaseMs / 1000));
  const conservativeTruePeakFactor = 1.075;

  removeDcInPlace(channels);

  const rawPeaks = new Float32Array(length);
  const peakWindow = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    rawPeaks[index] = linkedPeakAt(channels, index) * conservativeTruePeakFactor;
  }
  const deque = new Int32Array(Math.max(1, length));
  let head = 0;
  let tail = 0;
  for (let index = length - 1; index >= 0; index -= 1) {
    const peak = rawPeaks[index];
    while (tail > head && rawPeaks[deque[tail - 1]] <= peak) tail -= 1;
    deque[tail] = index;
    tail += 1;
    const furthest = index + lookAhead;
    while (tail > head && deque[head] > furthest) head += 1;
    peakWindow[index] = tail > head ? rawPeaks[deque[head]] : peak;
  }

  let gain = 1;
  let inputPeak = 0;
  let outputPeak = 0;
  let minimumGain = 1;
  let gainReductionSamples = 0;

  for (let index = 0; index < length; index += 1) {
    const rawPeak = linkedPeakAt(channels, index);
    inputPeak = Math.max(inputPeak, rawPeak);
    const futurePeak = Math.max(rawPeak, peakWindow[index] || 0);
    const targetGain = futurePeak > ceiling ? ceiling / futurePeak : 1;
    if (targetGain < gain) gain = targetGain;
    else gain = targetGain + (gain - targetGain) * releaseCoefficient;
    minimumGain = Math.min(minimumGain, gain);
    if (gain < 0.9995) gainReductionSamples += 1;

    for (let channel = 0; channel < channels.length; channel += 1) {
      const limited = softLimitSample(channels[channel][index] * gain, ceiling);
      channels[channel][index] = limited;
      outputPeak = Math.max(outputPeak, Math.abs(limited));
    }
  }

  return {
    ceilingDb,
    inputPeak,
    outputPeak,
    minimumGain,
    gainReductionPercent: (gainReductionSamples / Math.max(1, length)) * 100,
  };
}
