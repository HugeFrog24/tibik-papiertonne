export const brightness = (samples: Float32Array, rate: number) => {
  let edge = 0;
  let energy = 0;
  for (let i = 1; i < Math.min(samples.length, 0.3 * rate); i++) {
    edge += (samples[i] - samples[i - 1]) ** 2;
    energy += samples[i] ** 2;
  }
  return edge / energy;
};

export const tail = (samples: Float32Array, rate: number) => {
  let late = 0;
  let all = 0;
  samples.forEach((v, i) => {
    all += v * v;
    if (i > 0.25 * rate) late += v * v;
  });
  return late / all;
};

export const peakOf = (samples: Float32Array) =>
  samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
