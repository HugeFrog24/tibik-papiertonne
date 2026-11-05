import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RATE, decode } from "./sfx-audio.mjs";
import { makeLoop, writeWithMuffled } from "./ambience-loop.mjs";
import { withScratch } from "./scratch.mjs";

const RECORDINGS = fileURLToPath(new URL("../assets/recordings/", import.meta.url));
const STEADY = { from: 8, seconds: 30, fade: 2 };
const PEAK = 0.8;
const CRACKLE = { quantile: 0.9999, ratio: 4 };

const softened = (samples) => {
  const sorted = Float32Array.from(samples, Math.abs).sort();
  const knee = sorted[Math.floor(sorted.length * CRACKLE.quantile)];
  return samples.map((v) => (Math.abs(v) <= knee ? v : Math.sign(v) * (knee + (Math.abs(v) - knee) / CRACKLE.ratio)));
};

const recordings = JSON.parse(readFileSync(path.join(RECORDINGS, "recordings.json"), "utf8"));
const [recording] = recordings.rain;
withScratch("rain-", (scratch) => {
  const samples = softened(decode(path.join(RECORDINGS, recording.file), scratch));
  const loop = makeLoop(STEADY.seconds, 1);
  loop.bed(0, STEADY.fade, (t) => samples[Math.round((STEADY.from + t) * RATE)] ?? 0);
  writeWithMuffled("rain", loop, PEAK);
});
