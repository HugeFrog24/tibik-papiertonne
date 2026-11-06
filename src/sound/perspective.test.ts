import { expect, test } from "vitest";
import { heardAt, heardFrom } from "./perspective";

test("a sound twice as far off is heard at half the level (-6 dB), and never louder than at its reference distance", () => {
  expect(heardFrom(6, 3)).toBeCloseTo(0.5, 12);
  expect(heardFrom(24, 3)).toBeCloseTo(0.125, 12);
  expect(heardFrom(3, 3)).toBe(1);
  expect(heardFrom(1, 3)).toBe(1);
});

test("a sound is heard by its distance from the listener", () => {
  expect(heardAt([6, 1, 0], [0, 1, 0], 3)).toBeCloseTo(0.5, 12);
  expect(heardAt([1, 2, 2], [0, 0, 0], 3)).toBe(1);
});
