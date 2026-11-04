import { expect, test } from "vitest";
import { easeUnit, inWindow } from "./scalar";

test("easeUnit eases from 0 to 1 and holds outside", () => {
  expect(easeUnit(-1)).toBe(0);
  expect(easeUnit(0)).toBe(0);
  expect(easeUnit(0.5)).toBe(0.5);
  expect(easeUnit(1)).toBe(1);
  expect(easeUnit(2)).toBe(1);
});

test("inWindow eases across a time window, 0 before and 1 after", () => {
  expect(inWindow(0, [1, 3])).toBe(0);
  expect(inWindow(2, [1, 3])).toBe(0.5);
  expect(inWindow(4, [1, 3])).toBe(1);
  let before = 0;
  for (let t = 1; t <= 3; t += 0.05) {
    expect(inWindow(t, [1, 3])).toBeGreaterThanOrEqual(before);
    before = inWindow(t, [1, 3]);
  }
});
