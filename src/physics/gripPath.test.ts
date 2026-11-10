import { expect, test } from "vitest";
import { Vector3 } from "three";
import { aroundCorner, joined, spiralAround } from "./gripPath";
import { distanceToSegment } from "../characters/scalar";


const start = [0.5, 0] as const;
const corner = [1, 0] as const;
const end = [1, 0.5] as const;
const path = aroundCorner(start, corner, end, 0.1);
const samples = Array.from({ length: 201 }, (_, i) => path(i / 200));

test("the hand keeps the same gap from both edges all the way round the corner", () => {
  for (const p of samples)
    expect(
      Math.min(distanceToSegment(p, start, corner), distanceToSegment(p, corner, end)),
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

test("a spiral round an edge runs from one point to the other the long way if it must, never through the side the edge blocks, and never nearer the edge than its nearer end", () => {
  const edge = [0, 0] as const;
  const from = [0.085, 0.02] as const;
  const to = [-0.12, 0.04] as const;
  const spiral = spiralAround(edge, from, to, [0, 1]);
  expect(spiral(0)[0]).toBeCloseTo(from[0], 9);
  expect(spiral(0)[1]).toBeCloseTo(from[1], 9);
  expect(spiral(1)[0]).toBeCloseTo(to[0], 9);
  expect(spiral(1)[1]).toBeCloseTo(to[1], 9);
  const nearest = Math.min(Math.hypot(...from), Math.hypot(...to));
  for (let i = 0; i <= 200; i++) {
    const [x, y] = spiral(i / 200);
    expect(Math.hypot(x, y)).toBeGreaterThanOrEqual(nearest - 1e-9);
    expect(x > 0.01 || x < -0.01 || y < 0, `${i}`).toBe(true);
  }
  expect(Math.min(...Array.from({ length: 201 }, (_, i) => spiral(i / 200)[1]))).toBeLessThan(-0.08);
});

test("joined pieces run end to end, sharing the time by their lengths, so the pace is even across the join", () => {
  const a = new Vector3(0, 0, 0);
  const b = new Vector3(0.3, 0, 0);
  const c = new Vector3(0.3, 0.1, 0);
  const path = joined((u) => a.clone().lerp(b, u), (u) => b.clone().lerp(c, u));
  expect(path(0).distanceTo(a)).toBeCloseTo(0, 9);
  expect(path(0.75).distanceTo(b)).toBeCloseTo(0, 9);
  expect(path(1).distanceTo(c)).toBeCloseTo(0, 9);
  expect(path(-1).distanceTo(a)).toBeCloseTo(0, 9);
  expect(path(2).distanceTo(c)).toBeCloseTo(0, 9);
  for (let i = 1; i <= 100; i++) expect(path(i / 100).distanceTo(path((i - 1) / 100))).toBeCloseTo(0.004, 9);
});
