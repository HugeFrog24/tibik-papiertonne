import { existsSync } from "node:fs";
import { expect, test } from "vitest";
import { FPS } from "../../timeline";
import { AFTER_THE_OPENING, HAUSTUER_LATCHED, OPENING, PAPIERTONNEN_DURATION, kartonAt, kf, lidAt } from "./choreography";
import { framesOf } from "../sceneChecks";
import { PAPIERTONNEN_CUES } from "./soundCues";

test("the Haustür swings shut on its closer and its latch catches right after", () => {
  const shut = PAPIERTONNEN_CUES.find((c) => c.file.includes('doorClose'))!;
  const latch = PAPIERTONNEN_CUES.find((c) => c.file.includes('metalLatch'))!;
  expect(latch).toBeDefined();
  expect(Math.abs(latch.at - HAUSTUER_LATCHED)).toBeLessThan(1 / FPS);
  expect(latch.at).toBeGreaterThan(shut.at);
});

test("the box comes out of the paper with a paper sound, not a cloth rustle", () => {
  const out = PAPIERTONNEN_CUES.find((c) => c.name === "Box pulled out")!;
  expect(out.file).not.toMatch(/cloth/);
  expect(out.file).toMatch(/book/);
});

test("every local sound a cue names exists", () => {
  for (const c of PAPIERTONNEN_CUES)
    if (!c.file.startsWith("http"))
      expect(existsSync(`public/sfx/${c.file}`), c.file).toBe(true);
});

const HEARD_LATE = 0.125;

test("the bin's lid is heard where it moves: the creak on the first frame the lid rises and the slap on the frame it lands open; the rummaging falls inside his hand's rummage; the box is heard as it starts out of the paper and its flaps as they spring open, never before they move", () => {
  const played = (name: string) => Math.round(PAPIERTONNEN_CUES.find((c) => c.name === name)!.at * FPS);
  const frames = framesOf(PAPIERTONNEN_DURATION, FPS);
  const firstFrame = (shows: (t: number) => boolean) => frames.find((f) => shows(f / FPS))!;
  const still = lidAt(0);
  const open = lidAt(PAPIERTONNEN_DURATION);
  expect(played("Lid creaks up")).toBe(firstFrame((t) => Math.abs(lidAt(t) - still) > 1e-6));
  expect(played("Lid slaps open")).toBe(firstFrame((t) => Math.abs(lidAt(t) - open) < 1e-6));
  const rummaging = frames.filter((f) => kf(f / FPS - OPENING, AFTER_THE_OPENING.rummages, [0, 1, 1, 0]) > 0);
  for (const name of ["Rummaging 1", "Rummaging 2", "Rummaging 3"]) expect(rummaging, name).toContain(played(name));
  const moves = [
    ["Box pulled out", firstFrame((t) => kartonAt(t).pickup > 0)],
    ["Karton pops open", firstFrame((t) => kartonAt(t).open > 0)],
  ] as const;
  for (const [name, moving] of moves) {
    expect(played(name) - moving, name).toBeGreaterThanOrEqual(0);
    expect(played(name) - moving, name).toBeLessThan(HEARD_LATE * FPS);
  }
});
