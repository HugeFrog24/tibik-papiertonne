import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RATE, decode, passage, peakOf, randomFrom, sfx, sfxPath, writeWav } from "./sfx-audio.mjs";
import { fft } from "./spectral.mjs";
import { withScratch } from "./scratch.mjs";

const RECORDINGS = fileURLToPath(new URL("../assets/recordings/", import.meta.url));
const PEAK = 0.9;
const FROM_THE_IGNITION = {
  "lighter-strike": { from: 0.08, seconds: 0.26, fadeIn: 0.01, fadeOut: 0.08 },
  drag: { from: 0.72, seconds: 1.43, fadeIn: 0.02, fadeOut: 0.3 },
};
const FLAME = { from: 0.36, to: 0.74, frame: 1024, lasts: 2.0, fadeIn: 0.05, seed: 2131 };
const FROM_THE_SIGH = {
  inhale: { from: 0.3, seconds: 1.45, fadeIn: 0.1, fadeOut: 0.15 },
  exhale: { from: 1.85, seconds: 1.3, fadeIn: 0.15, fadeOut: 0.6 },
};
const LEVER = { file: "metalClick.ogg", from: 0.06, seconds: 0.24, fadeIn: 0.005, fadeOut: 0.05 };

const recordings = JSON.parse(readFileSync(path.join(RECORDINGS, "recordings.json"), "utf8"));
const [ignition] = recordings.cigarette;
const [sigh] = recordings.breath;

const spectrumOf = (samples, from, to) => {
  const power = new Float64Array(FLAME.frame / 2 + 1);
  let frames = 0;
  for (let at = Math.round(from * RATE); at + FLAME.frame <= Math.round(to * RATE); at += FLAME.frame / 2) {
    const re = Float64Array.from({ length: FLAME.frame }, (_, i) => samples[at + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FLAME.frame)));
    const im = new Float64Array(FLAME.frame);
    fft(re, im);
    for (let k = 0; k < power.length; k++) power[k] += re[k] ** 2 + im[k] ** 2;
    frames++;
  }
  return power.map((p) => Math.sqrt(p / frames));
};

const steadyLike = (magnitude, seconds) => {
  const n = 2 ** Math.ceil(Math.log2(seconds * RATE));
  const random = randomFrom(FLAME.seed);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let j = 1; j < n / 2; j++) {
    const k = (j * FLAME.frame) / n;
    const low = Math.floor(k);
    const level = magnitude[low] + (magnitude[low + 1] - magnitude[low]) * (k - low);
    const phase = 2 * Math.PI * random();
    re[j] = level * Math.cos(phase);
    im[j] = level * Math.sin(phase);
    re[n - j] = re[j];
    im[n - j] = -im[j];
  }
  fft(re, im);
  return Float32Array.from({ length: Math.round(seconds * RATE) }, (_, i) => re[i] * Math.min(1, i / (FLAME.fadeIn * RATE)));
};

const write = (name, samples, source) => {
  const peak = peakOf(samples);
  writeWav(sfx(`coda/${name}.wav`), [samples], PEAK / peak);
  console.log(`coda/${name}.wav: ${(samples.length / RATE).toFixed(2)} s from ${source}`);
};

withScratch("cigarette-", (scratch) => {
  mkdirSync(sfx("coda/"), { recursive: true });
  const lit = decode(path.join(RECORDINGS, ignition.file), scratch);
  for (const [name, cut] of Object.entries(FROM_THE_IGNITION)) write(name, passage(lit, cut), ignition.title);
  write("lighter-hiss", steadyLike(spectrumOf(lit, FLAME.from, FLAME.to), FLAME.lasts), `${ignition.title} (its flame's spectrum)`);
  const breath = decode(path.join(RECORDINGS, sigh.file), scratch);
  for (const [name, cut] of Object.entries(FROM_THE_SIGH)) write(name, passage(breath, cut), sigh.title);
  write("lighter-release", passage(decode(sfxPath(LEVER.file), scratch), LEVER), LEVER.file);
});
