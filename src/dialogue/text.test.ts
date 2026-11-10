import { expect, test } from "vitest";
import { wordsOf } from "./text";
import { LINES as HAUSMUELL } from "../scenes/hausmuell/choreography";
import { LINES as KLINGELSTURM } from "../scenes/klingelsturm/choreography";
import { FONT_METRICS } from "./fontMetrics";

const FILM = [...HAUSMUELL, ...KLINGELSTURM];

test("the type model knows every character the film's subtitles use", () => {
  const missing = new Set<string>();
  for (const l of FILM)
    for (const ch of l.text)
      for (const font of [FONT_METRICS.bangers, FONT_METRICS.comicNeue])
        if (!(ch in font.advance)) missing.add(ch);
  expect([...missing]).toEqual([]);
});

test("a line's words are what lies between runs of whitespace, never empty", () => {
  expect(wordsOf("  Sehr geehrte   Daminnen,\tsehr  ")).toEqual(["Sehr", "geehrte", "Daminnen,", "sehr"]);
  expect(wordsOf("")).toEqual([]);
});
