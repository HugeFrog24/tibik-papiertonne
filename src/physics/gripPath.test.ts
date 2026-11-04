import { expect, test } from "vitest";
import { aroundCorner } from "./gripPath";

const segmentDistance = (
  p: readonly [number, number],
  a: readonly [number, number],
  b: readonly [number, number],
) => {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const k = Math.min(
    1,
    Math.max(0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(p[0] - a[0] - k * dx, p[1] - a[1] - k * dy);
};

const start = [0.5, 0] as const;
const corner = [1, 0] as const;
const end = [1, 0.5] as const;
const path = aroundCorner(start, corner, end, 0.1);
const samples = Array.from({ length: 201 }, (_, i) => path(i / 200));

test("the hand keeps the same gap from both edges all the way round the corner", () => {
  for (const p of samples)
    expect(
      Math.min(segmentDistance(p, start, corner), segmentDistance(p, corner, end)),
    ).toBeCloseTo(0.1, 9);
});

test("it starts off the first edge and ends off the second, on the outside", () => {
  expect(path(0)[0]).toBeCloseTo(0.5, 9);
  expect(path(0)[1]).toBeCloseTo(-0.1, 9);
  expect(path(1)[0]).toBeCloseTo(1.1, 9);
  expect(path(1)[1]).toBeCloseTo(0.5, 9);
  expect(path(-1)).toEqual(path(0));
  expect(path(2)).toEqual(path(1));
});

test("it moves at an even pace, without jumps", () => {
  const length = 0.5 + (Math.PI / 2) * 0.1 + 0.5;
  for (let i = 1; i < samples.length; i++) {
    const step = Math.hypot(
      samples[i][0] - samples[i - 1][0],
      samples[i][1] - samples[i - 1][1],
    );
    expect(step).toBeLessThanOrEqual(length / 200 + 1e-9);
    expect(step).toBeGreaterThan((0.9 * length) / 200);
  }
});
