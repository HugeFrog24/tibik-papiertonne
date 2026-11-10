import { expect, test } from "vitest";
import { relaxed, type Relaxing } from "./spring";

test("an offset left at rest halves in its half-life and keeps easing towards nothing", () => {
  let state: Relaxing = { offset: [0.04, 0, 0], speed: [0, 0, 0] };
  let sawHalf = false;
  for (let i = 1; i <= 30; i++) {
    state = relaxed(state, 1 / 300, 0.1);
    if (i === 30) sawHalf = Math.abs(state.offset[0] - 0.02) < 0.0005;
  }
  expect(sawHalf).toBe(true);
});

test("a disturbed offset eases back without overshooting the rest point", () => {
  let state: Relaxing = { offset: [0.05, -0.03, 0.01], speed: [0, 0, 0] };
  for (let i = 0; i < 120; i++) {
    state = relaxed(state, 1 / 30, 0.1);
    expect(state.offset[0]).toBeGreaterThanOrEqual(0);
    expect(state.offset[1]).toBeLessThanOrEqual(0);
    expect(state.offset[2]).toBeGreaterThanOrEqual(0);
  }
  expect(state.offset).toEqual([0, 0, 0]);
});
