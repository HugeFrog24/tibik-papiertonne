import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { sourceFiles } from "../tooling/sourceFiles";
import { MIX } from "./MixAudio";

const PLAYS_AUDIO = /import\s*\{[^}]*\b(Audio|Html5Audio)\b[^}]*\}\s*from\s*"(@remotion\/media|remotion)"/;

test("every sound in the film plays through the mix bus: only MixAudio uses Remotion's audio element", () => {
  const direct = sourceFiles("src")
    .filter((file) => !file.endsWith("MixAudio.tsx"))
    .filter((file) => PLAYS_AUDIO.test(readFileSync(file, "utf8")));
  expect(direct).toEqual([]);
});

test("the mix bus leaves 5 dB of headroom, so Remotion's 16-bit sum of all sounds never clips", () => {
  expect(20 * Math.log10(MIX.headroom)).toBeCloseTo(-5, 6);
});
