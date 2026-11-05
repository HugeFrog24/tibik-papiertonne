import { expect, test } from "vitest";
import { throughTheWalls } from "./IndoorLoop";

test("a loop heard through the walls splits its level between the plain and the muffled twin, never louder or quieter in sum", () => {
  expect(throughTheWalls(0.35, 0)).toEqual({ outside: 0.35, inside: 0 });
  expect(throughTheWalls(0.35, 1)).toEqual({ outside: 0, inside: 0.35 });
  for (const indoors of [0.1, 0.5, 0.9]) {
    const { outside, inside } = throughTheWalls(0.35, indoors);
    expect(outside + inside).toBeCloseTo(0.35, 12);
    expect(inside).toBeCloseTo(0.35 * indoors, 12);
  }
});
