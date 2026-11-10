import { expect, test } from "vitest";
import { bellRings } from "../scenes/klingelsturm/choreography";
import { peakOf } from "./toneChecks";
import { readWav, tonePower as power } from "./wavFile";

const BELL_HZ = 680;

test("the bell is a loud 680 Hz square wave: odd harmonics at 1/3, 1/5 of the fundamental, no even ones", () => {
  const { rate, samples } = readWav("phone/bell.wav");
  expect(peakOf(samples)).toBeGreaterThan(0.8);
  const at = (n: number) => power(samples, rate, 0.1, 1.1, n * BELL_HZ);
  const db = (n: number) => 10 * Math.log10(at(n) / at(1));
  expect(Math.abs(db(3) - 20 * Math.log10(1 / 3))).toBeLessThan(1.5);
  expect(Math.abs(db(5) - 20 * Math.log10(1 / 5))).toBeLessThan(1.5);
  for (const even of [2, 4]) expect(db(even)).toBeLessThan(-40);
  expect(at(1)).toBeGreaterThan(
    100 * power(samples, rate, 0.1, 1.1, BELL_HZ / 2),
  );
});

test("through his door the bell is still loud, only a little duller", () => {
  const dry = readWav("phone/bell-storm.wav");
  const door = readWav("phone/bell-storm-door.wav");
  const rms = (s: Float32Array) =>
    Math.sqrt(s.reduce((sum, v) => sum + v * v, 0) / s.length);
  expect(rms(door.samples)).toBeLessThan(rms(dry.samples));
  expect(rms(door.samples)).toBeGreaterThan(rms(dry.samples) * 0.4);
});

test("between her jabs and after her last one the stairwell keeps ringing for a moment", () => {
  const { rate, samples } = readWav("stairwell/phone/bell-storm-door.wav");
  const rings = bellRings();
  const start = rings[0].at;
  const last = rings[rings.length - 1];
  const release = last.at + last.length - start;
  const rms = (from: number, to: number) => rmsOf(samples, rate, from, to);
  const steady = rms(last.at - start + 0.02, release - 0.02);
  const between = rms(
    rings[2].at + rings[2].length - start + 0.02,
    rings[3].at - start - 0.02,
  );
  const tail = rms(release + 0.1, release + 0.4);
  const late = rms(release + 2.0, release + 2.4);
  expect(between).toBeGreaterThan(steady * 0.05);
  expect(between).toBeLessThan(steady * 0.7);
  expect(tail).toBeGreaterThan(steady * 0.02);
  expect(tail).toBeLessThan(steady);
  expect(late).toBeLessThan(tail);
});

const rmsOf = (
  samples: Float32Array,
  rate: number,
  from: number,
  to: number,
) => {
  let sum = 0;
  const a = Math.round(from * rate);
  const b = Math.round(to * rate);
  for (let i = a; i < b; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / (b - a));
};

const LOW = [697, 770, 852, 941];
const HIGH = [1209, 1336, 1477];

test("each key plays its DTMF pair", () => {
  for (const [digit, low, high] of [
    ["1", 697, 1209],
    ["0", 941, 1336],
    ["2", 697, 1336],
  ] as const) {
    const { rate, samples } = readWav(`phone/dtmf-${digit}.wav`);
    const at = (f: number) => power(samples, rate, 0.01, 0.11, f);
    for (const other of [...LOW, ...HIGH].filter(
      (f) => f !== low && f !== high,
    )) {
      expect(at(low)).toBeGreaterThan(100 * at(other));
      expect(at(high)).toBeGreaterThan(100 * at(other));
    }
  }
});

test("the ringing tone is 425 Hz, 1 s on, 4 s off", () => {
  const { rate, samples } = readWav("phone/ringback.wav");
  expect(samples.length / rate).toBeCloseTo(5, 2);
  expect(rmsOf(samples, rate, 0.1, 0.9)).toBeGreaterThan(
    20 * rmsOf(samples, rate, 1.2, 4.8) + 0.01,
  );
  expect(power(samples, rate, 0.1, 0.9, 425)).toBeGreaterThan(
    100 * power(samples, rate, 0.1, 0.9, 850),
  );
});

test("the busy tone is 425 Hz, 480 ms on, 480 ms off", () => {
  const { rate, samples } = readWav("phone/busy.wav");
  expect(rmsOf(samples, rate, 0.05, 0.43)).toBeGreaterThan(
    20 * rmsOf(samples, rate, 0.53, 0.91) + 0.01,
  );
  expect(rmsOf(samples, rate, 1.01, 1.39)).toBeGreaterThan(
    20 * rmsOf(samples, rate, 1.49, 1.87) + 0.01,
  );
  expect(power(samples, rate, 0.05, 0.43, 425)).toBeGreaterThan(
    100 * power(samples, rate, 0.05, 0.43, 600),
  );
});

test("the answering machine beeps at about 1 kHz", () => {
  const { rate, samples } = readWav("phone/beep.wav");
  expect(power(samples, rate, 0.02, 0.35, 1000)).toBeGreaterThan(
    100 * power(samples, rate, 0.02, 0.35, 700),
  );
});

test("her panting comes in breaths with pauses between them", () => {
  const { rate, samples } = readWav("phone/panting.wav");
  const windows = Array.from(
    { length: Math.floor(samples.length / rate / 0.1) },
    (_, i) => rmsOf(samples, rate, i * 0.1, (i + 1) * 0.1),
  );
  expect(Math.max(...windows)).toBeGreaterThan(5 * Math.min(...windows));
  expect(Math.max(...windows)).toBeGreaterThan(0.05);
});

test("when the dispatcher hangs up the line clicks: short, sharp, then silence", () => {
  const { rate, samples } = readWav("phone/click.wav");
  expect(samples.length / rate).toBeLessThan(0.15);
  expect(rmsOf(samples, rate, 0, 0.01)).toBeGreaterThan(0.1);
  expect(rmsOf(samples, rate, 0.05, 0.1)).toBeLessThan(
    0.01 * rmsOf(samples, rate, 0, 0.01) + 1e-4,
  );
});

test("through his door her panting is much quieter and duller", () => {
  const plain = readWav("phone/panting.wav");
  const door = readWav("phone/panting-door.wav");
  const rms = (s: Float32Array) =>
    Math.sqrt(s.reduce((sum, v) => sum + v * v, 0) / s.length);
  expect(20 * Math.log10(rms(door.samples) / rms(plain.samples))).toBeLessThan(
    -12,
  );
  const bright = (w: { rate: number; samples: Float32Array }) =>
    [2000, 3000, 4000].reduce(
      (sum, f) => sum + power(w.samples, w.rate, 0, 7, f),
      0,
    ) /
    [300, 400, 500].reduce(
      (sum, f) => sum + power(w.samples, w.rate, 0, 7, f),
      0,
    );
  expect(bright(door)).toBeLessThan(bright(plain) / 10);
});
