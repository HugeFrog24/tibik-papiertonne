import { expect, test } from "vitest";
import { TIMELINE_FPS } from "../../frameRate";
import { KLINGELSTURM_CLOCKS } from "./hold";
import { solveKlingelsturm, solveKlingelsturmIn } from "./solve";
import { LINES } from "./choreography";
import { SHOTS } from "./cameras";
import { heldShots } from "../../toon/shots";
import { spokenSpans } from "../../dialogue/voiced";
import { SHUT } from "./door";
import { CLICK } from "./calls";

const clock = KLINGELSTURM_CLOCKS.en;
const [hold] = clock.holds;
const held = hold.frames / TIMELINE_FPS;
const english = solveKlingelsturmIn("en");
const during = Array.from({ length: hold.frames }, (_, i) => hold.at + i / TIMELINE_FPS);

test("German Klingelsturm is solved as before: its solver is the German one, and its clock never holds", () => {
  expect(solveKlingelsturmIn("de")).toBe(solveKlingelsturm);
  expect(KLINGELSTURM_CLOCKS.de.frames).toBe(0);
});

test("while the English gap shot holds, the story waits: his door, Tibik and the phone in her pocket stay exactly as they are when it starts", () => {
  const at = english(hold.at);
  for (const u of during) {
    const s = english(u);
    expect(s.tibikDoor, `${u}`).toBe(at.tibikDoor);
    expect(s.tibik, `${u}`).toEqual(at.tibik);
    expect(s.karen.position, `${u}`).toEqual(at.karen.position);
    expect(s.phone, `${u}`).toEqual(at.phone);
  }
});

test("while the English gap shot holds, Karen does not freeze: she keeps breathing, her body rising and falling every frame, and she blinks once", () => {
  const bobs = during.map((u) => english(u).karen.pose.bob);
  for (let i = 1; i < bobs.length; i++) expect(bobs[i], `${during[i]}`).not.toBe(bobs[i - 1]);
  expect(Math.max(...bobs) - Math.min(...bobs)).toBeGreaterThan(0.004);
  expect(Math.max(...during.map((u) => english(u).karen.pose.blink))).toBeGreaterThan(0.9);
  const german = Array.from({ length: 60 }, (_, i) => solveKlingelsturm(hold.at - 1 + i / TIMELINE_FPS).karen.pose.blink);
  expect(Math.max(...german)).toBe(0);
});

test("after the English hold the scene plays as in German, every story moment just 37 frames later: the door shuts, she takes her phone, the call goes on", () => {
  for (const story of [SHUT[0], SHUT[1], 16.5, 20, 25.4, 33, CLICK]) {
    const [de, en] = [solveKlingelsturm(story), english(clock.editAt(story))];
    expect(clock.editAt(story) - story).toBeCloseTo(held, 9);
    expect(en.tibikDoor, `${story}`).toBe(de.tibikDoor);
    expect(en.tibik.position, `${story}`).toEqual(de.tibik.position);
    expect(en.karen.position, `${story}`).toEqual(de.karen.position);
    expect(en.lights, `${story}`).toBe(de.lights);
  }
});

test("before the English hold the scene is the German one frame for frame, Karen's shouting aside, which follows her English takes", () => {
  for (const story of [0, 3, 6.3, 9.3, 14.15, hold.at]) {
    const [de, en] = [solveKlingelsturm(story), english(story)];
    expect(en.tibikDoor, `${story}`).toBe(de.tibikDoor);
    expect(en.tibik, `${story}`).toEqual(de.tibik);
    expect(en.karen.position, `${story}`).toEqual(de.karen.position);
  }
});

test("in English Karen's mouth works while her English takes play: open and shouting midway through each of her shouted lines", () => {
  const spans = spokenSpans("klingelsturm", LINES, "en", clock);
  for (const line of LINES.filter((l) => l.speaker === "karen" && l.tone === "shout")) {
    const [from, to] = spans(line);
    expect(english((from + to) / 2).karen.mouthOpen, line.name).toBeGreaterThanOrEqual(0.55);
  }
});

test("the English gap shot runs 37 frames longer and every later shot starts 37 frames later; the shots before it are cut as in German", () => {
  const shots = heldShots(SHOTS, clock);
  const gap = SHOTS.findIndex((shot) => shot.name === "Over Karen: the gap");
  SHOTS.forEach((shot, i) => {
    const after = i > gap ? held : 0;
    expect(shots[i].from - shot.from, shot.name).toBeCloseTo(after, 9);
    expect(shots[i].to - shot.to, shot.name).toBeCloseTo(i >= gap ? held : 0, 9);
  });
});
