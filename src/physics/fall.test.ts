import { expect, test } from "vitest";
import { GRAVITY, heightAfter, landsAfter, upSpeedToLand } from "./fall";

test("a thing let go from rest falls g t²/2 and lands after the square root of 2h/g", () => {
  expect(GRAVITY).toBeCloseTo(9.81, 6);
  expect(landsAfter(1.2, 0)).toBeCloseTo(Math.sqrt((2 * 1.2) / GRAVITY), 9);
  expect(heightAfter(2, 0, landsAfter(1.2, 0))).toBeCloseTo(0.8, 9);
});

test("flicked downwards it lands sooner, tossed upwards later", () => {
  expect(landsAfter(1, -0.5)).toBeLessThan(landsAfter(1, 0));
  expect(landsAfter(1, 0.5)).toBeGreaterThan(landsAfter(1, 0));
  expect(heightAfter(0, -0.5, landsAfter(1, -0.5))).toBeCloseTo(-1, 9);
});

test("the up speed that lands a throw after a chosen flight brings it down exactly then", () => {
  const up = upSpeedToLand(0.7, 0.42);
  expect(heightAfter(0, up, 0.42)).toBeCloseTo(-0.7, 9);
  expect(landsAfter(0.7, up)).toBeCloseTo(0.42, 9);
});
