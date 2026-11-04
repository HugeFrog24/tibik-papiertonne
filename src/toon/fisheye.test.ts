import { expect, test } from "vitest";
import {
  FISHEYE,
  barrel,
  distortUv,
  fisheyeTargetSize,
  insideLens,
  lensPoint,
  unbarrel,
  undistortUv,
} from "./fisheye";

test("the centre of the lens doesn't move", () => {
  expect(barrel([0, 0], FISHEYE.strength)).toEqual([0, 0]);
});

test("distortion grows with distance from the centre and keeps direction", () => {
  let before = 0;
  for (let r = 0.1; r < 0.95; r += 0.1) {
    const [x, y] = barrel([r, 0], FISHEYE.strength);
    const length = Math.hypot(x, y);
    expect(length).toBeGreaterThan(before);
    expect(length).toBeLessThan(r);
    before = length;
  }
  const [x, y] = barrel([0.3, 0.4], FISHEYE.strength);
  expect(x * 0.4 - y * 0.3).toBeCloseTo(0, 12);
  expect(x * 0.3 + y * 0.4).toBeGreaterThan(0);
});

test("the frame is round", () => {
  expect(insideLens([0.75, 0.75])).toBe(false);
  expect(insideLens([0.6, 0.6])).toBe(true);
});

test("the render target follows the canvas size", () => {
  expect(fisheyeTargetSize(1920, 1080, 1)).toEqual([1920, 1080]);
  expect(fisheyeTargetSize(960, 540, 2)).toEqual([1920, 1080]);
});

test("on a wide frame the lens is round in pixels and samples stay on screen", () => {
  const aspect = 1920 / 1080;
  expect(distortUv([0.5, 0.5], aspect, FISHEYE.strength)).toEqual([0.5, 0.5]);
  const rim = lensPoint([0.5 + 540 / 1920, 0.5], aspect);
  expect(Math.hypot(rim[0], rim[1])).toBeCloseTo(1, 12);
  const top = lensPoint([0.5, 1], aspect);
  expect(Math.hypot(top[0], top[1])).toBeCloseTo(1, 12);
  for (const u of [0.25, 0.4, 0.6, 0.75])
    for (const v of [0.05, 0.5, 0.95]) {
      if (!insideLens(lensPoint([u, v], aspect))) continue;
      const [su, sv] = distortUv([u, v], aspect, FISHEYE.strength);
      expect(su).toBeGreaterThanOrEqual(0);
      expect(su).toBeLessThanOrEqual(1);
      expect(sv).toBeGreaterThanOrEqual(0);
      expect(sv).toBeLessThanOrEqual(1);
    }
});

test("on a square frame the shader's mapping is barrel()", () => {
  const [su, sv] = distortUv([0.8, 0.3], 1, FISHEYE.strength);
  const [bx, by] = barrel([0.6, -0.4], FISHEYE.strength);
  expect(su).toBeCloseTo(bx * 0.5 + 0.5, 12);
  expect(sv).toBeCloseTo(by * 0.5 + 0.5, 12);
});

test("unbarrel undoes barrel, so a point in the scene can be found in the lens", () => {
  for (const p of [
    [0, 0],
    [0.3, 0.1],
    [-0.5, 0.6],
    [0.05, -0.9],
  ] as const) {
    const back = barrel(unbarrel(p, FISHEYE.strength), FISHEYE.strength);
    expect(back[0]).toBeCloseTo(p[0], 9);
    expect(back[1]).toBeCloseTo(p[1], 9);
  }
});

test("a point placed through the lens samples itself back", () => {
  const aspect = 1920 / 1080;
  const [u, v] = undistortUv([0.62, 0.41], aspect, FISHEYE.strength);
  const [su, sv] = distortUv([u, v], aspect, FISHEYE.strength);
  expect(su).toBeCloseTo(0.62, 9);
  expect(sv).toBeCloseTo(0.41, 9);
});
