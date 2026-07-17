class MusicStudioStreamGuard extends AudioWorkletProcessor {
  constructor() {
    super();
    this.dcX = [0, 0];
    this.dcY = [0, 0];
    this.gain = 1;
    this.frames = 0;
    this.peak = 0;
    this.sumSquares = 0;
    this.samples = 0;
    this.ceiling = 0.965;
    this.port.onmessage = (event) => {
      if (event.data?.type === "configure") {
        this.ceiling = Math.max(0.75, Math.min(0.995, Number(event.data.ceiling) || 0.965));
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    const frames = output[0]?.length || 128;
    let blockPeak = 0;
    for (let channel = 0; channel < output.length; channel += 1) {
      const source = input[channel] || input[0];
      const target = output[channel];
      if (!target) continue;
      let x1 = this.dcX[channel] || 0;
      let y1 = this.dcY[channel] || 0;
      for (let index = 0; index < target.length; index += 1) {
        const x = source ? source[index] || 0 : 0;
        const dcRemoved = x - x1 + 0.995 * y1;
        x1 = x;
        y1 = dcRemoved;
        blockPeak = Math.max(blockPeak, Math.abs(dcRemoved));
        target[index] = dcRemoved;
      }
      this.dcX[channel] = x1;
      this.dcY[channel] = y1;
    }

    const targetGain = blockPeak > this.ceiling ? this.ceiling / Math.max(blockPeak, 1e-9) : 1;
    const attack = targetGain < this.gain ? 0.52 : 0.006;
    for (let index = 0; index < frames; index += 1) {
      this.gain += (targetGain - this.gain) * attack;
      for (let channel = 0; channel < output.length; channel += 1) {
        const target = output[channel];
        if (!target) continue;
        const sample = target[index] * this.gain;
        target[index] = sample;
        this.peak = Math.max(this.peak, Math.abs(sample));
        this.sumSquares += sample * sample;
        this.samples += 1;
      }
    }

    this.frames += frames;
    if (this.frames >= sampleRate / 8) {
      const rms = Math.sqrt(this.sumSquares / Math.max(1, this.samples));
      this.port.postMessage({
        type: "meter",
        peak: this.peak,
        rms,
        gain: this.gain,
        frames: this.frames,
      });
      this.frames = 0;
      this.peak = 0;
      this.sumSquares = 0;
      this.samples = 0;
    }
    return true;
  }
}

registerProcessor("musicstudio-stream-guard", MusicStudioStreamGuard);
