import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { readWav } from "../../sound/wavFile";
import {
  FILM_FRAMES,
  FPS,
  HAUSMUELL_FRAMES,
  KLINGELSTURM_FRAMES,
  KLINGELSTURM_FROM,
  PAPIERTONNEN_FRAMES,
  RUNDSCHREIBEN_FRAMES,
  RUNDSCHREIBEN_FROM,
  TIME_JUMPS,
  TREPPENHAUS_FRAMES,
} from "../../timeline";
import { KLINGELSTURM_DURATION } from "../klingelsturm/choreography";
import { doorCues } from "../klingelsturm/doorCues";
import { ENVELOPE_LANDS, LID_THUD, RUNDSCHREIBEN_DURATION, footstepTimes, rundschreibenTibikAt } from "./choreography";
import { FACADE_Z } from "../../street/building";
import { DOOR_SHUT } from "./home";
import { RAIN, RUNDSCHREIBEN_CUES, footstepsByRoom, rainLevel } from "./soundCues";

const CREDITS = readFileSync("public/sfx/CREDITS.md", "utf8");

test("every cue has its file and every file is credited", () => {
  const files = [...RUNDSCHREIBEN_CUES.map((c) => c.file), `${RAIN.file}.wav`, `${RAIN.file}-muffled.wav`];
  for (const file of files) {
    expect(existsSync(`public/sfx/${file}`), file).toBe(true);
    expect(CREDITS.includes(file.split("/").pop()!), `${file} in CREDITS.md`).toBe(true);
  }
  expect(RUNDSCHREIBEN_CUES.some((c) => Math.abs(c.at - LID_THUD) < 1 / FPS)).toBe(true);
  expect(RUNDSCHREIBEN_CUES.some((c) => Math.abs(c.at - DOOR_SHUT) < 1 / FPS)).toBe(true);
  for (const cue of RUNDSCHREIBEN_CUES) {
    expect(cue.at, cue.name).toBeGreaterThanOrEqual(0);
    expect(cue.at, cue.name).toBeLessThan(RUNDSCHREIBEN_DURATION);
  }
});

test("the time jump: no Klingelsturm cue runs past its scene, the rain starts at the cut", () => {
  for (const cue of doorCues()) {
    const { rate, samples } = readWav(`${cue.sound}.wav`);
    const ends = cue.at + (cue.length ?? samples.length / rate - (cue.skip ?? 0));
    expect(ends, `${cue.sound} at ${cue.at.toFixed(2)} s`).toBeLessThanOrEqual(KLINGELSTURM_DURATION);
  }
  expect(Math.round(RUNDSCHREIBEN_FROM * FPS)).toBe(Math.round(KLINGELSTURM_FROM * FPS) + KLINGELSTURM_FRAMES);
  expect(rainLevel(0).outside).toBe(RAIN.volume);
  expect(rainLevel(0).inside).toBe(0);
});

test("the rain muffles once he is inside", () => {
  const last = rainLevel(RUNDSCHREIBEN_DURATION - 1 / FPS);
  expect(last.outside).toBe(0);
  expect(last.inside).toBe(RAIN.volume);
  for (let f = 1; f < RUNDSCHREIBEN_FRAMES; f++) {
    const a = rainLevel((f - 1) / FPS);
    const b = rainLevel(f / FPS);
    expect(Math.abs(a.outside - b.outside), `frame ${f}`).toBeLessThanOrEqual(0.15 * RAIN.volume);
    expect(a.outside + a.inside).toBeCloseTo(RAIN.volume, 9);
  }
});

test("the declared time jumps, and the film is its five scenes end to end", () => {
  expect(TIME_JUMPS).toContainEqual({ from: "Hausmuell", to: "Klingelsturm" });
  expect(TIME_JUMPS).toContainEqual({ from: "Klingelsturm", to: "Rundschreiben" });
  expect(FILM_FRAMES).toBe(TREPPENHAUS_FRAMES + PAPIERTONNEN_FRAMES + HAUSMUELL_FRAMES + KLINGELSTURM_FRAMES + RUNDSCHREIBEN_FRAMES);
  expect(RUNDSCHREIBEN_FRAMES).toBe(Math.round(RUNDSCHREIBEN_DURATION * FPS));
});

test("the envelope is heard landing on the bin's floor the moment it lands", () => {
  const landing = RUNDSCHREIBEN_CUES.find((c) => c.name === "Envelope lands in the bin")!;
  expect(Math.abs(landing.at - ENVELOPE_LANDS)).toBeLessThan(1 / FPS);
});

test("his steps in the hall carry the stairwell's echo; those on the pavement and the step stay dry", () => {
  const { outside, inside } = footstepsByRoom(FPS);
  const all = footstepTimes(FPS);
  expect(outside.length + inside.length).toBe(all.length);
  expect(inside.length).toBeGreaterThanOrEqual(2);
  for (const t of inside) expect(rundschreibenTibikAt(t).position[2], t.toFixed(2)).toBeLessThan(FACADE_Z);
  for (const t of outside) expect(rundschreibenTibikAt(t).position[2], t.toFixed(2)).toBeGreaterThanOrEqual(FACADE_Z);
});
