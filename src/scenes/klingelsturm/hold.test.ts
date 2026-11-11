import { expect, test } from "vitest";
import TAKES from "../../dialogue/takes.json";
import { TIMELINE_FPS } from "../../frameRate";
import { spokenLength } from "../../dialogue/speechSpan";
import { LINES } from "./choreography";
import { SHUT } from "./door";
import { KLINGELSTURM_CLOCKS, NOT_FOR_THE_ENVIRONMENT } from "./hold";
import { takeIdOf } from "../recordingScript";

const line = LINES.find((l) => takeIdOf(l) === NOT_FOR_THE_ENVIRONMENT)!;

test("the line the gap shot holds for is his answer through the gap, 'Der Umwelt zuliebe nicht.', in English 'Nooo. Not for the environment's sake.'", () => {
  expect(line.text).toBe("Der Umwelt zuliebe nicht.");
  expect(line.speaker).toBe("tibik");
});

test("only the English gap shot holds, by as many whole frames as his English answer outlasts the German one, so he says it at his own pace (owner, 2026-11-11)", () => {
  expect(KLINGELSTURM_CLOCKS.de.frames).toBe(0);
  const longer = spokenLength(TAKES.en[NOT_FOR_THE_ENVIRONMENT]) - spokenLength(TAKES.de[NOT_FOR_THE_ENVIRONMENT]);
  expect(KLINGELSTURM_CLOCKS.en.holds).toHaveLength(1);
  expect(KLINGELSTURM_CLOCKS.en.frames).toBe(Math.ceil(longer * TIMELINE_FPS - 1e-9));
  expect(KLINGELSTURM_CLOCKS.en.frames).toBe(37);
});

test("the English hold comes while he is still speaking, a moment before his door starts to shut, when nothing in the story moves but Karen's breathing", () => {
  const [{ at }] = KLINGELSTURM_CLOCKS.en.holds;
  expect(at).toBeCloseTo(SHUT[0] - 0.15, 9);
  expect(Number.isInteger(Math.round(at * TIMELINE_FPS * 1e6) / 1e6)).toBe(true);
  expect(at).toBeGreaterThan(line.from);
  expect(at).toBeLessThan(SHUT[0]);
});

test("in English his last word ends as long before the door starts to shut as in German", () => {
  const clock = KLINGELSTURM_CLOCKS.en;
  const germanGap = SHUT[0] - (line.from + spokenLength(TAKES.de[NOT_FOR_THE_ENVIRONMENT]));
  const englishGap = clock.editAt(SHUT[0]) - (clock.editAt(line.from) + spokenLength(TAKES.en[NOT_FOR_THE_ENVIRONMENT]));
  expect(englishGap).toBeGreaterThanOrEqual(germanGap - 1e-9);
  expect(englishGap - germanGap).toBeLessThan(1 / TIMELINE_FPS);
});
