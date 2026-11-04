import { readFileSync } from "node:fs";

export const readWav = (name: string) => {
  const buffer = readFileSync(`public/sfx/${name}`);
  const channels = buffer.readUInt16LE(22);
  const rate = buffer.readUInt32LE(24);
  const frames = (buffer.length - 44) / 2 / channels;
  const samples = new Float32Array(frames);
  for (let i = 0; i < frames; i++)
    for (let c = 0; c < channels; c++)
      samples[i] += buffer.readInt16LE(44 + (i * channels + c) * 2) / 32768;
  return { rate, samples };
};

export const tonePower = (
  samples: Float32Array,
  rate: number,
  from: number,
  to: number,
  frequency: number,
) => {
  const start = Math.round(from * rate);
  const end = Math.round(to * rate);
  const k = (2 * Math.PI * frequency) / rate;
  let s1 = 0;
  let s2 = 0;
  for (let i = start; i < end; i++) {
    const s = samples[i] + 2 * Math.cos(k) * s1 - s2;
    s2 = s1;
    s1 = s;
  }
  return (s1 * s1 + s2 * s2 - 2 * Math.cos(k) * s1 * s2) / (end - start) ** 2;
};
