const periodicWaveCache = new WeakMap();
const noiseCache = new WeakMap();

const HARMONICS = {
  warmSaw: {
    real: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    imag: [0, 1, 0.42, 0.31, 0.2, 0.15, 0.1, 0.08, 0.06, 0.045, 0.035, 0.028, 0.02, 0.015, 0.01, 0.008],
  },
  organ: {
    real: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    imag: [0, 1, 0.12, 0.52, 0.08, 0.34, 0.03, 0.18, 0.02, 0.12, 0.01, 0.08],
  },
  hollow: {
    real: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    imag: [0, 1, 0, 0.35, 0, 0.2, 0, 0.12, 0, 0.08, 0, 0.05],
  },
  digital: {
    real: [0, 0, 0.15, 0, -0.12, 0, 0.09, 0, -0.07, 0, 0.05, 0, -0.03],
    imag: [0, 1, 0.08, 0.32, 0.04, 0.18, 0.03, 0.12, 0.02, 0.08, 0.01, 0.05, 0.01],
  },
  metallic: {
    real: [0, 0, 0.3, -0.12, 0, 0.22, -0.1, 0, 0.16, -0.08, 0, 0.12, -0.06, 0, 0.08],
    imag: [0, 1, 0, 0.2, -0.16, 0, 0.13, -0.1, 0, 0.08, -0.07, 0, 0.05, -0.04, 0],
  },
  vowel: {
    real: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    imag: [0, 1, 0.18, 0.08, 0.42, 0.16, 0.06, 0.31, 0.12, 0.05, 0.2, 0.08, 0.03, 0.12, 0.05, 0.02],
  },
  cinematic: {
    real: [0, 0, 0.06, 0, -0.04, 0, 0.025, 0, -0.018, 0, 0.012, 0, -0.008, 0, 0.005, 0],
    imag: [0, 1, 0.52, 0.34, 0.24, 0.17, 0.13, 0.1, 0.078, 0.06, 0.046, 0.035, 0.026, 0.019, 0.014, 0.01],
  },
  choir: {
    real: [0, 0, 0, 0.03, 0, -0.02, 0, 0.012, 0, -0.008, 0, 0.005, 0, 0, 0, 0],
    imag: [0, 1, 0.08, 0.18, 0.48, 0.12, 0.07, 0.34, 0.15, 0.06, 0.24, 0.1, 0.045, 0.16, 0.07, 0.03],
  },
  bowed: {
    real: [0, 0, 0.04, 0.02, 0, -0.012, 0, 0.008, 0, -0.005, 0, 0.003, 0, 0, 0, 0],
    imag: [0, 1, 0.68, 0.42, 0.3, 0.22, 0.16, 0.12, 0.09, 0.067, 0.05, 0.038, 0.028, 0.02, 0.014, 0.01],
  },
  glass: {
    real: [0, 0, 0.22, 0, -0.16, 0, 0.11, 0, -0.075, 0, 0.05, 0, -0.032, 0, 0.02, 0],
    imag: [0, 1, 0.02, 0.44, 0.01, 0.3, 0.01, 0.2, 0.005, 0.13, 0.004, 0.085, 0.003, 0.055, 0.002, 0.035],
  },
  air: {
    real: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    imag: [0, 1, 0.05, 0.018, 0.012, 0.008, 0.006, 0.0045, 0.0035, 0.0028, 0.0022, 0.0018, 0.0014, 0.0011, 0.0009, 0.0007],
  },
  shimmer: {
    real: [0, 0, 0.18, 0, 0.12, 0, 0.08, 0, 0.055, 0, 0.038, 0, 0.026, 0, 0.018, 0],
    imag: [0, 1, 0.04, 0.2, 0.025, 0.15, 0.018, 0.11, 0.013, 0.08, 0.009, 0.058, 0.006, 0.04, 0.004, 0.028],
  },
  formant: {
    real: [0, 0, 0.03, 0, 0.1, 0, 0.02, 0.06, 0, 0.04, 0, 0.025, 0, 0.015, 0, 0.01],
    imag: [0, 1, 0.12, 0.04, 0.56, 0.18, 0.05, 0.4, 0.14, 0.04, 0.28, 0.1, 0.035, 0.19, 0.07, 0.025],
  },
  spectral: {
    real: [0, 0, 0.26, -0.09, 0.17, -0.06, 0.11, -0.04, 0.075, -0.028, 0.05, -0.02, 0.034, -0.014, 0.022, -0.01],
    imag: [0, 1, 0.16, 0.3, 0.12, 0.22, 0.09, 0.16, 0.065, 0.12, 0.047, 0.086, 0.034, 0.062, 0.024, 0.044],
  },
  pulse25: {
    real: Array(32).fill(0),
    imag: Array.from({ length: 32 }, (_, n) => {
      if (n === 0) return 0;
      return (2 / (n * Math.PI)) * Math.sin(n * Math.PI * 0.25);
    }),
  },
  pulse12: {
    real: Array(32).fill(0),
    imag: Array.from({ length: 32 }, (_, n) => {
      if (n === 0) return 0;
      return (2 / (n * Math.PI)) * Math.sin(n * Math.PI * 0.125);
    }),
  },
};

export function applyWaveform(context, oscillator, waveform = "sawtooth") {
  if (["sine", "triangle", "sawtooth", "square"].includes(waveform)) {
    oscillator.type = waveform;
    return;
  }

  let contextCache = periodicWaveCache.get(context);
  if (!contextCache) {
    contextCache = new Map();
    periodicWaveCache.set(context, contextCache);
  }
  if (!contextCache.has(waveform)) {
    const harmonic = HARMONICS[waveform] || HARMONICS.warmSaw;
    contextCache.set(
      waveform,
      context.createPeriodicWave(
        Float32Array.from(harmonic.real),
        Float32Array.from(harmonic.imag),
        { disableNormalization: false },
      ),
    );
  }
  oscillator.setPeriodicWave(contextCache.get(waveform));
}

export function createNoiseBuffer(context, color = "white", seconds = 2) {
  let contextCache = noiseCache.get(context);
  if (!contextCache) {
    contextCache = new Map();
    noiseCache.set(context, contextCache);
  }
  const key = `${color}:${seconds}`;
  if (contextCache.has(key)) return contextCache.get(key);

  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    let brown = 0;
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      if (color === "brown") {
        brown = (brown + 0.02 * white) / 1.02;
        data[i] = brown * 3.5;
      } else if (color === "pink") {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else if (color === "blue") {
        data[i] = i === 0 ? white : (white - data[i - 1]) * 0.5;
      } else {
        data[i] = white;
      }
    }
  }
  contextCache.set(key, buffer);
  return buffer;
}

export function createSaturationCurve(amount = 0) {
  const size = 4096;
  const curve = new Float32Array(size);
  const drive = 1 + Math.max(0, amount) * 28;
  for (let i = 0; i < size; i += 1) {
    const x = (i / (size - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  return curve;
}

export function divisionToSeconds(division, bpm = 120) {
  const quarter = 60 / Math.max(20, bpm);
  const map = {
    "1/1": quarter * 4,
    "1/2": quarter * 2,
    "1/4": quarter,
    "1/8": quarter / 2,
    "1/8T": quarter / 3,
    "1/16": quarter / 4,
    "1/16T": quarter / 6,
    "1/32": quarter / 8,
  };
  return map[division] || quarter;
}
