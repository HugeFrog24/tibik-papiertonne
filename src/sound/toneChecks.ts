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

export const rmsDb = (samples: Float32Array, rate: number, from: number, to: number) => {
  const start = Math.round(from * rate);
  const end = Math.min(samples.length, Math.round(to * rate));
  let energy = 0;
  for (let i = start; i < end; i++) energy += samples[i] ** 2;
  return 10 * Math.log10(energy / Math.max(1, end - start));
};

export const bandShare = (samples: Float32Array, rate: number, from: number, to: number) =>
  lowShare(samples, rate, to) - lowShare(samples, rate, from);

export const lowShare = (samples: Float32Array, rate: number, cutoff: number) => {
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / rate);
  let once = 0;
  let twice = 0;
  let low = 0;
  let all = 0;
  samples.forEach((v) => {
    once += a * (v - once);
    twice += a * (once - twice);
    low += twice * twice;
    all += v * v;
  });
  return low / all;
};
