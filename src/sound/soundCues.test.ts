import { expect, test } from "vitest";
import { cueVolume, playable, trimsOf } from "./SoundCues";

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

test("a cue that fades out keeps its full volume until the fade, falls evenly through it and is silent at its very end, even when cut into pieces", () => {
  const whole = cueVolume({ volume: 0.5, length: 3, fadeOut: 1 }, 30);
  if (typeof whole !== "function") throw new Error("a fading cue needs a volume curve");
  expect(whole(0)).toBeCloseTo(0.5, 9);
  expect(whole(60)).toBeCloseTo(0.5, 9);
  expect(whole(75)).toBeCloseTo(0.25, 9);
  expect(whole(90)).toBeCloseTo(0, 9);
  const head = cueVolume({ volume: 0.5, length: 2.5, fadeOut: 1, restAfter: 0.5 }, 30);
  if (typeof head !== "function") throw new Error("a fading piece needs a volume curve");
  expect(head(75)).toBeCloseTo(0.25, 9);
  expect(cueVolume({ volume: 0.5, length: 3 }, 30)).toBe(0.5);
});

test("a cue played a touch faster or slower still lasts its length on screen: the trim counts frames of the sound file, so it covers length x rate of it", () => {
  expect(trimsOf({ length: 1, rate: 0.97 }, 30)).toEqual({ trimBefore: undefined, trimAfter: 29 });
  expect(trimsOf({ skip: 0.2, length: 2, rate: 1.03 }, 30)).toEqual({ trimBefore: 6, trimAfter: 68 });
  expect(trimsOf({ skip: 3, rate: 1.03 }, 30)).toEqual({ trimBefore: 90, trimAfter: undefined });
});
