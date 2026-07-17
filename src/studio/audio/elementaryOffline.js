import OfflineRenderer from "@elemaudio/offline-renderer";
import { buildElementaryMasterGraph } from "./elementaryGraph";

/**
 * Runs the completed stereo mix through the same Elementary master graph used
 * in realtime. This mutates the AudioBuffer channels in place and returns
 * graph/process statistics for release validation and debugging.
 */
export async function processBufferWithElementary(audioBuffer, project) {
  if (!audioBuffer || audioBuffer.numberOfChannels < 1) return null;
  const length = audioBuffer.length;
  const leftInput = new Float32Array(audioBuffer.getChannelData(0));
  const rightInput = audioBuffer.numberOfChannels > 1
    ? new Float32Array(audioBuffer.getChannelData(1))
    : new Float32Array(leftInput);
  const leftOutput = new Float32Array(length);
  const rightOutput = new Float32Array(length);

  const core = new OfflineRenderer();
  await core.initialize({
    numInputChannels: 2,
    numOutputChannels: 2,
    sampleRate: audioBuffer.sampleRate,
    blockSize: 128,
  });
  const graphStats = await core.render(...buildElementaryMasterGraph(project, "musicstudio-offline-master"));
  core.process([leftInput, rightInput], [leftOutput, rightOutput]);
  audioBuffer.getChannelData(0).set(leftOutput);
  if (audioBuffer.numberOfChannels > 1) audioBuffer.getChannelData(1).set(rightOutput);
  core.reset();
  return { graphStats, frames: length, sampleRate: audioBuffer.sampleRate };
}
