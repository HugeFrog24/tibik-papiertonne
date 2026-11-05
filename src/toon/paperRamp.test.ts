import { expect, test } from "vitest";
import { PAPER_LEVELS } from "./paperRamp";

test("paper has its own finer toon ramp, so a crease or a bend shows as a step in brightness", () => {
  expect(PAPER_LEVELS.length).toBeGreaterThanOrEqual(5);
  for (let i = 1; i < PAPER_LEVELS.length; i++) expect(PAPER_LEVELS[i]).toBeGreaterThan(PAPER_LEVELS[i - 1]);
  expect(PAPER_LEVELS[PAPER_LEVELS.length - 1]).toBe(1);
  expect(PAPER_LEVELS[0]).toBeGreaterThanOrEqual(0.5);
});
