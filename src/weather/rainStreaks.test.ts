import { Vector3 } from "three";
import { expect, test } from "vitest";
import { frameHeightAt } from "../toon/frameHeight";
import { STREAK_LENGTH, STREAK_WIDTH, leastStreakLength, ribbon, streakOpacity, streakWidth } from "./rainStreaks";
import { FORMATS } from "../frameRate";

test("a streak is never thinner than 3 lines of a 1080-line frame wherever it falls, so a phone's downscale keeps it", () => {
  for (const fov of [30, 50, 60])
    for (const depth of [0.5, 2, 8, 25, 60]) expect(streakWidth(depth, fov) / frameHeightAt(depth, fov)).toBeGreaterThanOrEqual(3 / 1080 - 1e-12);
});

test("close to the lens a streak is as wide as a falling drop really is", () => {
  expect(streakWidth(0.3, 50)).toBe(STREAK_WIDTH.real);
  expect(STREAK_WIDTH.real).toBe(0.004);
});

test("the ribbon runs from tail to head and lies across the line of sight, its width the streak's at its distance", () => {
  const eye: [number, number, number] = [0, 1.5, 6];
  const tail: [number, number, number] = [1, 3.2, -2];
  const head: [number, number, number] = [1.03, 2.96, -2.02];
  const [a, b, c, d] = ribbon(tail, head, eye, 50).map((p) => new Vector3(...p));
  expect(a.clone().add(b).multiplyScalar(0.5).distanceTo(new Vector3(...tail))).toBeLessThan(1e-9);
  expect(c.clone().add(d).multiplyScalar(0.5).distanceTo(new Vector3(...head))).toBeLessThan(1e-9);
  const side = b.clone().sub(a);
  const mid = new Vector3(...tail).add(new Vector3(...head)).multiplyScalar(0.5);
  expect(side.length()).toBeCloseTo(streakWidth(mid.distanceTo(new Vector3(...eye)), 50), 9);
  expect(side.dot(new Vector3(...head).sub(new Vector3(...tail)))).toBeCloseTo(0, 9);
  expect(side.dot(mid.sub(new Vector3(...eye)))).toBeCloseTo(0, 9);
});

test("the frame at a depth is as tall as the lens sees there: twice as tall twice as far, and the ink pass measures by it", () => {
  expect(frameHeightAt(2, 50)).toBeCloseTo(4 * Math.tan((25 * Math.PI) / 180), 12);
  expect(frameHeightAt(4, 50)).toBeCloseTo(2 * frameHeightAt(2, 50), 12);
});

test("a streak's least drawn length is nine of its least widths", () => {
  expect(STREAK_LENGTH.leastPixels).toBe(9 * STREAK_WIDTH.leastPixels);
});

test("a streak drawn wider than a drop really is shows fainter for it, never below a third, and one drawn true to size at full strength", () => {
  expect(streakOpacity(0.3, 50)).toBe(1);
  for (const depth of [1, 3, 8, 20, 35]) expect(streakOpacity(depth + 1, 50)).toBeLessThanOrEqual(streakOpacity(depth, 50));
  expect(streakOpacity(20, 50)).toBeGreaterThanOrEqual(STREAK_WIDTH.faintest);
  expect(streakOpacity(20, 50)).toBeLessThan(0.5);
  expect(STREAK_WIDTH.faintest).toBeCloseTo(1 / 3, 12);
});

test("the least streak is measured in pixels of the frame it is drawn in: 3 px wide and 27 px long in 16:9 and in 9:16 alike, so the rain looks equally heavy in both", () => {
  for (const format of ["wide", "tall"] as const) {
    const height = FORMATS[format].height;
    expect((streakWidth(60, 50, format) / frameHeightAt(60, 50)) * height).toBeCloseTo(3, 9);
    expect(leastStreakLength(format) * height).toBeCloseTo(27, 9);
  }
});
