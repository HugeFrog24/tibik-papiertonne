import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { readWav } from "../../sound/wavFile";
import { bellPresses, type BellStorm } from "../../../scripts/bell-presses.mjs";
import { BELL_HOLDS, BELL_PRESSES, STEP_BACK, bellRings } from "./choreography";
import { solveKlingelsturm } from "./solve";
import { armJumpsOver, framesFrom, karenIn } from "../sceneChecks";
import { TO_THE_DOOR } from "./door";
import { bellCues } from "./doorCues";
import { shotAt } from "./cameras";
import { round6 } from "../../characters/scalar";

type Rhythm = {
  readonly eighth: number;
  readonly slots: readonly number[];
  readonly offGrid: number;
};

const learned = () =>
  JSON.parse(
    readFileSync("assets/recordings/doorbell-rhythm.model.json", "utf8"),
  ) as Rhythm;

const groupsOf = (slots: readonly number[]) => {
  const [first, second, ...rest] = slots;
  const groups = [[first, second]];
  for (const slot of rest)
    if (
      slot - groups[groups.length - 1][groups[groups.length - 1].length - 1] ===
      1
    )
      groups[groups.length - 1].push(slot);
    else groups.push([slot]);
  return groups;
};

test("the clapped recording is a 2-3-4-2 rhythm on an eighth-note grid near 140 BPM", () => {
  const rhythm = learned();
  expect(rhythm.slots).toEqual([0, 2, 4, 5, 6, 8, 9, 10, 11, 13, 14]);
  expect(groupsOf(rhythm.slots).map((g) => g.length)).toEqual([2, 3, 4, 2]);
  expect(rhythm.eighth).toBeGreaterThan(0.205);
  expect(rhythm.eighth).toBeLessThan(0.225);
  expect(rhythm.offGrid).toBeLessThan(0.025);
});

test("Karen rings that rhythm, looped every two bars, until Tibik reaches his door", () => {
  const { eighth, slots } = learned();
  const rings = bellRings();
  expect(rings.length).toBeGreaterThan(slots.length);
  const first = rings[0].at;
  rings.forEach((ring, k) => {
    const slot = 16 * Math.floor(k / slots.length) + slots[k % slots.length];
    expect(ring.at, `press ${k + 1}`).toBeCloseTo(first + slot * eighth, 5);
    expect(ring.length).toBeCloseTo(rings[0].length, 5);
  });
  expect(rings[0].length).toBeLessThan(eighth * 0.8);
  expect(rings[0].length).toBeGreaterThan(eighth * 0.4);
  const last = rings[rings.length - 1];
  expect(last.at + last.length).toBeLessThanOrEqual(STEP_BACK[0] + 1e-9);
  expect(last.at).toBeGreaterThan(TO_THE_DOOR[1] - 2 * eighth);
});

test("the bell sound carries the rhythm to the sample, not to the video frame", () => {
  const { rate, samples } = readWav("phone/bell-storm.wav");
  const window = Math.round(rate * 0.002);
  const on: [number, number][] = [];
  for (let i = 0; i + window <= samples.length; i += window) {
    let peak = 0;
    for (let k = i; k < i + window; k++)
      peak = Math.max(peak, Math.abs(samples[k]));
    const t = i / rate;
    if (peak > 0.05) {
      const open = on.at(-1);
      if (open && t - open[1] < 0.01) open[1] = t + window / rate;
      else on.push([t, t + window / rate]);
    }
  }
  const rings = bellRings();
  expect(on).toHaveLength(rings.length);
  on.forEach(([from, to], k) => {
    expect(Math.abs(from - (rings[k].at - rings[0].at))).toBeLessThan(0.003);
    expect(Math.abs(to - from - rings[k].length)).toBeLessThan(0.005);
  });
});

test("the whole storm plays as one sound, dry in his Flur and through his door on the landing", () => {
  const rings = bellRings();
  const start = rings[0].at;
  const cues = bellCues();
  for (const ring of rings) {
    const t = ring.at + ring.length / 2;
    const playing = cues.filter(
      (c) => c.length !== undefined && t >= c.at && t < c.at + c.length,
    );
    expect(playing, `${t.toFixed(2)} s`).toHaveLength(1);
    const [cue] = playing;
    expect(cue.sound).toBe(
      shotAt(t).name === "Flur: packing"
        ? "phone/bell-storm"
        : "stairwell/phone/bell-storm-door",
    );
    expect(cue.skip ?? 0).toBeCloseTo(cue.at - start, 9);
  }
  const last = rings[rings.length - 1];
  const after = last.at + last.length + 1;
  expect(
    cues.some(
      (c) =>
        c.sound === "stairwell/phone/bell-storm-door" &&
        c.length !== undefined &&
        after >= c.at &&
        after < c.at + c.length,
    ),
  ).toBe(true);
});

test("the one press schedule both the picture and the baked sound use: none when no press fits", () => {
  const storm = JSON.parse(
    readFileSync("src/scenes/klingelsturm/bellStorm.json", "utf8"),
  ) as BellStorm;
  expect(bellPresses({ ...storm, until: storm.from }, learned())).toEqual([]);
  expect(bellPresses(storm, learned())).toEqual(
    bellRings().map((r) => [r.at, round6(r.at + r.length)]),
  );
});

test("she raises her hand to the bell in front of her instead of swinging it out through the staircase wall: from one frame to the next her arm never flips while it reaches", { timeout: 300_000 }, () => {
  const [hold] = BELL_HOLDS;
  expect(armJumpsOver(framesFrom(hold.reach - 0.15, hold.grip - hold.reach + 0.3), karenIn(solveKlingelsturm))).toEqual([]);
});

test("done ringing, her hand comes back off the bell and down to her side in one move, never knocked along the wall beside his door", { timeout: 300_000 }, () => {
  const [, lastUp] = BELL_PRESSES[BELL_PRESSES.length - 1];
  const knocked = armJumpsOver(framesFrom(lastUp, 0.8), karenIn(solveKlingelsturm), [], { turn: 0.3, hand: 0.08 });
  expect(knocked.filter((line) => line.includes("leftArm"))).toEqual([]);
});
