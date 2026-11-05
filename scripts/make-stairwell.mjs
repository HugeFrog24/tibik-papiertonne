import { mkdirSync } from "node:fs";
import path from "node:path";
import { RATE, SPEED_OF_SOUND, THROUGH_THE_DOOR, decode, muffle, pole, randomFrom, sfx, sfxPath, writeWav } from "./sfx-audio.mjs";
import { withScratch } from "./scratch.mjs";

const ROOM = { width: 2.6, lane: 1.3, depth: 7.4, storey: 2.85 };
const RT60 = 3.0;
const TAIL = 2.6;
const WET = 0.32;
const SOURCES = [
  "footstep_concrete_000",
  "footstep_concrete_001",
  "footstep_concrete_002",
  "footstep_concrete_003",
  "doorOpen_1",
  "doorClose_1",
  "metalLatch",
  "switch_002",
  "impactSoft_heavy_000",
];
const RELAY = { from: "switch_002", box: { cutoff: THROUGH_THE_DOOR.cutoff, level: 1 }, wet: 0.65 };
const WAV_SOURCES = ["phone/bell-storm-door", "phone/dtmf-0", "phone/dtmf-1", "phone/dtmf-2", "phone/ringback", "phone/busy", "phone/beep", "phone/click", "phone/panting", "phone/panting-door"];

const impulse = () => {
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

const convolve = (dry, ir) => {
  const wet = new Float32Array(dry.length + ir.length - 1);
  for (let i = 0; i < dry.length; i++) {
    const d = dry[i];
    if (d === 0) continue;
    for (let j = 0; j < ir.length; j++) wet[i + j] += d * ir[j];
  }
  return wet;
};


withScratch("stairwell-", (scratch) => {
  mkdirSync(sfx("stairwell/"), { recursive: true });
  const ir = impulse();
  const sources = [
    ...SOURCES.map((name) => ({ name, file: `${name}.ogg`, wet: WET })),
    ...WAV_SOURCES.map((name) => ({ name, file: `${name}.wav`, wet: WET })),
    { name: "relay", file: `${RELAY.from}.ogg`, wet: RELAY.wet, box: RELAY.box },
  ];
  for (const { name, file, wet: mix, box } of sources) {
    mkdirSync(sfx(`stairwell/${path.posix.dirname(name)}/`), { recursive: true });
    const decoded = decode(sfxPath(file), scratch);
    const dry = box ? Float32Array.from(muffle(decoded, box)) : decoded;
    const wet = convolve(dry, ir);
    const mixed = wet.map((w, i) => (i < dry.length ? dry[i] : 0) + mix * w);
    const peak = mixed.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    const out = peak > 0.98 ? mixed.map((v) => (v * 0.98) / peak) : mixed;
    writeWav(sfx(`stairwell/${name}.wav`), [out]);
    console.log(`stairwell/${name}.wav: ${(out.length / RATE).toFixed(2)} s${peak > 0.98 ? `, scaled ${(0.98 / peak).toFixed(2)}` : ""}`);
  }
});
