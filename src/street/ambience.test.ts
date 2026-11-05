import { expect, test } from "vitest";
import {
  STORY_END,
  haustuerAt,
  treppenhausIndoors,
} from "../scenes/treppenhaus/choreography";
import {
  FILM_FRAMES,
  FPS,
  KLINGELSTURM_FROM,
  RUNDSCHREIBEN_FROM,
  TREPPENHAUS_FRAMES,
  filmIndoors,
} from "../timeline";
import { breeze } from "../physics/wind";
import { STREET_LOOPS, loopVolume } from "./ambienceLoops";

const storyFrames = Array.from(
  { length: Math.floor(STORY_END * FPS) + 1 },
  (_, f) => f / FPS,
);

test("indoors is fully muffled until the Haustür opens", () => {
  const shut = storyFrames.filter((t) => haustuerAt(t) === 0);
  expect(shut.length).toBeGreaterThan(0);
  for (const t of shut)
    expect(treppenhausIndoors(t), `${t.toFixed(2)} s`).toBe(1);
});

test("the street is fully open from the Haustür until the Klingelsturm cut, heard from indoors on the landing, open again in the rain, and muffled once the Haustür shuts behind him", () => {
  const indoorsFrom = Math.round(KLINGELSTURM_FROM * FPS);
  const rainFrom = Math.round(RUNDSCHREIBEN_FROM * FPS);
  expect(filmIndoors(TREPPENHAUS_FRAMES - 1)).toBe(0);
  for (let f = TREPPENHAUS_FRAMES; f < indoorsFrom; f++)
    expect(filmIndoors(f)).toBe(0);
  for (let f = indoorsFrom; f < rainFrom; f++)
    expect(filmIndoors(f)).toBe(1);
  expect(filmIndoors(rainFrom)).toBe(0);
  expect(filmIndoors(FILM_FRAMES - 1)).toBe(1);
  for (let f = rainFrom + 1; f < FILM_FRAMES; f++)
    expect(Math.abs(filmIndoors(f) - filmIndoors(f - 1)), `frame ${f}`).toBeLessThanOrEqual(0.15);
});

test("indoors never jumps", () => {
  for (let f = 1; f < TREPPENHAUS_FRAMES; f++) {
    expect(
      Math.abs(filmIndoors(f) - filmIndoors(f - 1)),
      `frame ${f}`,
    ).toBeLessThanOrEqual(0.15);
  }
  expect(filmIndoors(0)).toBe(1);
});

const filmSeconds = Array.from({ length: FILM_FRAMES }, (_, f) => f / FPS);

test("the leaves rustle with the breeze: louder in the gusts, faint in the lulls", () => {
  const leaves = STREET_LOOPS.find((loop) => loop.breezy)!;
  const levels = filmSeconds.map((t) => loopVolume(leaves, t));
  expect(Math.max(...levels)).toBeGreaterThan(3 * Math.min(...levels));
  const byBreeze = [...filmSeconds]
    .sort((a, b) => breeze(a) - breeze(b))
    .map((t) => loopVolume(leaves, t));
  byBreeze
    .slice(1)
    .forEach((level, i) => expect(level).toBeGreaterThanOrEqual(byBreeze[i]));
});

test("the street bed and the traffic keep their own steady volume", () => {
  for (const loop of STREET_LOOPS.filter((l) => !l.breezy)) {
    for (const t of filmSeconds) expect(loopVolume(loop, t)).toBe(loop.volume);
  }
});
