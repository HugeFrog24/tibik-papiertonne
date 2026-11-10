import { expect, test } from "vitest";
import { throughArm } from "./armDescent";

test("an arm moved through a pose leaves the first, passes the middle one halfway and arrives at the last, without stopping on the way", () => {
  const from = { raise: 0, out: 0.9, elbow: 0.8, inward: 1.6 };
  const via = { raise: 0.8, out: 0.9, elbow: 1.6, inward: 0.9 };
  const to = { raise: 1.7, out: 0.5, elbow: 2.3, inward: 0.3 };
  expect(throughArm(from, via, to, 0)).toEqual(from);
  expect(throughArm(from, via, to, 1)).toEqual(to);
  for (const key of ["raise", "out", "elbow", "inward"] as const) expect(throughArm(from, via, to, 0.5)[key]).toBeCloseTo(via[key], 9);
  const speed = (w: number) => (throughArm(from, via, to, w + 1e-4).raise - throughArm(from, via, to, w).raise) / 1e-4;
  expect(speed(0.5)).toBeGreaterThan(0.5);
});
