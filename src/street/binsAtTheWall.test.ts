import { expect, test } from "vitest";
import { FACADE_Z } from "./building";
import { BINS } from "./layout";
import { tonneColliders } from "./tonneShape";

const OFF_THE_WALL = 0.01;

test("every Tonne stands in front of the house wall, its back bar included, at least a centimetre off it", () => {
  for (const bin of BINS)
    for (const part of tonneColliders(bin.name, bin.position, 0)) {
      const reach = part.axes.reduce((sum, axis, i) => sum + Math.abs(axis.z) * part.half[i], 0);
      expect(part.center.z - reach - FACADE_Z, part.name).toBeGreaterThanOrEqual(OFF_THE_WALL);
    }
});
