import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";
import TAKES from "../dialogue/takes.json";
import { spokenLength, spokenSpan } from "../dialogue/speechSpan";
import { ENGLISH_FIT_FILE, FIT, deadlineOf, englishFit, movable, wordsOf } from "./englishFit";
import { clockOf } from "./clocks";
import { takeIdOf, voiceOf } from "./recordingScript";
import { SPOKEN } from "./spokenLines";
import { ANSWERING_MACHINE_BEEP } from "./klingelsturm/calls";
import { NOT_FOR_THE_ENVIRONMENT } from "./klingelsturm/hold";

const ON_DISK = JSON.parse(readFileSync(ENGLISH_FIT_FILE, "utf8")) as Record<string, { readonly from: number; readonly tempo: number }>;

const each = () =>
  SPOKEN.flatMap(({ key, lines }) => {
    const ordered = [...lines].sort((a, b) => a.from - b.from);
    const clock = clockOf(key, "en");
    return ordered.map((line, i) => {
      const id = takeIdOf(line)!;
      const fit = ON_DISK[id];
      const starts = clock.editAt(fit.from);
      return { key, line, id, fit, clock, starts, ends: starts + wordsOf(id) / fit.tempo, next: ordered[i + 1] };
    });
  });

test("the English fit on disk is the one the rule gives: regenerate it with UPDATE_ENGLISH_FIT=1 after changing a take or a line", () => {
  if (process.env["UPDATE_ENGLISH_FIT"]) writeFileSync(ENGLISH_FIT_FILE, `${JSON.stringify(englishFit(), null, 1)}\n`);
  expect(ON_DISK).toEqual(englishFit());
  expect(Object.keys(ON_DISK).sort()).toEqual(Object.keys(TAKES.en).sort());
});

test("every English line is over before what follows it: the next line or the moment it must be done by, with the German pause before it or 0.15 s, whichever is shorter", () => {
  const late = each().filter(({ line }) => !movable(voiceOf(line))).flatMap(({ id, ends, clock }) => {
    const deadline = deadlineOf(id);
    if (!deadline) return [];
    const by = clock.editAt(deadline.at) - deadline.pause;
    return ends > by + 1e-3 ? [`${id} ends ${ends.toFixed(3)}, must by ${by.toFixed(3)}`] : [];
  });
  expect(late).toEqual([]);
});

test("no English take is sped up more than it needs: one that fits plays at its own pace, a quicker one ends right at its deadline, and none goes faster than the x1.31 the owner heard and accepted", () => {
  for (const { id, fit, ends, clock } of each()) {
    if (fit.tempo === 1) continue;
    const deadline = deadlineOf(id)!;
    expect(ends, id).toBeCloseTo(clock.editAt(deadline.at) - deadline.pause, 2);
    expect(fit.tempo, id).toBeLessThanOrEqual(FIT.fastest);
  }
  expect(FIT.fastest).toBeLessThanOrEqual(1.31);
});

test("English lines start where the German ones do, except the answering machine's: a recording on her speaker, it plays at its own pace with the German pauses between its sentences and is done before the beep (owner, 2026-11-11)", () => {
  const machine = each().filter(({ line }) => voiceOf(line) === "anrufbeantworter");
  expect(machine.map(({ fit }) => fit.tempo)).toEqual([1, 1, 1]);
  expect(machine[0].fit.from).toBe(machine[0].line.from);
  machine.slice(1).forEach(({ fit, line, id }, i) => {
    const before = machine[i];
    const germanPause = line.from - (before.line.from + spokenLength(TAKES.de[before.id as keyof typeof TAKES.de]));
    expect(fit.from - (before.fit.from + wordsOf(before.id)), id).toBeCloseTo(germanPause, 2);
  });
  expect(machine.at(-1)!.ends).toBeLessThan(machine.at(-1)!.clock.editAt(ANSWERING_MACHINE_BEEP));
  for (const { line, fit } of each().filter(({ line }) => voiceOf(line) !== "anrufbeantworter")) expect(fit.from, line.name).toBe(line.from);
});

test("his 'Nooo. Not for the environment's sake.' plays at his own pace, the English gap shot holding for it", () => {
  expect(ON_DISK[NOT_FOR_THE_ENVIRONMENT].tempo).toBe(1);
});

test("'Yeah, what's up?' is fitted by its words, which end at 0.8 s; the breath after them may run on under Karen's 'HEY!'", () => {
  expect(wordsOf("klingelsturm_01_tibik")).toBeCloseTo(0.8, 9);
  expect(wordsOf("klingelsturm_01_tibik")).toBeLessThan(spokenLength(TAKES.en.klingelsturm_01_tibik));
  for (const id of Object.keys(TAKES.en).filter((id) => id !== "klingelsturm_01_tibik")) expect(wordsOf(id), id).toBe(spokenLength(TAKES.en[id as keyof typeof TAKES.en]));
});

const LOCAL = existsSync("public/dialogue/en/klingelsturm_01_tibik.wav");

const rms = (file: string, from: number, seconds: number) =>
  Number(/RMS level dB: (-?[\d.]+)/.exec(spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-ss", String(from), "-t", String(seconds), "-i", file, "-af", "astats=measure_overall=RMS_level:measure_perchannel=none", "-f", "null", "-"], { encoding: "utf8" }).stderr.split("Overall")[1] ?? "")?.[1] ?? "-200");

test.skipIf(!LOCAL)("what runs on after the words of 'Yeah, what's up?' is only a breath, at least 15 dB under them", () => {
  const file = "public/dialogue/en/klingelsturm_01_tibik.wav";
  const [from, to] = spokenSpan(TAKES.en.klingelsturm_01_tibik);
  const words = wordsOf("klingelsturm_01_tibik");
  expect(rms(file, words + 0.02, to - words - 0.02) - rms(file, from, words)).toBeLessThanOrEqual(-15);
});
