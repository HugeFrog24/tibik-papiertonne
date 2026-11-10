import { expect, test } from "vitest";
import { AJAR, AJAR_ANGLE } from "../scenes/klingelsturm/door";
import { TIBIK_DOOR } from "./stairwell";
import { flurSpill } from "./flurSpill";

test("warm light spills from his Flur only as far as his door is open: none shut, the slit's share of the doorway through the slit, most of it swung open", () => {
  expect(flurSpill(0)).toBe(0);
  expect(flurSpill(AJAR_ANGLE)).toBeCloseTo(AJAR.slit / TIBIK_DOOR.width, 9);
  expect(flurSpill(1.25)).toBeGreaterThan(0.6);
  for (let a = 0; a < Math.PI / 2; a += 0.05)
    expect(flurSpill(a + 0.05)).toBeGreaterThan(flurSpill(a));
  expect(flurSpill(Math.PI)).toBe(1);
});
