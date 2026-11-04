import { expect, test } from "vitest";
import { trimsOf } from "./SoundCues";

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
