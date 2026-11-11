import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import VOICE_TONE from "../dialogue/voiceTone.json";
import { takeIdOf, voiceOf } from "./recordingScript";
import { ALL_SPOKEN_LINES } from "./spokenLines";
import { LANGUAGES, effectOf, processedFile, takeOf } from "./voices";

const LOCAL = existsSync("public/dialogue/de/level");

test("both of Tibik's voices, speaking and inner (owner, 2026-11-10: 'it sounds good' in the letter's hall too), get the owner's pick from the demos, 'full and present': body below 250 Hz, less box at 420 Hz, presence at 3 kHz, two gentle compressors and a squashed copy far under, de-essed, barely saturated, a touch of air", () => {
  expect(Object.keys(VOICE_TONE)).toEqual(["tibik", "tibik-inner", "karen"]);
  expect(VOICE_TONE["tibik-inner"]).toEqual(VOICE_TONE.tibik);
  const { input, chain } = VOICE_TONE.tibik;
  expect(input).toBe(-20);
  for (const stage of [
    "highpass=f=80",
    "lowshelf=f=180:g=3",
    "equalizer=f=420:t=q:w=1:g=-1.5",
    "equalizer=f=3000:t=q:w=1:g=3",
    "acompressor=threshold=0.1:ratio=2:attack=20:release=200:knee=6",
    "acompressor=threshold=0.18:ratio=4:attack=3:release=50",
    "volume=-18dB[dense]",
    "deesser=i=0.4",
    "volume=5dB,dcshift=shift=0.04,asoftclip=type=tanh:oversample=4,highpass=f=40,volume=-5dB",
    "highshelf=f=8000:g=1.5",
  ])
    expect(chain).toContain(stage);
});

test("Karen's voice is raised two semitones with her formants moving up with it, the most female screech, as a senior Karen shrieks (owner, 2026-11-10, from demos; the screech EQ on top sounded the same to her ear, so it is left off)", () => {
  const pulledBack = 0.004 * 48000;
  expect(VOICE_TONE.karen).toEqual({ input: -20, chain: `rubberband=pitch=${(2 ** (2 / 12)).toFixed(5)}:formant=shifted:pitchq=quality,adelay=delays=${pulledBack}S:all=1,areverse,atrim=start_sample=${pulledBack},areverse` });
  expect(VOICE_TONE.karen.chain).not.toMatch(/tempo|atempo|asetrate/);
});

test("the voices are toned before their room: make-voices gives a voice its tone first, so his lines in the doorway ring in the stairwell with the same voice", () => {
  const script = readFileSync("scripts/make-voices.mjs", "utf8");
  expect(script).toMatch(/voiceTone\.json/);
  expect(script).toMatch(/shaped\(toned\(/);
});

const bandOf = (file: string, [lo, hi]: readonly [number, number]) => {
  const run = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", `highpass=f=${lo}:poles=2,highpass=f=${lo}:poles=2,lowpass=f=${hi}:poles=2,lowpass=f=${hi}:poles=2,astats=metadata=0:measure_perchannel=none:measure_overall=RMS_level`, "-f", "null", "-"], { encoding: "utf8" });
  return Number(/RMS level dB:\s*(-?[\d.]+)/.exec(run.stderr)?.[1]);
};

const BODY = [80, 250] as const;
const MID = [500, 1000] as const;
const PRESENCE = [2000, 5000] as const;

test.skipIf(!LOCAL)("Karen's processed takes carry her raised voice in German and English alike: against the mids, everything below 250 Hz sits at least 1.5 dB lower than in her takes as recorded", { timeout: 240_000 }, () => {
  const lines = ALL_SPOKEN_LINES.filter((line) => voiceOf(line) === "karen" && effectOf(line) === undefined);
  expect(lines.length).toBeGreaterThanOrEqual(6);
  for (const lang of LANGUAGES) {
    let drop = 0;
    for (const line of lines) {
      const take = takeOf(lang, takeIdOf(line)!)!;
      const lowOf = (file: string) => bandOf(file, BODY) - bandOf(file, MID);
      drop += (lowOf(`public/dialogue/${lang}/${take.file}`) - lowOf(`public/dialogue/${lang}/${processedFile(undefined, take)}`)) / lines.length;
    }
    expect(drop, lang).toBeGreaterThanOrEqual(1.5);
  }
});

test.skipIf(!LOCAL)("his processed takes carry the tone in German and English alike: against the mids, presence stands at least 3 dB and body at least 0.5 dB higher than in his takes as recorded", { timeout: 240_000 }, () => {
  const lines = ALL_SPOKEN_LINES.filter((line) => voiceOf(line) === "tibik" && effectOf(line) === undefined);
  expect(lines.length).toBeGreaterThanOrEqual(6);
  for (const lang of LANGUAGES) {
    const lift = { presence: 0, body: 0 };
    for (const line of lines) {
      const take = takeOf(lang, takeIdOf(line)!)!;
      const [recorded, processed] = [`public/dialogue/${lang}/${take.file}`, `public/dialogue/${lang}/${processedFile(undefined, take)}`];
      const shape = (file: string) => ({ presence: bandOf(file, PRESENCE) - bandOf(file, MID), body: bandOf(file, BODY) - bandOf(file, MID) });
      const [before, after] = [shape(recorded), shape(processed)];
      lift.presence += (after.presence - before.presence) / lines.length;
      lift.body += (after.body - before.body) / lines.length;
    }
    expect(lift.presence, lang).toBeGreaterThanOrEqual(3);
    expect(lift.body, lang).toBeGreaterThanOrEqual(0.5);
  }
});
