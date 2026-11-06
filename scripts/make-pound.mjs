import { mkdirSync } from "node:fs";
import { RATE, decode, driven, fullScale, muffle, peakOf, sfx, sfxPath, writeWav } from "./sfx-audio.mjs";
import { withScratch } from "./scratch.mjs";

const POUND_TAKES = [0, 1, 2, 3, 4];

const LAYERS = [
  { name: (n) => `impactPunch_heavy_00${n}`, gain: 1 },
  { name: (n) => `impactWood_heavy_00${n}`, gain: 0.75 },
  { name: (n) => `impactPlank_medium_00${n}`, gain: 0.6 },
];
const SLOWER = 0.85;
const LEAD = 0.01;
const BODY = { cutoff: 110, gain: 1.2 };
const DRIVE = 2;
const FADE = 0.02;

const onset = (x) => {
  const threshold = 0.2 * peakOf(x);
  return x.findIndex((v) => Math.abs(v) >= threshold);
};

const slowed = (x) =>
  Float32Array.from({ length: Math.floor(x.length / SLOWER) }, (_, i) => {
    const at = i * SLOWER;
    const k = Math.floor(at);
    return (x[k] ?? 0) + ((x[k + 1] ?? 0) - (x[k] ?? 0)) * (at - k);
  });

const pound = (takes) => {
  const lead = Math.round(LEAD * RATE);
  const length = Math.max(...takes.map(({ x }) => x.length - onset(x))) + lead;
  const mixed = new Float32Array(length);
  for (const { x, gain } of takes) {
    const shift = lead - onset(x);
    x.forEach((v, i) => {
      if (i + shift >= 0 && i + shift < length) mixed[i + shift] += gain * v;
    });
  }
  const body = muffle(mixed, { cutoff: BODY.cutoff, level: 1 });
  const boomed = driven(mixed.map((v, i) => v + BODY.gain * body[i]), DRIVE);
  const fade = Math.round(FADE * RATE);
  return fullScale(boomed.map((v, i) => v * Math.min(1, (length - 1 - i) / fade)));
};

withScratch("pound-", (scratch) => {
  mkdirSync(sfx("pound/"), { recursive: true });
  for (const n of POUND_TAKES) {
    const takes = LAYERS.map(({ name, gain }) => ({ x: slowed(decode(sfxPath(`${name(n)}.ogg`), scratch)), gain }));
    const out = pound(takes);
    writeWav(sfx(`pound/door-pound-${n}.wav`), [out]);
    console.log(`pound/door-pound-${n}.wav: ${(out.length / RATE).toFixed(2)} s`);
  }
});
