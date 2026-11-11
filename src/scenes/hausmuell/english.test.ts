import { expect, test } from "vitest";
import { solveHausmuell, solveHausmuellIn } from "./solve";
import { LINES, tibikAt } from "./choreography";
import { spokenSpans } from "../../dialogue/voiced";

const english = solveHausmuellIn("en");
const spans = spokenSpans("hausmuell", LINES, "en");

test("German Hausmüll is solved as before, by the German solver", () => {
  expect(solveHausmuellIn("de")).toBe(solveHausmuell);
});

test("in English Karen shouts with her English takes: her mouth works midway through each of her lines, and is shut again a beat after the last one", () => {
  for (const line of LINES.filter((l) => l.speaker === "karen")) {
    const [from, to] = spans(line);
    expect(english((from + to) / 2).karen.mouthOpen, line.name).toBeGreaterThanOrEqual(0.55);
  }
  const last = spans(LINES.filter((l) => l.speaker === "karen").at(-1)!)[1];
  expect(english(last + 0.2).karen.mouthOpen).toBeLessThan(0.55);
});

test("in English Karen is still shouting 'I'M REPORTING YOU TO PROPERTY MANAGEMENT!' after the shorter German line would have ended", () => {
  const line = LINES.find((l) => l.text === "ICH MELDE SIE DER HAUSVERWALTUNG!")!;
  const [, to] = spans(line);
  const [, germanTo] = spokenSpans("hausmuell", LINES)(line);
  expect(to - germanTo).toBeGreaterThan(0.5);
  expect(english(to - 0.1).karen.mouthOpen).toBeGreaterThanOrEqual(0.55);
  expect(solveHausmuell(to - 0.1).karen.mouthOpen).toBeLessThan(0.55);
});

test("in English Tibik's talking nod is timed to his own English lines, as it is to the German ones", () => {
  for (const line of LINES.filter((l) => l.speaker === "tibik")) {
    const [from, to] = spans(line);
    const pitches = Array.from({ length: 9 }, (_, i) => tibikAt(from + ((to - from) * (i + 1)) / 10, "en").pose.headPitch);
    expect(Math.max(...pitches) - Math.min(...pitches), line.name).toBeGreaterThan(0.01);
  }
});
