import { Box3 } from "three";
import { expect, test } from "vitest";
import { roundedSlab, type Outline } from "./extrude";

const L: Outline = [
  [-1, 0],
  [1, 0],
  [1, 0.3],
  [0.2, 0.3],
  [0.2, 0.8],
  [-1, 0.8],
];

const bounds = (geometry: ReturnType<typeof roundedSlab>) => {
  geometry.computeBoundingBox();
  return geometry.boundingBox as Box3;
};

test("a rounded slab keeps exactly its outline and width: the bevel rounds inwards", () => {
  const slab = bounds(roundedSlab(L, 0.6, { size: 0.06, thickness: 0.07 }));
  expect(slab.min.toArray().map((v) => +v.toFixed(6))).toEqual([-1, 0, -0.3]);
  expect(slab.max.toArray().map((v) => +v.toFixed(6))).toEqual([1, 0.8, 0.3]);
});

test("its grown twin wraps it by exactly the outline on every side", () => {
  const slab = bounds(roundedSlab(L, 0.6, { size: 0.06, thickness: 0.07 }));
  const hull = bounds(
    roundedSlab(L, 0.6, { size: 0.06, thickness: 0.07 }, 0.014),
  );
  for (const axis of ["x", "y", "z"] as const) {
    expect(slab.min[axis] - hull.min[axis]).toBeCloseTo(0.014, 6);
    expect(hull.max[axis] - slab.max[axis]).toBeCloseTo(0.014, 6);
  }
});
