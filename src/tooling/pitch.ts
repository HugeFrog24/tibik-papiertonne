import { spawnSync } from "node:child_process";

const RATE = 24000;
const WINDOW = 0.04;
const HOP = 0.01;
const LOWEST = 60;
const HIGHEST = 400;
const VOICED = 0.02;
const DIP = 0.15;

const samplesOf = (file: string) => {
  const raw = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(RATE), "-f", "f32le", "-"], { maxBuffer: 1 << 28 }).stdout;
  return Float32Array.from({ length: raw.length / 4 }, (_, i) => raw.readFloatLE(i * 4));
};

const pitchAt = (x: Float32Array, start: number, window: number, minLag: number, maxLag: number) => {
  const difference = new Float64Array(maxLag + 1);
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < window; i++) {
      const d = x[start + i] - x[start + i + lag];
      sum += d * d;
    }
    difference[lag] = sum;
  }
  const normalised = new Float64Array(maxLag + 1);
  let running = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    running += difference[lag];
    normalised[lag] = (difference[lag] * lag) / (running || 1);
  }
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (normalised[lag] >= DIP) continue;
    let best = lag;
    while (best + 1 <= maxLag && normalised[best + 1] < normalised[best]) best++;
    return RATE / best;
  }
  return undefined;
};

export const medianPitch = (file: string) => {
  const x = samplesOf(file);
  const window = Math.round(WINDOW * RATE);
  const hop = Math.round(HOP * RATE);
  const [minLag, maxLag] = [Math.round(RATE / HIGHEST), Math.round(RATE / LOWEST)];
  const pitches: number[] = [];
  for (let start = 0; start + window + maxLag < x.length; start += hop) {
    let energy = 0;
    for (let i = 0; i < window; i++) energy += x[start + i] ** 2;
    if (Math.sqrt(energy / window) < VOICED) continue;
    const pitch = pitchAt(x, start, window, minLag, maxLag);
    if (pitch !== undefined) pitches.push(pitch);
  }
  const sorted = pitches.sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};
