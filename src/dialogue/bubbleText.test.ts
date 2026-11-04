import { expect, test } from "vitest";
import { LINES as HAUSMUELL } from "../scenes/hausmuell/choreography";
import { LINES as KLINGELSTURM } from "../scenes/klingelsturm/choreography";
import { FONT_METRICS } from "./fontMetrics";
import { TEXT, bubbleLayout, textProblems, wrapText } from "./bubbleText";
import type { Line } from "./line";

const line = (over: Partial<Line>): Line => ({
  speaker: "tibik",
  from: 0,
  to: 2,
  text: "Guten Tag.",
  name: "test",
  tone: "calm",
  box: { left: 0, top: 0, width: 600, height: 300, fontSize: 54 },
  ...over,
});

const FILM = [...HAUSMUELL, ...KLINGELSTURM];

test("the type model knows every character the film's bubbles use", () => {
  const missing = new Set<string>();
  for (const l of FILM)
    for (const ch of l.text)
      for (const font of [FONT_METRICS.bangers, FONT_METRICS.comicNeue])
        if (!(ch in font.advance)) missing.add(ch);
  expect([...missing]).toEqual([]);
});

test("text wraps at spaces and after hyphens, never inside a word", () => {
  expect(wrapText("Polizei-Notruf.", "comicNeue", 54, 0, 260)).toEqual([
    "Polizei-",
    "Notruf.",
  ]);
  expect(
    wrapText("Der Umwelt zuliebe nicht.", "comicNeue", 54, 0, 2000),
  ).toEqual(["Der Umwelt zuliebe nicht."]);
  expect(wrapText("Der Umwelt zuliebe nicht.", "comicNeue", 54, 0, 1)).toEqual([
    "Der",
    "Umwelt",
    "zuliebe",
    "nicht.",
  ]);
});

test("the checks catch type that is too small, too wide or too tall for its bubble", () => {
  expect(
    textProblems([line({ box: { ...line({}).box, fontSize: 30 } })]),
  ).toEqual(["test: type 30 px, below 46 px"]);
  expect(
    textProblems([
      line({ text: "Weisungsbefugnis", box: { ...line({}).box, width: 300 } }),
    ])[0],
  ).toMatch(
    /^test: "Weisungsbefugnis" is \d+ px wide, the bubble holds \d+ px$/,
  );
  expect(
    textProblems([
      line({
        text: "Bitte hinterlassen Sie eine Nachricht nach dem Signalton.",
        box: { ...line({}).box, height: 200 },
      }),
    ])[0],
  ).toMatch(/^test: \d lines need \d+ px, the bubble holds \d+ px$/);
  expect(textProblems([line({})])).toEqual([]);
});

test("a phone voice is set smaller than the box size, by the phone scale", () => {
  expect(bubbleLayout(line({ tone: "phone" })).size).toBeCloseTo(
    54 * TEXT.phoneScale,
    9,
  );
  expect(bubbleLayout(line({ tone: "calm" })).size).toBe(54);
});

test("every bubble in the film is big enough to read and holds its text", () => {
  expect(textProblems(FILM)).toEqual([]);
});
