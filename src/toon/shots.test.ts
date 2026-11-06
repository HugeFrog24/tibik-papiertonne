import { expect, test } from "vitest";
import { filmShownIn, fixed, filmTimeIn, heardUntilIn, storyJumpsIn, storyTimeIn, type Shot } from "./shots";

const SHOTS: readonly Shot[] = [
  { name: "plain", from: 0, to: 2, at: fixed([0, 0, 0], [0, 0, -1], 50) },
  { name: "later", from: 2, to: 4, story: 100, at: fixed([0, 0, 0], [0, 0, -1], 50) },
];

test("story time equals film time in a shot without a story start, and runs from its story start in one with it", () => {
  expect(storyTimeIn(SHOTS)(1)).toBe(1);
  expect(storyTimeIn(SHOTS)(3)).toBe(101);
  expect(filmTimeIn(SHOTS)(101)).toBe(3);
  expect(filmTimeIn(SHOTS)(1)).toBe(1);
  expect(filmTimeIn(SHOTS)(50)).toBeNull();
});

test("story time is the story start plus the time into the shot, summed in that order so a shot list gives the values it always gave", () => {
  const shots: readonly Shot[] = [{ name: "late", from: 0.1, to: 1, story: 0.7, at: fixed([0, 0, 0], [0, 0, -1], 50) }];
  expect(storyTimeIn(shots)(0.3)).toBe(0.7 + (0.3 - 0.1));
  expect(filmTimeIn(shots)(0.9)).toBe(0.1 + (0.9 - 0.7));
});

test("a story jump is a cut where story time leaps, and a sound is heard until the next jump or the end", () => {
  const at = fixed([0, 0, 0], [0, 0, -1], 50);
  const shots: readonly Shot[] = [
    { name: "a", from: 0, to: 2, at },
    { name: "b", from: 2, to: 3, story: 2, at },
    { name: "c", from: 3, to: 5, story: 40, at },
    { name: "d", from: 5, to: 6, story: 42, at },
  ];
  expect(storyJumpsIn(shots)).toEqual([3]);
  const until = heardUntilIn(shots, 6);
  expect([until(1), until(2.99), until(3), until(5.5)]).toEqual([3, 3, 6, 6]);
});

test("a story moment is shown at its film time, and one in a skipped stretch at the cut after it", () => {
  const shown = filmShownIn(SHOTS);
  expect([shown(1), shown(50), shown(101)]).toEqual([1, 2, 3]);
});
