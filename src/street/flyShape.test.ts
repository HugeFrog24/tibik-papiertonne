import { expect, test } from "vitest";
import { FLY } from "./flyShape";

const parts = [FLY.head, FLY.thorax, FLY.abdomen];

test("a fly is house-fly sized: 6-7 mm from head to tail, 13-15 mm across the wings", () => {
  const length = parts.reduce((sum, p) => sum + p.length, 0);
  expect(length).toBeGreaterThanOrEqual(0.006);
  expect(length).toBeLessThanOrEqual(0.007);
  const widest = Math.max(...parts.map((p) => p.width));
  const wingspan = widest + 2 * FLY.wing.length;
  expect(wingspan).toBeGreaterThanOrEqual(0.013);
  expect(wingspan).toBeLessThanOrEqual(0.015);
});

test("it has six legs, none longer than its body", () => {
  const length = parts.reduce((sum, p) => sum + p.length, 0);
  expect(FLY.legs.pairs * 2).toBe(6);
  expect(FLY.legs.upper + FLY.legs.lower).toBeLessThanOrEqual(length);
});
