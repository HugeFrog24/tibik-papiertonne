import { expect, test } from "vitest";
import { BALCONIES, BALCONY, balconyParts, railingHeightFor } from "./building";

test("German codes: a railing is 0.90 m up to a 12 m drop and 1.10 m above it", () => {
  expect(railingHeightFor(3)).toBeCloseTo(0.9, 9);
  expect(railingHeightFor(12)).toBeCloseTo(0.9, 9);
  expect(railingHeightFor(12.5)).toBeCloseTo(1.1, 9);
});

test("every balcony is railed on its three open sides, full height, standing on the slab", () => {
  for (const { y } of BALCONIES) {
    const parts = balconyParts(y);
    const height = railingHeightFor(y);
    const [w, , d] = BALCONY.slab;
    const front = parts.filter((p) => p.name === "front");
    const sides = parts.filter((p) => p.name === "side");
    expect(front).toHaveLength(1);
    expect(sides).toHaveLength(2);
    expect(front[0].size[0]).toBeCloseTo(w, 9);
    expect(front[0].center[2] + front[0].size[2] / 2).toBeCloseTo(d, 9);
    for (const side of sides) {
      expect(Math.abs(side.center[0]) + side.size[0] / 2).toBeCloseTo(w / 2, 9);
      expect(side.center[2] - side.size[2] / 2).toBeCloseTo(0, 9);
      expect(side.center[2] + side.size[2] / 2).toBeGreaterThanOrEqual(
        front[0].center[2] - front[0].size[2] / 2 - 1e-9,
      );
    }
    for (const rail of [...front, ...sides]) {
      expect(rail.center[1] - rail.size[1] / 2).toBeCloseTo(0, 9);
      expect(rail.center[1] + rail.size[1] / 2).toBeCloseTo(height, 9);
    }
  }
});
