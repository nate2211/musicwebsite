import { audioBufferToWavBlob } from "./wav.js";

export function normalizeSliceRange(start, end, duration) {
  const safeDuration = Math.max(0.01, Number(duration) || 0.01);
  const safeStart = Math.max(0, Math.min(safeDuration - 0.005, Number(start) || 0));
  const safeEnd = Math.max(safeStart + 0.005, Math.min(safeDuration, Number(end) || safeDuration));
  return { start: safeStart, end: safeEnd };
}

export function createEvenSlices(duration, count = 8, start = 0, end = duration) {
  const range = normalizeSliceRange(start, end, duration);
  const total = Math.max(1, Math.min(64, Math.round(Number(count) || 8)));
  const width = (range.end - range.start) / total;
  return Array.from({ length: total }, (_, index) => ({
    id: `slice-${Date.now().toString(36)}-${index}`,
    name: `Slice ${String(index + 1).padStart(2, "0")}`,
    start: range.start + width * index,
    end: range.start + width * (index + 1),
  }));
}

export function slicesFromCutPoints(duration, cutPoints = [], start = 0, end = duration) {
  const range = normalizeSliceRange(start, end, duration);
  const points = [range.start, ...cutPoints, range.end]
    .map(Number)
    .filter((point) => point > range.start && point < range.end || point === range.start || point === range.end)
    .sort((a, b) => a - b)
    .filter((point, index, list) => index === 0 || Math.abs(point - list[index - 1]) > 0.004);
  return points.slice(0, -1).map((point, index) => ({
    id: `slice-${Date.now().toString(36)}-${index}`,
    name: `Slice ${String(index + 1).padStart(2, "0")}`,
    start: point,
    end: points[index + 1],
  }));
}

export function buildSlicePattern(slices = [], options = {}) {
  const patternSteps = Math.max(16, Math.min(256, Number(options.patternSteps) || 64));
  const spacing = Math.max(1, Math.min(16, Number(options.spacing) || 4));
  const noteLength = Math.max(1, Math.min(16, Number(options.noteLength) || spacing));
  const mode = options.mode || "forward";
  let ordered = [...slices];
  if (mode === "reverse") ordered.reverse();
  if (mode === "bounce" && ordered.length > 2) ordered = [...ordered, ...ordered.slice(1, -1).reverse()];
  if (mode === "random") ordered = [...ordered].sort(() => Math.random() - 0.5);
  if (!ordered.length) return [];

  const notes = [];
  for (let start = 0, index = 0; start < patternSteps; start += spacing, index += 1) {
    const slice = ordered[index % ordered.length];
    const sliceIndex = slices.findIndex((entry) => entry.id === slice.id);
    notes.push({
      id: `note-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      start,
      duration: Math.min(noteLength, patternSteps - start),
      midi: 60 + Math.max(0, sliceIndex),
      velocity: 0.82,
      sliceIndex: Math.max(0, sliceIndex),
    });
  }
  return notes;
}

export async function rasterizeAudioBuffer(context, sourceBuffer, options = {}) {
  const duration = sourceBuffer.duration;
  const range = normalizeSliceRange(options.start ?? 0, options.end ?? duration, duration);
  const startFrame = Math.floor(range.start * sourceBuffer.sampleRate);
  const endFrame = Math.max(startFrame + 1, Math.ceil(range.end * sourceBuffer.sampleRate));
  const frameCount = endFrame - startFrame;
  const rendered = context.createBuffer(sourceBuffer.numberOfChannels, frameCount, sourceBuffer.sampleRate);
  const fadeFrames = Math.min(Math.floor(sourceBuffer.sampleRate * 0.008), Math.floor(frameCount / 4));

  for (let channel = 0; channel < sourceBuffer.numberOfChannels; channel += 1) {
    const source = sourceBuffer.getChannelData(channel);
    const target = rendered.getChannelData(channel);
    for (let frame = 0; frame < frameCount; frame += 1) {
      let gain = 1;
      if (fadeFrames > 0 && frame < fadeFrames) gain = frame / fadeFrames;
      else if (fadeFrames > 0 && frame >= frameCount - fadeFrames) gain = (frameCount - frame - 1) / fadeFrames;
      target[frame] = source[startFrame + frame] * Math.max(0, Math.min(1, gain));
    }
  }
  return audioBufferToWavBlob(rendered);
}

export function computeWaveformPeaks(buffer, buckets = 512) {
  if (!buffer) return [];
  const channelCount = buffer.numberOfChannels;
  const samplesPerBucket = Math.max(1, Math.floor(buffer.length / buckets));
  const peaks = [];
  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const start = bucket * samplesPerBucket;
    const end = Math.min(buffer.length, start + samplesPerBucket);
    let peak = 0;
    for (let channel = 0; channel < channelCount; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let index = start; index < end; index += Math.max(1, Math.floor(samplesPerBucket / 48))) {
        peak = Math.max(peak, Math.abs(data[index] || 0));
      }
    }
    peaks.push(peak);
  }
  return peaks;
}
