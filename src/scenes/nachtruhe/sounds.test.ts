import { existsSync, readFileSync } from "node:fs";
import { Vector3 } from "three";
import { expect, test } from "vitest";
import { ENTRANCE_X, FACADE_Z } from "../../street/building";
import { RAIN } from "../../sound/rain";
import { soundSeconds } from "../../sound/soundLength";
import { FPS, NACHTRUHE_FRAMES } from "../../timeline";
import { cameraAt as epilogueCameraAt } from "../rundschreiben/cameras";
import { ENTRY as EPILOGUE_ENTRY } from "../rundschreiben/choreography";
import { HAUSTUER_SOUNDS } from "../rundschreiben/home";
import { RUNDSCHREIBEN_CUES } from "../rundschreiben/soundCues";
import { entryCues } from "../entrySounds";
import { curtainOpenAt } from "./bedroom";
import { cameraAt, inTheBedroom } from "./cameras";
import { nachtruheWorldAt } from "./choreography";
import { BLACKBIRD, EPILOGUE_RAIN_START, HAUSTUER_FAR_OFF, NACHTRUHE_CUES, RAIN_FROM, footstepsByPlace, hushAt, rainLevelAt } from "./soundCues";
import { CURTAIN_PULL, DAWN, DRONE, DUSK, ENTRY, LAMP_OFF, LAMP_ON, NACHTRUHE_DURATION } from "./timeline";

const CREDITS = readFileSync("public/sfx/CREDITS.md", "utf8");
const frameOf = (t: number) => Math.round(t * FPS);

test("every cue has its file and every file is credited", () => {
  const { street, bedroom } = footstepsByPlace(FPS);
  const steps = [...street.files, ...bedroom.files];
  const files = [
    ...NACHTRUHE_CUES.map((c) => c.file),
    `${BLACKBIRD.file}.wav`,
    `${BLACKBIRD.file}-muffled.wav`,
    `${RAIN.file}.wav`,
    `${RAIN.file}-muffled.wav`,
    ...steps,
  ];
  for (const file of files) {
    expect(existsSync(`public/sfx/${file}`), file).toBe(true);
    expect(CREDITS.includes(file.split("/").pop()!), `${file} in CREDITS.md`).toBe(true);
  }
  for (const cue of NACHTRUHE_CUES) {
    expect(cue.at, cue.name).toBeGreaterThanOrEqual(0);
    expect(cue.at + soundSeconds(cue.file), cue.name).toBeLessThan(NACHTRUHE_DURATION);
  }
});

test("each click lands on the frame his hand presses the switch, the rings while the curtain moves", () => {
  const clicks = NACHTRUHE_CUES.filter((c) => c.name.startsWith("His lamp clicks"));
  expect(clicks.map((c) => frameOf(c.at))).toEqual([frameOf(LAMP_OFF), frameOf(LAMP_ON)]);
  for (const click of clicks) {
    const f = frameOf(click.at);
    expect(nachtruheWorldAt(f / FPS).lamps[1], click.name).not.toBe(nachtruheWorldAt((f - 1) / FPS).lamps[1]);
  }
  const rings = NACHTRUHE_CUES.find((c) => c.file === "curtain-gliders.wav")!;
  expect(frameOf(rings.at)).toBe(frameOf(CURTAIN_PULL[0]));
  expect(Math.abs(soundSeconds(rings.file) - (CURTAIN_PULL[1] - CURTAIN_PULL[0]))).toBeLessThan(1 / FPS);
  expect(curtainOpenAt(rings.at + 0.1)).toBeGreaterThan(curtainOpenAt(rings.at));
  expect(curtainOpenAt(CURTAIN_PULL[1] - 0.1)).toBeLessThan(curtainOpenAt(CURTAIN_PULL[1]));
});

test("the rain does not jump at the cut into the epilogue", () => {
  expect(RAIN_FROM).toBe(DAWN[0]);
  expect(soundSeconds(`${RAIN.file}.wav`)).toBe(RAIN.seconds);
  expect(soundSeconds(`${RAIN.file}-muffled.wav`)).toBe(RAIN.seconds);
  const elapsed = (NACHTRUHE_FRAMES - frameOf(RAIN_FROM)) / FPS;
  expect(EPILOGUE_RAIN_START).toBeCloseTo(elapsed % soundSeconds(`${RAIN.file}.wav`), 9);
  expect(rainLevelAt(NACHTRUHE_DURATION)).toBe(RAIN.volume);
});

test("the rain sets in with the dawn and never falls before it", () => {
  expect(rainLevelAt(RAIN_FROM - 1 / FPS)).toBe(0);
  for (let f = frameOf(DAWN[0]) + 1; f <= frameOf(DAWN[1]); f++) {
    expect(rainLevelAt(f / FPS)).toBeGreaterThanOrEqual(rainLevelAt((f - 1) / FPS));
    expect(rainLevelAt(f / FPS) - rainLevelAt((f - 1) / FPS)).toBeLessThan(0.05 * RAIN.volume);
  }
  expect(rainLevelAt(DAWN[1])).toBe(RAIN.volume);
});

test("the street hushes for the night and wakes with the rain", () => {
  for (let f = 1; f <= frameOf(DRONE[1]); f++) expect(hushAt(f / FPS), `frame ${f}`).toBeLessThanOrEqual(hushAt((f - 1) / FPS));
  expect(hushAt(0)).toBeLessThan(1);
  expect(hushAt((DRONE[0] + DRONE[1]) / 2)).toBeLessThan(0.2);
  expect(hushAt((DRONE[0] + DRONE[1]) / 2)).toBeGreaterThan(0);
  for (let f = frameOf(DAWN[0]) + 1; f <= frameOf(DAWN[1]); f++) expect(hushAt(f / FPS)).toBeGreaterThanOrEqual(hushAt((f - 1) / FPS));
  expect(hushAt(DAWN[1])).toBe(1);
  expect(hushAt(NACHTRUHE_DURATION)).toBe(1);
});

test("the Haustür sounds as in the epilogue, as far off as the dusk wide stands, and only while we are in the street", () => {
  const door = new Vector3(ENTRANCE_X, 1, FACADE_Z);
  const near = new Vector3(...epilogueCameraAt(HAUSTUER_SOUNDS.opens).position).distanceTo(door);
  const far = new Vector3(...cameraAt(ENTRY.sounds.opens).position).distanceTo(door);
  expect(HAUSTUER_FAR_OFF).toBeCloseTo(near / far, 9);
  expect(HAUSTUER_FAR_OFF).toBeLessThan(0.5);
  const epilogue = entryCues(EPILOGUE_ENTRY);
  expect(RUNDSCHREIBEN_CUES.filter((c) => epilogue.some((e) => e.name === c.name))).toEqual(epilogue);
  const heard = entryCues(ENTRY).filter((c) => !inTheBedroom(c.at));
  const played = NACHTRUHE_CUES.filter((c) => heard.some((h) => h.name === c.name));
  expect(played.map((c) => c.at)).toEqual(heard.map((c) => c.at));
  played.forEach((c, i) => expect(c.volume).toBeCloseTo(heard[i].volume * HAUSTUER_FAR_OFF, 12));
  expect(played.length).toBeGreaterThanOrEqual(4);
  for (const c of played) expect(inTheBedroom(c.at), c.name).toBe(false);
});

test("the blackbird sings through the dusk and has fallen silent by the time his lamp goes off", () => {
  const ends = soundSeconds(`${BLACKBIRD.file}.wav`);
  expect(ends).toBeGreaterThan(DUSK[1]);
  expect(ends).toBeLessThan(LAMP_OFF);
  expect(soundSeconds(`${BLACKBIRD.file}-muffled.wav`)).toBe(ends);
});

test("his steps patter on the pavement in the street and on the laminate in his bedroom, never one in a shot that does not show him", () => {
  const { street, bedroom } = footstepsByPlace(FPS);
  expect(street.times.length).toBeGreaterThanOrEqual(4);
  expect(bedroom.times.length).toBeGreaterThanOrEqual(6);
  for (const t of street.times) {
    expect(inTheBedroom(t), t.toFixed(2)).toBe(false);
    expect(t).toBeLessThan(ENTRY.indoors[0]);
  }
  for (const t of bedroom.times) expect(inTheBedroom(t), t.toFixed(2)).toBe(true);
  expect(bedroom.files.every((f) => f.includes("wood"))).toBe(true);
});
