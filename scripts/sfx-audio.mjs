import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const RATE = 32000;
export const SPEED_OF_SOUND = 343;

export const randomFrom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const pole = (frequency) => 1 - Math.exp((-2 * Math.PI * frequency) / RATE);

export const peakOf = (samples) => samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

export const fullScale = (samples) => {
  const peak = peakOf(samples);
  return samples.map((v) => (v * 0.98) / peak);
};

export const driven = (samples, drive) => fullScale(fullScale(samples).map((v) => Math.tanh(drive * v)));

export const passage = (samples, { from, seconds, fadeIn, fadeOut }) => {
  const start = Math.round(from * RATE);
  const envelope = (t) => Math.min(1, t / fadeIn, (seconds - t) / fadeOut);
  return Float32Array.from({ length: Math.round(seconds * RATE) }, (_, i) => (samples[start + i] ?? 0) * envelope(i / RATE));
};

export const DOOR = { cutoff: 5000, level: 10 ** (-4 / 20) };
export const THROUGH_THE_DOOR = { cutoff: 800, level: 10 ** (-16 / 20) };

export const muffle = (dry, door = DOOR) => {
  const a = pole(door.cutoff);
  const out = new Float64Array(dry.length);
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < dry.length; i++) {
    y1 += a * (dry[i] - y1);
    y2 += a * (y1 - y2);
    out[i] = y2 * door.level;
  }
  return out;
};

export const sfx = (name) => new URL(`../public/sfx/${name}`, import.meta.url);

export const sfxPath = (name) => sfx(name).pathname.replace(/^\/([A-Za-z]:)/, "$1");

export const writeWav = (url, channels, gain = 1) => {
  const count = channels.length;
  const length = channels[0].length;
  const data = Buffer.alloc(length * count * 2);
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < count; c++) {
      const v = Math.round(Math.min(1, Math.max(-1, channels[c][i] * gain)) * 32767);
      data.writeInt16LE(v, (i * count + c) * 2);
    }
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(count, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * count * 2, 28);
  header.writeUInt16LE(count * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(url, Buffer.concat([header, data]));
};

export const decode = (file, scratch) => {
  const out = path.join(scratch, "decoded.wav");
  const result = spawnSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", `"${file}"`, "-ac", "1", "-ar", String(RATE), "-c:a", "pcm_s16le", `"${out}"`], {
    shell: true,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(`ffmpeg failed on ${file}: ${result.stderr}`);
  const wav = readFileSync(out);
  let offset = 12;
  while (wav.toString("ascii", offset, offset + 4) !== "data") offset += 8 + wav.readUInt32LE(offset + 4);
  const length = wav.readUInt32LE(offset + 4) / 2;
  return Float32Array.from({ length }, (_, i) => wav.readInt16LE(offset + 8 + i * 2) / 32768);
};
