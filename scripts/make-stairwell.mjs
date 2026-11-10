import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { RATE, THROUGH_THE_DOOR, decode, fullScale, muffle, peakOf, sfx, sfxPath, writeWav } from "./sfx-audio.mjs";
import { WET, convolve, impulse } from "./stairwell-room.mjs";
import { withScratch } from "./scratch.mjs";

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
  "cloth2",
];
const RELAY = { from: "switch_002", box: { cutoff: THROUGH_THE_DOOR.cutoff, level: 1 }, wet: 0.65 };
const FAR_OFF = { box: { cutoff: 1500, level: 0.8 }, wet: 0.65 };
const FAR_STEPS = [0, 1, 2, 3].map((n) => `footstep_concrete_00${n}`);
const POUND = { wet: 2, takes: [0, 1, 2, 3, 4] };
const WAV_SOURCES = [
  ...["bell-storm-door", "dtmf-0", "dtmf-1", "dtmf-2", "ringback", "busy", "beep", "click", "panting", "panting-door", "warteschleife"].map((name) => `phone/${name}`),
  ...(existsSync(sfx("coda/")) ? readdirSync(sfx("coda/")) : []).filter((file) => file.endsWith(".wav")).map((file) => `coda/${path.parse(file).name}`),
];



withScratch("stairwell-", (scratch) => {
  mkdirSync(sfx("stairwell/"), { recursive: true });
  const ir = impulse();
  const sources = [
    ...SOURCES.map((name) => ({ name, file: `${name}.ogg`, wet: WET })),
    ...WAV_SOURCES.map((name) => ({ name, file: `${name}.wav`, wet: WET })),
    { name: "relay", file: `${RELAY.from}.ogg`, wet: RELAY.wet, box: RELAY.box },
    ...FAR_STEPS.map((name) => ({ name: `${name}-far`, file: `${name}.ogg`, wet: FAR_OFF.wet, box: FAR_OFF.box })),
    ...POUND.takes.map((n) => ({ name: `pound/door-pound-${n}`, file: `pound/door-pound-${n}.wav`, wet: POUND.wet, full: true })),
    ...POUND.takes.map((n) => ({ name: `pound/latch-rattle-${n}`, file: `pound/latch-rattle-${n}.wav`, wet: WET })),
  ];
  for (const { name, file, wet: mix, box, full } of sources) {
    mkdirSync(sfx(`stairwell/${path.posix.dirname(name)}/`), { recursive: true });
    const decoded = decode(sfxPath(file), scratch);
    const dry = box ? Float32Array.from(muffle(decoded, box)) : decoded;
    const wet = convolve(dry, ir);
    const mixed = wet.map((w, i) => (i < dry.length ? dry[i] : 0) + mix * w);
    const peak = peakOf(mixed);
    const out = full || peak > 0.98 ? fullScale(mixed) : mixed;
    writeWav(sfx(`stairwell/${name}.wav`), [out]);
    console.log(`stairwell/${name}.wav: ${(out.length / RATE).toFixed(2)} s${peak > 0.98 ? `, scaled ${(0.98 / peak).toFixed(2)}` : ""}`);
  }
});
