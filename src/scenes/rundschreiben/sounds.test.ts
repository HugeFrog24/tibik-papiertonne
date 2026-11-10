import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { loopFiles } from "../../sound/IndoorLoop";
import { expectFilesCredited } from "../../sound/creditChecks";
import { readWav } from "../../sound/wavFile";
import {
  FILM_FRAMES,
  TIMELINE_FPS,
  HAUSMUELL_FRAMES,
  KLINGELSTURM_FRAMES,
  KLINGELSTURM_FROM,
  NACHTRUHE_FRAMES, NACHTRUHE_FILM_FRAMES,
  NACHTRUHE_FROM,
  PAPIERTONNEN_FRAMES,
  RUNDSCHREIBEN_FRAMES,
  RUNDSCHREIBEN_FROM,
  TIME_JUMPS,
  TREPPENHAUS_FRAMES,
} from "../../timeline";
import { KLINGELSTURM_DURATION, karenStandGait } from "../klingelsturm/choreography";
import { doorCues, stompRoomAt } from "../klingelsturm/doorCues";
import { touchdownTimes } from "../../characters/gait";
import { STOMP_RATE, stompFiles } from "../../Karen/KarenStomp";
import { soundSeconds } from "../../sound/soundLength";
import { ENVELOPE_LANDS, LID_THUD, RUNDSCHREIBEN_DURATION, footstepTimes, rundschreibenTibikAt } from "./choreography";
import { FACADE_Z } from "../../street/building";
import { NACHTRUHE_DURATION } from "../nachtruhe/timeline";
import { DOOR_SHUT } from "./home";
import { RAIN } from "../../sound/rain";
import { RUNDSCHREIBEN_CUES, footstepsByRoom, rainLevel } from "./soundCues";
import { LID_SLAP, PAPIERTONNEN_CUES } from "../papiertonnen/soundCues";


test("every cue has its file and every file is credited", () => {
  const files = [...RUNDSCHREIBEN_CUES.map((c) => c.file), ...Object.values(loopFiles(RAIN.file))];
  expectFilesCredited(files);
  expect(RUNDSCHREIBEN_CUES.some((c) => Math.abs(c.at - LID_THUD) < 1 / TIMELINE_FPS)).toBe(true);
  expect(RUNDSCHREIBEN_CUES.some((c) => Math.abs(c.at - DOOR_SHUT) < 1 / TIMELINE_FPS)).toBe(true);
  for (const cue of RUNDSCHREIBEN_CUES) {
    expect(cue.at, cue.name).toBeGreaterThanOrEqual(0);
    expect(cue.at, cue.name).toBeLessThan(RUNDSCHREIBEN_DURATION);
  }
});

test("the time jumps: no Klingelsturm cue runs past its scene, Nachtruhe follows at the cut, and the epilogue opens in the rain", () => {
  for (const cue of doorCues()) {
    const { rate, samples } = readWav(`${cue.sound}.wav`);
    const ends = cue.at + (cue.length ?? samples.length / rate - (cue.skip ?? 0));
    expect(ends, `${cue.sound} at ${cue.at.toFixed(2)} s`).toBeLessThanOrEqual(KLINGELSTURM_DURATION);
  }
  expect(Math.round(NACHTRUHE_FROM * TIMELINE_FPS)).toBe(Math.round(KLINGELSTURM_FROM * TIMELINE_FPS) + KLINGELSTURM_FRAMES);
  expect(Math.round(RUNDSCHREIBEN_FROM * TIMELINE_FPS)).toBe(Math.round(NACHTRUHE_FROM * TIMELINE_FPS) + NACHTRUHE_FILM_FRAMES);
  expect(rainLevel(0).outside).toBe(RAIN.volume);
  expect(rainLevel(0).inside).toBe(0);
});

test("the time jump: Karen's last stomp has died away before Klingelsturm ends", () => {
  const steps = touchdownTimes(karenStandGait(), KLINGELSTURM_DURATION);
  steps.forEach((t, i) => {
    const { step, thud, rate } = stompFiles(i, stompRoomAt(t));
    for (const file of [step, thud]) {
      const ends = Math.round(t * TIMELINE_FPS) / TIMELINE_FPS + soundSeconds(file) / (STOMP_RATE * rate);
      expect(ends, `${file} at ${t.toFixed(2)} s`).toBeLessThanOrEqual(KLINGELSTURM_DURATION);
    }
  });
});

test("the rain muffles once he is inside", () => {
  const last = rainLevel(RUNDSCHREIBEN_DURATION - 1 / TIMELINE_FPS);
  expect(last.outside).toBe(0);
  expect(last.inside).toBe(RAIN.volume);
  for (let f = 1; f < RUNDSCHREIBEN_FRAMES; f++) {
    const a = rainLevel((f - 1) / TIMELINE_FPS);
    const b = rainLevel(f / TIMELINE_FPS);
    expect(Math.abs(a.outside - b.outside), `frame ${f}`).toBeLessThanOrEqual(0.15 * RAIN.volume);
    expect(a.outside + a.inside).toBeCloseTo(RAIN.volume, 9);
  }
});

test("the declared time jumps, and the film is its six scenes end to end", () => {
  expect(TIME_JUMPS).toEqual([
    { from: "Hausmuell", to: "Klingelsturm" },
    { from: "Klingelsturm", to: "Nachtruhe" },
    { from: "Nachtruhe", to: "Rundschreiben" },
  ]);
  expect(FILM_FRAMES).toBe(TREPPENHAUS_FRAMES + PAPIERTONNEN_FRAMES + HAUSMUELL_FRAMES + KLINGELSTURM_FRAMES + NACHTRUHE_FILM_FRAMES + RUNDSCHREIBEN_FRAMES);
  expect(NACHTRUHE_FROM).toBeCloseTo(KLINGELSTURM_FROM + KLINGELSTURM_FRAMES / TIMELINE_FPS, 9);
  expect(RUNDSCHREIBEN_FROM).toBeCloseTo(NACHTRUHE_FROM + NACHTRUHE_FILM_FRAMES / TIMELINE_FPS, 9);
  expect(NACHTRUHE_FRAMES).toBe(Math.round(NACHTRUHE_DURATION * TIMELINE_FPS));
  expect(RUNDSCHREIBEN_FRAMES).toBe(Math.round(RUNDSCHREIBEN_DURATION * TIMELINE_FPS));
});

test("the envelope is heard landing on the bin's floor the moment it lands", () => {
  const landing = RUNDSCHREIBEN_CUES.find((c) => c.name === "Envelope lands in the bin")!;
  expect(Math.abs(landing.at - ENVELOPE_LANDS)).toBeLessThan(1 / TIMELINE_FPS);
});

test("his steps in the hall carry the stairwell's echo; those on the pavement and the step stay dry", () => {
  const { outside, inside } = footstepsByRoom();
  const all = footstepTimes();
  expect(outside.times.length + inside.times.length).toBe(all.length);
  expect(inside.times.length).toBeGreaterThanOrEqual(2);
  for (const t of inside.times) expect(rundschreibenTibikAt(t).position[2], t.toFixed(2)).toBeLessThan(FACADE_Z);
  for (const t of outside.times) expect(rundschreibenTibikAt(t).position[2], t.toFixed(2)).toBeGreaterThanOrEqual(FACADE_Z);
});

test("out in the rain his steps are wet ones, the five takes in turn, every one a real credited file; in the hall they stay dry (owner's pick, 2026-11-08)", () => {
  const { outside, inside } = footstepsByRoom();
  expect(outside.surface).toBe("wet");
  expect(new Set(outside.files)).toEqual(new Set([0, 1, 2, 3, 4].map((i) => `footstep_wet_00${i}.ogg`)));
  for (const file of outside.files) expect(existsSync(path.join("public", "sfx", file)), file).toBe(true);
  expectFilesCredited(outside.files);
  expect(inside.surface).toBe("concrete");
});

test("wherever a bin lid lands on the bin, the hollow slam the owner picked plays, one phone speakers carry: the lid thudding shut in the epilogue and flung open in Papiertonnen", () => {
  const at = (cues: readonly { readonly at: number; readonly file: string }[], t: number) => cues.filter((c) => Math.abs(c.at - t) < 1e-6).map((c) => c.file);
  expect(at(RUNDSCHREIBEN_CUES, LID_THUD)).toEqual(["bin-lid-slam.ogg"]);
  expect(at(PAPIERTONNEN_CUES, LID_SLAP)).toEqual(["bin-lid-slam.ogg"]);
});
