import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RATE, decode } from "./sfx-audio.mjs";

const RECORDINGS = fileURLToPath(new URL("../assets/recordings/", import.meta.url));
const ONSET = { bright: 3000, hop: 0.001, window: 0.002, before: 0.008, rise: 10, below: 12, apart: 0.1 };

const brightOf = (samples) => {
  const a = Math.exp((-2 * Math.PI * ONSET.bright) / RATE);
  let low = 0;
  return samples.map((v) => {
    low = (1 - a) * v + a * low;
    return v - low;
  });
};

const envelope = (samples) => {
  const hop = Math.round(RATE * ONSET.hop);
  const window = Math.round(RATE * ONSET.window);
  const out = [];
  for (let i = 0; i + window < samples.length; i += hop) {
    let energy = 0;
    for (let k = i; k < i + window; k++) energy += samples[k] * samples[k];
    out.push(10 * Math.log10(energy / window + 1e-12));
  }
  return out;
};

const onsetsOf = (samples) => {
  const env = envelope(brightOf(samples));
  const peak = Math.max(...env);
  const before = Math.round(ONSET.before / ONSET.hop);
  const apart = Math.round(ONSET.apart / ONSET.hop);
  const candidates = [];
  for (let i = before; i < env.length; i++) {
    const rise = env[i] - Math.min(...env.slice(i - before, i));
    if (rise > ONSET.rise && env[i] > peak - ONSET.below) candidates.push({ i, rise });
  }
  const kept = [];
  for (const c of candidates) {
    const last = kept[kept.length - 1];
    if (last && c.i - last.i < apart) {
      if (c.rise > last.rise) kept[kept.length - 1] = c;
    } else kept.push(c);
  }
  return kept.map((c) => c.i * ONSET.hop);
};

const gridOf = (onsets) => {
  const intervals = onsets.slice(1).map((t, k) => t - onsets[k]);
  const shortest = Math.min(...intervals);
  const step = intervals.filter((d) => d < 1.5 * shortest).reduce((a, b) => a + b) / intervals.filter((d) => d < 1.5 * shortest).length;
  const slots = onsets.map((t) => Math.round((t - onsets[0]) / step));
  const n = slots.length;
  const ms = slots.reduce((a, b) => a + b) / n;
  const mt = onsets.reduce((a, b) => a + b) / n;
  const eighth = slots.reduce((a, s, i) => a + (s - ms) * (onsets[i] - mt), 0) / slots.reduce((a, s) => a + (s - ms) ** 2, 0);
  const start = mt - eighth * ms;
  const misses = onsets.map((t, i) => t - start - eighth * slots[i]);
  return { eighth, slots, offGrid: Math.sqrt(misses.reduce((a, m) => a + m * m, 0) / n) };
};

const round = (v, digits) => Math.round(v * 10 ** digits) / 10 ** digits;

const recordings = JSON.parse(readFileSync(path.join(RECORDINGS, "recordings.json"), "utf8"));
const [recording] = recordings["doorbell-rhythm"];
const scratch = mkdtempSync(path.join(tmpdir(), "rhythm-"));
try {
  const onsets = onsetsOf(decode(path.join(RECORDINGS, recording.file), scratch));
  const grid = gridOf(onsets);
  const model = {
    recording: recording.title,
    eighth: round(grid.eighth, 4),
    slots: grid.slots,
    offGrid: round(grid.offGrid, 4),
    onsets: onsets.map((t) => round(t - onsets[0], 3)),
  };
  writeFileSync(path.join(RECORDINGS, "doorbell-rhythm.model.json"), `${JSON.stringify(model, null, 2)}\n`);
  console.log(JSON.stringify(model));
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
