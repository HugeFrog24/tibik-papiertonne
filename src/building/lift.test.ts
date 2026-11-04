import { expect, test } from "vitest";
import { STOREYS } from "../street/building";
import { LIFT_CABIN, LIFT_DOORS, liftDisplay } from "./stairwell";

test("every lift door's floor indicator shows the one floor the cabin waits on", () => {
  expect(Number.isInteger(LIFT_CABIN.storey)).toBe(true);
  expect(LIFT_CABIN.storey).toBeGreaterThan(0);
  expect(LIFT_CABIN.storey).toBeLessThan(STOREYS);
  expect(LIFT_DOORS).toHaveLength(STOREYS);
  expect(liftDisplay()).toBe(String(LIFT_CABIN.storey));
});
