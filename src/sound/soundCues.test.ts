import { expect, test } from "vitest";
import { playable, trimsOf } from "./SoundCues";

test("a cue that skips into its sound still plays for its whole length", () => {
  expect(trimsOf({ skip: 0.2, length: 2.2 }, 30)).toEqual({
    trimBefore: 6,
    trimAfter: 72,
  });
  expect(trimsOf({ length: 1 }, 30)).toEqual({
    trimBefore: undefined,
    trimAfter: 30,
  });
  expect(trimsOf({ skip: 3 }, 30)).toEqual({
    trimBefore: 90,
    trimAfter: undefined,
  });
});

test("a cue cut to less than a frame is left out rather than crashing the render", () => {
  expect(playable({ length: 0.01 }, 30)).toBe(false);
  expect(playable({ skip: 0.5, length: 0.01 }, 30)).toBe(false);
  expect(playable({ length: 1 / 30 }, 30)).toBe(true);
  expect(playable({ skip: 3 }, 30)).toBe(true);
  expect(playable({}, 30)).toBe(true);
});
