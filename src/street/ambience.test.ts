import { expect, test } from "vitest";
import { inTheBedroom } from "../scenes/nachtruhe/cameras";
import {
  STORY_END,
  haustuerAt,
  treppenhausIndoors,
} from "../scenes/treppenhaus/choreography";
import { hushAt } from "../scenes/nachtruhe/soundCues";
import { SCENES } from "../timeline";
import { FILM_FRAMES, FPS, KLINGELSTURM_FROM, RUNDSCHREIBEN_FROM, TREPPENHAUS_FRAMES, filmHush, filmIndoors, NACHTRUHE_FROM } from "../timeline";
import { NACHTRUHE_FILM_JOINS } from "../scenes/nachtruhe/timeline";
import { breeze } from "../physics/wind";
import { STREET_LOOPS, hushedVolume, loopVolume } from "./ambienceLoops";

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

test("the street is fully open from the Haustür until the Klingelsturm cut, heard from indoors on the landing, from the bedroom in Nachtruhe's bedroom shots and openly in its street and drone shots, open again in the rain, and muffled once the Haustür shuts behind him", () => {
  const indoorsFrom = Math.round(KLINGELSTURM_FROM * FPS);
  const nightFrom = Math.round(NACHTRUHE_FROM * FPS);
  const rainFrom = Math.round(RUNDSCHREIBEN_FROM * FPS);
  expect(filmIndoors(TREPPENHAUS_FRAMES - 1)).toBe(0);
  for (let f = TREPPENHAUS_FRAMES; f < indoorsFrom; f++)
    expect(filmIndoors(f)).toBe(0);
  for (let f = indoorsFrom; f < nightFrom; f++)
    expect(filmIndoors(f)).toBe(1);
  for (let f = nightFrom; f < rainFrom; f++)
    expect(filmIndoors(f), `frame ${f}`).toBe(inTheBedroom((f - nightFrom) / FPS + NACHTRUHE_FILM_JOINS) ? 1 : 0);
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

test("the film's street hushes through Nachtruhe as the scene does, and nowhere else", () => {
  const night = Math.round(NACHTRUHE_FROM * FPS);
  const rain = Math.round(RUNDSCHREIBEN_FROM * FPS);
  for (let f = 0; f < FILM_FRAMES; f += 7)
    expect(filmHush(f), `frame ${f}`).toBe(f >= night && f < rain ? hushAt((f - night) / FPS + NACHTRUHE_FILM_JOINS) : 1);
  expect(filmHush(night + Math.round((22 - NACHTRUHE_FILM_JOINS) * FPS))).toBeLessThan(0.2);
});

test("the town hushes for the night, the wind in the leaves does not", () => {
  const hushed = (loop: (typeof STREET_LOOPS)[number]) => hushedVolume(loop, 0, 0.1);
  for (const loop of STREET_LOOPS) expect(hushed(loop), loop.name).toBeCloseTo(loopVolume(loop, 0) * (loop.breezy ? 1 : 0.1), 12);
});

test("the film hears each scene's street as that scene hears it on its own, frame for frame", () => {
  let start = 0;
  for (const scene of SCENES) {
    for (let f = 0; f < scene.frames; f += 5) {
      expect(filmIndoors(start + f), `${scene.name} frame ${f}`).toBeCloseTo(scene.ambience.indoors(f / FPS + (scene.skip ?? 0)), 12);
      expect(filmHush(start + f), `${scene.name} frame ${f}`).toBeCloseTo(scene.ambience.hush(f / FPS + (scene.skip ?? 0)), 12);
    }
    start += scene.frames;
  }
  expect(start).toBe(FILM_FRAMES);
  expect(SCENES.map((s) => s.name)).toEqual(["Treppenhaus", "Papiertonnen", "Hausmuell", "Klingelsturm", "Nachtruhe", "Rundschreiben"]);
});
