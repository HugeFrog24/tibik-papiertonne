import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RATE, THROUGH_THE_DOOR, decode, muffle, peakOf, sfx, writeWav } from "./sfx-audio.mjs";
import { withScratch } from "./scratch.mjs";

const RECORDINGS = fileURLToPath(new URL("../assets/recordings/", import.meta.url));
const LEAD = 0.02;
const FADE = 0.15;
const FLOOR = -60;

const recordings = JSON.parse(readFileSync(path.join(RECORDINGS, "recordings.json"), "utf8"));
const [recording] = recordings.tape;
withScratch("tape-", (scratch) => {
  const samples = decode(path.join(RECORDINGS, recording.file), scratch);
  const peak = peakOf(samples);
  const floor = peak * 10 ** (FLOOR / 20);
  const first = samples.findIndex((v) => Math.abs(v) > floor);
  const last = samples.length - 1 - [...samples].reverse().findIndex((v) => Math.abs(v) > floor);
  const from = Math.max(0, first - Math.round(LEAD * RATE));
  const fade = Math.round(FADE * RATE);
  const out = samples.slice(from, last + 1).map((v, i, all) => (v * Math.min(1, (all.length - i) / fade)) / peak * 0.9);
  mkdirSync(sfx("flur/"), { recursive: true });
  writeWav(sfx("flur/tape-pull.wav"), [out]);
  writeWav(sfx("flur/tape-pull-door.wav"), [muffle(out, THROUGH_THE_DOOR)]);
  console.log(`flur/tape-pull.wav, flur/tape-pull-door.wav: ${(out.length / RATE).toFixed(2)} s from ${recording.title}`);
});
