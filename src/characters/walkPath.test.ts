import { expect, test } from "vitest";
import { walkAt, type Walk } from "./walkPath";

const speedAt = (walk: Walk, t: number, dt = 1e-3) => {
  const a = walkAt(walk, t);
  const b = walkAt(walk, t + dt);
  return Math.hypot(b.x - a.x, b.z - a.z) / dt;
};

test("a walk given a start and an end speed is moving at the one from its first instant, ends at the other, never stops between and covers the whole path", () => {
  const walk: Walk = { from: 0, to: 3, via: [[0, 0], [0, 1], [1, 2], [3, 2]], startSpeed: 0.8, endSpeed: 1.6 };
  expect(speedAt(walk, 0)).toBeCloseTo(0.8, 1);
  expect(speedAt(walk, 3 - 1e-3)).toBeCloseTo(1.6, 1);
  for (let i = 0; i < 59; i++) expect(speedAt(walk, i * 0.05)).toBeGreaterThan(0.3);
  const end = walkAt(walk, 3);
  expect(end.x).toBeCloseTo(3, 6);
  expect(end.z).toBeCloseTo(2, 6);
});
