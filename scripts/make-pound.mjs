import { mkdirSync } from "node:fs";
import { RATE, decode, driven, fullScale, muffle, peakOf, sfx, sfxPath, writeWav } from "./sfx-audio.mjs";
import { withScratch } from "./scratch.mjs";

const TAKES = [0, 1, 2, 3, 4];
const DOORS = ["wood_slam_04", "wood_slam_01", "wood_slam_03", "wood_close_02", "wood_close_01"];

const LAYERS = [
  { name: (n) => DOORS[n], gain: 1 },
  { name: (n) => `impactPunch_heavy_00${n}`, gain: 0.45 },
  { name: (n) => `impactPlank_medium_00${n}`, gain: 0.4 },
];
const LEAD = 0.01;
const DRIVE = 2.5;
const FADE = 0.02;
const RATTLE = { cutoff: 1800, level: 1 };

const onset = (x) => {
  const threshold = 0.2 * peakOf(x);
  return x.findIndex((v) => Math.abs(v) >= threshold);
};

const pound = (takes) => {
  const lead = Math.round(LEAD * RATE);
  const length = Math.max(...takes.map(({ x }) => x.length - onset(x))) + lead;
  const mixed = new Float32Array(length);
  for (const { x, gain } of takes) {
    const shift = lead - onset(x);
    const level = gain / peakOf(x);
    x.forEach((v, i) => {
      if (i + shift >= 0 && i + shift < length) mixed[i + shift] += level * v;
    });
  }
  const dense = driven(mixed, DRIVE);
  const fade = Math.round(FADE * RATE);
  return fullScale(dense.map((v, i) => v * Math.min(1, (length - 1 - i) / fade)));
};

withScratch("pound-", (scratch) => {
  mkdirSync(sfx("pound/"), { recursive: true });
  for (const n of TAKES) {
    const takes = LAYERS.map(({ name, gain }) => ({ x: decode(sfxPath(`${name(n)}.ogg`), scratch), gain }));
    const out = pound(takes);
    writeWav(sfx(`pound/door-pound-${n}.wav`), [out]);
    writeWav(sfx(`pound/latch-rattle-${n}.wav`), [fullScale(muffle(decode(sfxPath(`impactMetal_light_00${n}.ogg`), scratch), RATTLE))]);
    console.log(`pound/door-pound-${n}.wav: ${(out.length / RATE).toFixed(2)} s, pound/latch-rattle-${n}.wav`);
  }
});
