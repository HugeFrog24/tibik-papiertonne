import { expect, test } from "vitest";
import { TIMELINE_FPS } from "./frameRate";
import { STEADY, heldClock } from "./sceneClock";

const SAMPLES = Array.from({ length: 2000 }, (_, i) => i * 0.0173);

test("a steady scene clock is the film's own: every moment of the story is the moment on screen", () => {
  for (const t of SAMPLES) {
    expect(STEADY.storyAt(t)).toBe(t);
    expect(STEADY.editAt(t)).toBe(t);
  }
  expect(STEADY.frames).toBe(0);
});

test("a hold stops the story at its moment for its frames while the film runs on, then the story carries on from where it stopped", () => {
  const clock = heldClock([{ at: 2, frames: 15 }]);
  const held = 15 / TIMELINE_FPS;
  expect(clock.frames).toBe(15);
  expect(clock.storyAt(1.5)).toBe(1.5);
  expect(clock.storyAt(2)).toBe(2);
  expect(clock.storyAt(2 + held / 2)).toBe(2);
  expect(clock.storyAt(2 + held)).toBeCloseTo(2, 12);
  expect(clock.storyAt(3 + held)).toBeCloseTo(3, 12);
  expect(clock.editAt(1.5)).toBe(1.5);
  expect(clock.editAt(2)).toBe(2);
  expect(clock.editAt(3)).toBeCloseTo(3 + held, 12);
});

test("holds add up, each one moving everything after it, and the film's moment of a story moment always shows that story moment", () => {
  const clock = heldClock([{ at: 5, frames: 9 }, { at: 1, frames: 6 }]);
  expect(clock.frames).toBe(15);
  expect(clock.editAt(4)).toBeCloseTo(4 + 6 / TIMELINE_FPS, 12);
  expect(clock.editAt(6)).toBeCloseTo(6 + 15 / TIMELINE_FPS, 12);
  for (const story of SAMPLES) expect(clock.storyAt(clock.editAt(story)), `${story}`).toBeCloseTo(story, 9);
  let last = -Infinity;
  for (const t of SAMPLES) {
    expect(clock.storyAt(t), `${t}`).toBeGreaterThanOrEqual(last - 1e-12);
    last = clock.storyAt(t);
  }
});
