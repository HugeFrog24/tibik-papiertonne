import { expect, test } from "vitest";
import { Vector3 } from "three";
import { JOLT, joltAt, jolted } from "./cameraJolt";
import type { CameraSetup } from "./shots";

const still: CameraSetup = { position: [0, 1.5, 0], target: [0, 1.5, -3], fov: 50 };
const one = [{ at: 1, strength: 1 }];
const size = (t: number) => joltAt(t, one).shift.length();

test("a jolt is still before the blow, starts without a jump at the blow, peaks within two frames and has died away before her next blow 0.4 s later", () => {
  expect(size(0.99)).toBe(0);
  expect(size(1)).toBeLessThan(1e-9);
  const peak = Math.max(...Array.from({ length: 70 }, (_, i) => size(1 + (i + 1) / 1000)));
  expect(peak).toBeGreaterThan(0.004);
  expect(peak).toBeLessThanOrEqual(JOLT.lift * (1 + JOLT.vary) + 1e-9);
  const peakAt = Array.from({ length: 70 }, (_, i) => 1 + (i + 1) / 1000).find((t) => size(t) === peak)!;
  expect(peakAt - 1).toBeLessThan(2 / 30);
  expect(size(1.25)).toBeLessThan(peak * 0.05);
  expect(size(1.4)).toBe(0);
});

test("a weaker jolt moves the camera proportionally less, and each blow jolts it a little differently", () => {
  const weak = joltAt(1.02, [{ at: 1, strength: 0.6 }]).shift.length();
  expect(weak / size(1.02)).toBeCloseTo(0.6, 9);
  const a = joltAt(1.02, one).shift.normalize();
  const b = joltAt(2.02, [{ at: 2, strength: 1 }]).shift.normalize();
  expect(a.angleTo(b)).toBeGreaterThan(0.01);
  expect(a.y).toBeGreaterThan(0.8);
});

test("no two blows land alike: each jolt's size differs a little too, within a sixth either way", () => {
  const peakOf = (at: number) => Math.max(...Array.from({ length: 70 }, (_, i) => joltAt(at + (i + 1) / 1000, [{ at, strength: 1 }]).shift.length()));
  const peaks = [31.4, 31.8, 32.2, 32.6, 33.6, 34].map(peakOf);
  expect(Math.max(...peaks) / Math.min(...peaks)).toBeGreaterThan(1.05);
  peaks.forEach((p) => { expect(Math.abs(p / JOLT.lift - 1)).toBeLessThanOrEqual(JOLT.vary + 1e-9); });
  expect(JOLT.vary).toBeLessThanOrEqual(1 / 6);
});

test("a jolted camera shifts and tips but keeps looking the same distance ahead, its up still a unit vector across its view", () => {
  const at = jolted(() => still, one);
  expect(at(0.5)).toEqual(still);
  const shaken = at(1.02);
  const position = new Vector3(...shaken.position);
  const view = new Vector3(...shaken.target).sub(position);
  expect(position.distanceTo(new Vector3(...still.position))).toBeGreaterThan(0.003);
  expect(view.length()).toBeCloseTo(3, 9);
  expect(view.angleTo(new Vector3(0, 0, -1))).toBeGreaterThan(0.0005);
  expect(view.angleTo(new Vector3(0, 0, -1))).toBeLessThan(JOLT.turn * 1.5);
  const up = new Vector3(...shaken.up!);
  expect(up.length()).toBeCloseTo(1, 9);
  expect(Math.abs(up.dot(view.normalize()))).toBeLessThan(1e-9);
});

test("a jolt comes to rest without a jump: just before it ends the camera is already back where it was, so no frame pops at its end", () => {
  const end = 1 + JOLT.lasts;
  const pitch = (t: number) => Math.abs(joltAt(t, one).pitch);
  expect(size(end - 1e-9)).toBeLessThan(1e-9);
  expect(pitch(end - 1e-9)).toBeLessThan(1e-9);
  expect(size(end + 1e-9)).toBe(0);
});
