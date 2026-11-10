import { expect, test } from "vitest";
import { decibelGain, easeUnit, inWindow, plusMinus, windowUnit } from "./scalar";

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

test("windowUnit runs straight from 0 at a window's start to 1 at its end, held outside it, and inWindow eases the same window", () => {
  expect(windowUnit(1, [1, 3])).toBe(0);
  expect(windowUnit(2, [1, 3])).toBe(0.5);
  expect(windowUnit(3, [1, 3])).toBe(1);
  expect(windowUnit(0, [1, 3])).toBe(0);
  expect(windowUnit(4, [1, 3])).toBe(1);
  for (const t of [0, 1.3, 2, 2.7, 4]) expect(inWindow(t, [1, 3])).toBe(easeUnit(windowUnit(t, [1, 3])));
});

test("a seeded plus-minus value lies between -1 and 1, is the same every time for its seed and differs between seeds", () => {
  const values = Array.from({ length: 50 }, (_, i) => plusMinus(`seed ${i}`));
  for (const v of values) {
    expect(v).toBeGreaterThanOrEqual(-1);
    expect(v).toBeLessThan(1);
  }
  expect(Array.from({ length: 50 }, (_, i) => plusMinus(`seed ${i}`))).toEqual(values);
  expect(new Set(values).size).toBe(50);
  expect(Math.min(...values)).toBeLessThan(-0.5);
  expect(Math.max(...values)).toBeGreaterThan(0.5);
});

test("a level in decibels becomes its amplitude gain: 0 dB keeps it, -6 dB about halves it, +20 dB is ten times", () => {
  expect(decibelGain(0)).toBe(1);
  expect(decibelGain(-6)).toBeCloseTo(0.501, 3);
  expect(decibelGain(20)).toBeCloseTo(10, 9);
});
