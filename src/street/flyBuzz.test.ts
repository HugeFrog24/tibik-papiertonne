import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { BUZZ, analyse, buzzOf, type Buzz } from "../../scripts/spectral.mjs";
import { FLY_COUNT } from "../scenes/papiertonnen/flyPaths";
import { readWav } from "../sound/wavFile";

type FlyModel = {
  readonly recordings: { readonly file: string; readonly heard: Buzz }[];
  readonly flies: {
    readonly sound: string;
    readonly recording: number;
    readonly pitch: number;
  }[];
};

const model = () =>
  JSON.parse(readFileSync("assets/recordings/flies.model.json", "utf8")) as FlyModel;

const heardIn = (sound: string) => {
  const { samples } = readWav(`${sound}.wav`);
  return { samples, heard: buzzOf(analyse(samples, BUZZ), samples) };
};

const SLOW = { timeout: 120_000 };

test("every fly has its own buzz, learned from the author's house fly recordings", () => {
  const m = model();
  expect(m.flies).toHaveLength(FLY_COUNT);
  expect(new Set(m.flies.map((f) => f.sound)).size).toBe(FLY_COUNT);
  for (const r of m.recordings) {
    expect(r.heard.f0).toBeGreaterThan(150);
    expect(r.heard.f0).toBeLessThan(260);
  }
  for (const fly of m.flies)
    expect(existsSync(`public/sfx/${fly.sound}.wav`)).toBe(true);
});

test("each buzz beats at its fly's wingbeat", SLOW, () => {
  const m = model();
  for (const fly of m.flies) {
    const want = m.recordings[fly.recording].heard.f0 * fly.pitch;
    expect(Math.abs(heardIn(fly.sound).heard.f0 / want - 1)).toBeLessThan(0.03);
  }
});

test(
  "each buzz has its recording's overtones, harmonics 2 to 8 within 5 dB",
  SLOW,
  () => {
    const m = model();
    for (const fly of m.flies) {
      const want = m.recordings[fly.recording].heard.partials.slice(0, 7);
      const got = heardIn(fly.sound).heard.partials.slice(0, 7);
      got.forEach((db, k) => { expect(Math.abs(db - want[k])).toBeLessThan(5); });
    }
  },
);

test("each buzz has its recording's breath and flutter", SLOW, () => {
  const m = model();
  for (const fly of m.flies) {
    const want = m.recordings[fly.recording].heard;
    const { heard } = heardIn(fly.sound);
    heard.residual.forEach((db, b) => { expect(Math.abs(db - want.residual[b])).toBeLessThan(5); },
    );
    const rms = (bands: number[]) =>
      Math.sqrt(bands.reduce((sum, d) => sum + d * d, 0));
    const overall =
      rms(heard.texture.modulation) / rms(want.texture.modulation);
    expect(overall).toBeGreaterThan(1 / 1.5);
    expect(overall).toBeLessThan(1.5);
    heard.texture.modulation.forEach((depth, k) => {
      const ratio = depth / want.texture.modulation[k];
      expect(ratio).toBeGreaterThan(1 / 2.5);
      expect(ratio).toBeLessThan(2.5);
    });
  }
});

test("each buzz loops without a seam", () => {
  for (const fly of model().flies) {
    const { samples } = readWav(`${fly.sound}.wav`);
    let step = 0;
    for (let i = 1; i < samples.length; i++)
      step += Math.abs(samples[i] - samples[i - 1]);
    step /= samples.length - 1;
    const seam = Math.abs(samples[0] - samples[samples.length - 1]);
    expect(seam).toBeLessThan(4 * step);
  }
});
