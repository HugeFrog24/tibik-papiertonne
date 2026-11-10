import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { LETTER_LINES, READ_OUT } from "./letter";
import { DEADPAN_HOLD, READ, THANKS } from "./choreography";
import { LETTER_READ, sentencesOf } from "./narration";
import { wordsOf } from "../../dialogue/text";
import { takeIdOf } from "../recordingScript";
import { takeOf } from "../voices";

const READ_OUT_LINES = LETTER_LINES.slice(...READ_OUT);
const PUNCHLINE = "Die Entnahme von Kartons aus der Papiertonne (w/m/d) ist aus Umweltgründen nicht gestattet.";

test("the letter is mirrored in the subtitles word for word, from its salutation to its closing ban, read by the narrator; nothing after the punchline is read", () => {
  expect(LETTER_READ.flatMap((l) => wordsOf(l.text))).toEqual(READ_OUT_LINES.flatMap((l) => wordsOf(l.text)));
  expect(LETTER_READ[LETTER_READ.length - 1].text).toBe(PUNCHLINE);
  expect(LETTER_READ.some((l) => l.text.includes("Vie-len DANK") || l.text.includes("Mit freundlichen"))).toBe(false);
  expect(LETTER_READ.every((l) => l.speaker === "narrator" && l.tone === "calm")).toBe(true);
});

test("the narration runs while he reads, one line at a time, and ends on the punchline; the thanks takes no film time and the deadpan after the punchline is silent", () => {
  LETTER_READ.forEach((line, i) => {
    expect(line.to).toBeGreaterThan(line.from);
    if (i > 0) expect(line.from).toBeGreaterThanOrEqual(LETTER_READ[i - 1].to);
    expect(line.from >= READ[0] && line.to <= READ[1] + 1e-9).toBe(true);
  });
  expect(LETTER_READ[0].from).toBe(READ[0]);
  expect(LETTER_READ[LETTER_READ.length - 1].to).toBe(READ[1]);
  expect(THANKS[1] - THANKS[0]).toBe(0);
  expect(THANKS[0]).toBe(READ[1]);
  expect(DEADPAN_HOLD).toBeGreaterThan(0);
});

test("sentences the letter breaks over two lines are one subtitle line", () => {
  expect(LETTER_READ.map((l) => l.text)).toContain(PUNCHLINE);
});

test("the scene shows the narration in the subtitle bar", () => {
  const scene = readFileSync(path.join("src", "scenes", "rundschreiben", "Rundschreiben.tsx"), "utf8");
  expect(scene.includes("<DialogueTrack lines={LETTER_READ} name=\"Narration\" />")).toBe(true);
});

test("the letter is read a sentence at a time: no subtitle line runs on past the end of a sentence, wherever the letter wraps it", () => {
  for (const line of LETTER_READ) expect(line.text.slice(0, -1), line.text).not.toMatch(/[.:!?]\s/);
  expect(LETTER_READ.map((l) => l.text)).toContain("Sollten Sie einen Karton benötigen, ist dieser ausschließlich als Neuware käuflich zu erwerben.");
  expect(LETTER_READ.map((l) => l.text)).toContain("Der örtliche Baumarkt berät Sie gerne hinsichtlich der verfügbaren Größen und Bauformen.");
});

test("a new paragraph always starts a new subtitle line, even after a line that ends without a full stop", () => {
  expect(sentencesOf([{ text: "Ohne Punkt", role: "body" }, { text: "Neuer Absatz.", role: "body", paragraph: true }]).map((s) => s.text)).toEqual(["Ohne Punkt", "Neuer Absatz."]);
  expect(sentencesOf([{ text: "Wir bitten", role: "body" }, { text: "um Ruhe.", role: "body" }]).map((s) => s.text)).toEqual(["Wir bitten um Ruhe."]);
});

test("the letter is read at the pace of Tibik's German takes: each sentence starts as its voice starts and lasts its take plus an even share of the reading's pauses, so no sentence runs into the next and the reading keeps its length", () => {
  const takes = LETTER_READ.map((line) => takeOf("de", takeIdOf(line)!)!);
  const speech = takes.map((take) => take.speech[0][1] - take.speech[0][0]);
  const pause = (READ[1] - READ[0] - speech.reduce((a, b) => a + b, 0)) / LETTER_READ.length;
  expect(pause).toBeGreaterThan(0.3);
  expect(LETTER_READ[0].from).toBeCloseTo(READ[0], 9);
  expect(LETTER_READ[LETTER_READ.length - 1].to).toBeCloseTo(READ[1], 9);
  LETTER_READ.forEach((line, i) => {
    expect(line.to - line.from, line.text).toBeCloseTo(speech[i] + pause, 9);
    if (i > 0) expect(line.from, line.text).toBeCloseTo(LETTER_READ[i - 1].to, 9);
  });
});
