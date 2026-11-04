import { expect, test } from "vitest";
import { CAR_VIEWS } from "./carViews";
import {
  ACROSS_STREET,
  MORE_TREES,
  STREET_PARTS,
  TREE_POSITION,
  acrossZ,
} from "./layout";

const trunks = [
  [TREE_POSITION[0], TREE_POSITION[2]],
  ...MORE_TREES.map((x) => [x, TREE_POSITION[2]]),
  ...MORE_TREES.map((x) => [
    ACROSS_STREET.shift - x,
    acrossZ(TREE_POSITION[2]),
  ]),
];

test("the car sheet's cameras stand clear of every tree trunk and inside no car", () => {
  for (const { position } of CAR_VIEWS) {
    const [x, y, z] = position;
    for (const [tx, tz] of trunks)
      expect(Math.hypot(x - tx, z - tz)).toBeGreaterThan(0.4);
    for (const part of STREET_PARTS.filter((p) => p.name === "parked car")) {
      const inside = part.center.every(
        (c, i) => Math.abs([x, y, z][i] - c) < part.size[i] / 2,
      );
      expect(inside).toBe(false);
    }
  }
});
