import { RATE, SPEED_OF_SOUND, pole, randomFrom } from "./sfx-audio.mjs";

export const ROOM = { width: 2.6, lane: 1.3, depth: 7.4, storey: 2.85 };
export const RT60 = 3.0;
export const TAIL = 2.6;
export const WET = 0.32;

export const impulse = () => {
  const random = randomFrom(4711);
  const ir = new Float32Array(Math.round(TAIL * RATE));
  const paths = [ROOM.lane, ROOM.width, ROOM.lane * 2, ROOM.storey, ROOM.width * 2, ROOM.storey * 2, ROOM.depth, ROOM.width * 3];
  paths.forEach((distance, k) => {
    const at = Math.round(((2 * distance) / SPEED_OF_SOUND) * RATE);
    if (at < ir.length) ir[at] += (k % 2 === 0 ? 1 : -1) * 0.6 * 0.82 ** k;
  });
  const onset = Math.round(0.012 * RATE);
  let low = 0;
  for (let i = onset; i < ir.length; i++) {
    const t = i / RATE;
    const cutoff = 500 + 7500 * Math.exp(-t / 0.7);
    const a = pole(cutoff);
    low += a * (random() * 2 - 1 - low);
    const swell = Math.min(1, (i - onset) / (0.03 * RATE));
    ir[i] += low * swell * 10 ** ((-3 * t) / RT60);
  }
  const energy = Math.sqrt(ir.reduce((sum, v) => sum + v * v, 0));
  return ir.map((v) => v / energy);
};

export const convolve = (dry, ir) => {
  const wet = new Float32Array(dry.length + ir.length - 1);
  for (let i = 0; i < dry.length; i++) {
    const d = dry[i];
    if (d === 0) continue;
    for (let j = 0; j < ir.length; j++) wet[i + j] += d * ir[j];
  }
  return wet;
};
