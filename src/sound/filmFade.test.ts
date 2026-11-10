import { expect, test } from "vitest";
import { FILM_FADE, filmFadeAt } from "./filmFade";
import { MIX, throughTheBus } from "./MixAudio";
import { FILM_FRAMES, TIMELINE_FPS } from "../timeline";

const LENGTH = FILM_FRAMES / TIMELINE_FPS;

test("the film's sound fades in from silence over its first half second and out to silence over its last seconds, full in between", () => {
  expect(filmFadeAt(0, LENGTH)).toBe(0);
  expect(filmFadeAt(FILM_FADE.in, LENGTH)).toBe(1);
  expect(filmFadeAt(LENGTH / 2, LENGTH)).toBe(1);
  expect(filmFadeAt(LENGTH - FILM_FADE.out, LENGTH)).toBe(1);
  expect(filmFadeAt(LENGTH, LENGTH)).toBe(0);
  expect(FILM_FADE.in).toBeLessThanOrEqual(0.5);
  expect(FILM_FADE.out).toBeGreaterThanOrEqual(2);
});

test("both fades run on an S-curve: they start and end gently and pass half level halfway", () => {
  const fadeIn = (k: number) => filmFadeAt(k * FILM_FADE.in, LENGTH);
  const fadeOut = (k: number) => filmFadeAt(LENGTH - FILM_FADE.out + k * FILM_FADE.out, LENGTH);
  expect(fadeIn(0.5)).toBeCloseTo(0.5, 2);
  expect(fadeOut(0.5)).toBeCloseTo(0.5, 2);
  expect(fadeIn(0.1)).toBeLessThan(0.05);
  expect(1 - fadeOut(0.1)).toBeLessThan(0.05);
  for (let k = 0; k < 1; k += 0.05) {
    expect(fadeIn(k + 0.05)).toBeGreaterThanOrEqual(fadeIn(k));
    expect(fadeOut(k + 0.05)).toBeLessThanOrEqual(fadeOut(k));
  }
});

test("every sound passes the film's fade on its way through the mix bus, set levels and volume curves alike", () => {
  expect(throughTheBus(0.5, 0.25)).toBeCloseTo(0.5 * MIX.headroom * 0.25, 12);
  expect(throughTheBus(undefined, 0.25)).toBeCloseTo(MIX.headroom * 0.25, 12);
  const curve = throughTheBus((f: number) => f / 100, 0.5);
  expect(typeof curve === "function" ? curve(40) : NaN).toBeCloseTo(0.4 * MIX.headroom * 0.5, 12);
  expect(throughTheBus(0.5)).toBeCloseTo(0.5 * MIX.headroom, 12);
});
