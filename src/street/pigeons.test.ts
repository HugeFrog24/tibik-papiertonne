import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import {
  analyse,
  syllablesOf,
  type Syllable as Heard,
} from "../../scripts/spectral.mjs";
import { readWav, tonePower as power } from "../sound/wavFile";
import { STREET_LOOPS } from "./ambienceLoops";

const envelope = (s: Float32Array, rate: number, window = 0.01) => {
  const n = Math.round(window * rate);
  return Array.from({ length: Math.floor(s.length / n) }, (_, w) => {
    let sum = 0;
    for (let i = w * n; i < (w + 1) * n; i++) sum += s[i] * s[i];
    return Math.sqrt(sum / n);
  });
};

test("the street has wood pigeons, outside and muffled indoors", () => {
  expect(STREET_LOOPS.map((l) => l.file)).toContain("street-pigeons");
  expect(() => readWav("street-pigeons-muffled.wav")).not.toThrow();
});

const RECORDINGS = "assets/recordings";
const FREE = ["Public domain", "CC0 1.0", "CC BY 4.0"];

type Recording = {
  readonly file: string;
  readonly title: string;
  readonly author: string;
  readonly license: string;
  readonly source: string;
};

const pigeonRecordings = (): Recording[] =>
  JSON.parse(readFileSync(`${RECORDINGS}/recordings.json`, "utf8"))[
    "street-pigeons"
  ];

type Syllable = {
  readonly start: number;
  readonly level: number;
  readonly pitch: number[];
};

const learned = (): { file: string; syllables: Syllable[] }[] =>
  JSON.parse(readFileSync(`${RECORDINGS}/street-pigeons.model.json`, "utf8"))
    .recordings;

test("the pigeons are learned from real recordings under a free licence, each credited", () => {
  const recordings = pigeonRecordings();
  expect(recordings.length).toBeGreaterThan(0);
  const credits = readFileSync("public/sfx/CREDITS.md", "utf8");
  for (const r of recordings) {
    expect(existsSync(`${RECORDINGS}/${r.file}`)).toBe(true);
    expect(FREE).toContain(r.license);
    expect(credits).toContain(r.source);
    expect(credits).toContain(r.author);
  }
});

test("a wood pigeon coos within the pitch range of the recordings, and far above that it is quiet", () => {
  const learnedPitches = learned().flatMap((r) =>
    r.syllables.flatMap((s) => s.pitch),
  );
  const { rate, samples } = readWav("street-pigeons.wav");
  const env = envelope(samples, rate);
  const loud = env.indexOf(Math.max(...env)) * 0.01;
  const around = (f: number) => power(samples, rate, loud - 0.1, loud + 0.1, f);
  const pitches = Array.from({ length: 101 }, (_, i) => 300 + 5 * i);
  const strongest = pitches.reduce((a, b) => (around(b) > around(a) ? b : a));
  expect(strongest).toBeGreaterThanOrEqual(0.95 * Math.min(...learnedPitches));
  expect(strongest).toBeLessThanOrEqual(1.05 * Math.max(...learnedPitches));
  expect(around(strongest)).toBeGreaterThan(30 * around(2400));
});

test("a coo is more than a sine: its overtone is there, 30 to 65 dB under the fundamental", () => {
  const { rate, samples } = readWav("street-pigeons.wav");
  const env = envelope(samples, rate);
  const loud = env.indexOf(Math.max(...env)) * 0.01;
  const around = (f: number) =>
    power(samples, rate, loud - 0.05, loud + 0.05, f);
  const pitches = Array.from({ length: 101 }, (_, i) => 300 + 5 * i);
  const f0 = pitches.reduce((a, b) => (around(b) > around(a) ? b : a));
  const overtone = Math.max(
    ...Array.from({ length: 21 }, (_, i) => around(2 * f0 - 50 + 5 * i)),
  );
  const below = 10 * Math.log10(around(f0) / overtone);
  expect(below).toBeGreaterThan(30);
  expect(below).toBeLessThan(65);
});

test("every recording has a learned model of at least three syllables", () => {
  const model = learned();
  expect(model.map((r) => r.file)).toEqual(
    pigeonRecordings().map((r) => r.file),
  );
  for (const r of model) expect(r.syllables.length).toBeGreaterThanOrEqual(3);
});

test("the generated pigeons keep the rhythm learned from the recording", () => {
  const { rate, samples } = readWav("street-pigeons.wav");
  const env = envelope(samples, rate);
  const peak = Math.max(...env);
  const onsets = env.flatMap((v, i) =>
    v > peak * 10 ** (-18 / 20) && (env[i - 1] ?? 0) <= peak * 10 ** (-18 / 20)
      ? [i * 0.01]
      : [],
  );
  const loud = learned()[0].syllables.filter((s) => s.level >= -12);
  const expected = loud.map((s) => s.start - loud[0].start);
  const tempos = Array.from({ length: 49 }, (_, i) => 0.94 + 0.0025 * i);
  const matches = onsets.some((anchor) =>
    tempos.some((tempo) =>
      expected.every((dt) =>
        onsets.some((o) => Math.abs(o - (anchor + dt * tempo)) <= 0.04),
      ),
    ),
  );
  expect(expected.length).toBeGreaterThanOrEqual(3);
  expect(matches).toBe(true);
});

const flutter = (s: Float32Array, rate: number) => {
  const a = 1 - Math.exp((-2 * Math.PI * 250) / rate);
  const step = Math.round(rate / 1000);
  let y1 = 0;
  let y2 = 0;
  const fine: number[] = [];
  for (let i = 0; i < s.length; i++) {
    y1 += a * (Math.abs(s[i]) - y1);
    y2 += a * (y1 - y2);
    if (i % step === 0) fine.push(y2);
  }
  const smooth = fine.map((_, i) => {
    const near = fine.slice(Math.max(0, i - 20), i + 20);
    return near.reduce((sum, v) => sum + v, 0) / near.length;
  });
  return { fine, smooth };
};

test("a coo is not perfectly smooth: it flutters and has micro-dropouts", () => {
  const { rate, samples } = readWav("street-pigeons.wav");
  const { fine, smooth } = flutter(samples, rate);
  const top = Math.max(...smooth);
  const voiced = fine.flatMap((v, i) =>
    smooth[i] > top * 10 ** (-12 / 20) ? [v / smooth[i] - 1] : [],
  );
  const rms = Math.sqrt(
    voiced.reduce((sum, m) => sum + m * m, 0) / voiced.length,
  );
  const dropouts = voiced.filter(
    (m, i) => m < -0.5 && (voiced[i - 1] ?? 0) >= -0.5,
  );
  expect(rms).toBeGreaterThan(0.1);
  expect(rms).toBeLessThan(0.35);
  expect(dropouts.length).toBeGreaterThanOrEqual(5);
});

const meanOf = (rows: Heard[], pick: (s: Heard) => number) =>
  rows.reduce((sum, s) => sum + pick(s), 0) / rows.length;

const powerMeanOf = (rows: Heard[], pick: (s: Heard) => number) =>
  10 * Math.log10(meanOf(rows, (s) => 10 ** ((s.level + pick(s)) / 10)));

const BOUT_GAP = 1.5;

const bouts = (samples: Float32Array, rate: number) => {
  const env = envelope(samples, rate);
  const quiet = Math.max(...env) * 10 ** (-40 / 20);
  const spans: [number, number][] = [];
  env.forEach((v, w) => {
    if (v <= quiet) return;
    const last = spans[spans.length - 1];
    if (last && w - last[1] <= BOUT_GAP * 100) last[1] = w;
    else spans.push([w, w]);
  });
  return spans.map(([a, b]) =>
    samples.slice(Math.max(0, (a - 20) * rate * 0.01), (b + 20) * rate * 0.01),
  );
};

const heard = () => {
  const { rate, samples } = readWav("street-pigeons.wav");
  const real = JSON.parse(
    readFileSync(`${RECORDINGS}/street-pigeons.model.json`, "utf8"),
  ).recordings.flatMap((r: { syllables: Heard[] }) => r.syllables) as Heard[];
  return {
    real,
    generated: bouts(samples, rate).flatMap((bout) =>
      syllablesOf(analyse(bout), bout),
    ),
  };
};

test("analysed like the recordings, the generated coos have their overtones and breath, within 4 dB", () => {
  const { real, generated } = heard();
  expect(generated.length).toBeGreaterThanOrEqual(real.length - 2);
  const fundamental = (rows: Heard[]) => powerMeanOf(rows, () => 0);
  const relative = (rows: Heard[], pick: (s: Heard) => number) =>
    powerMeanOf(rows, pick) - fundamental(rows);
  real[0].residual.forEach((_, b) => {
    expect(
      Math.abs(
        relative(generated, (s) => s.residual[b]) -
          relative(real, (s) => s.residual[b]),
      ),
    ).toBeLessThan(4);
  });
  [0, 1].forEach((m) => {
    expect(
      Math.abs(
        relative(generated, (s) => s.partials[m]) -
          relative(real, (s) => s.partials[m]),
      ),
    ).toBeLessThan(4);
  });
});

test("analysed like the recordings, the generated coos flutter and drop out as often", () => {
  const { real, generated } = heard();
  real[0].texture.modulation.forEach((_, k) => {
    const ratio =
      meanOf(generated, (s) => s.texture.modulation[k]) /
      meanOf(real, (s) => s.texture.modulation[k]);
    expect(ratio).toBeGreaterThan(1 / 1.5);
    expect(ratio).toBeLessThan(1.5);
  });
  const dips =
    meanOf(generated, (s) => s.texture.dips) /
    meanOf(real, (s) => s.texture.dips);
  expect(dips).toBeGreaterThan(0.7);
  expect(dips).toBeLessThan(1.3);
});
