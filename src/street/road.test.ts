import { expect, test } from "vitest";
import { PARKED_CARS, tyreFootprints } from "./carShape";
import {
  GULLIES,
  MANHOLES,
  gullyFootprint,
  kerbFace,
  manholeFootprint,
} from "./drainShape";
import { overlap, type Footprint } from "./footprint";
import { JOINT, PATCHES, ROAD_PLANE, jointFootprint } from "./roadShape";

const tyres = PARKED_CARS.flatMap(tyreFootprints);
const fixtures: Footprint[] = [
  ...tyres,
  ...GULLIES.map(gullyFootprint),
  ...MANHOLES.map(manholeFootprint),
];

test("the asphalt plane covers the carriageway from kerb to kerb", () => {
  expect(ROAD_PLANE.z - ROAD_PLANE.depth / 2).toBeLessThan(kerbFace(false));
  expect(ROAD_PLANE.z + ROAD_PLANE.depth / 2).toBeGreaterThan(kerbFace(true));
});

test("it was laid in two passes: one sealed joint, off the sewer line, clear of every cover and tyre", () => {
  const middle = (kerbFace(false) + kerbFace(true)) / 2;
  expect(Math.abs(JOINT.z - middle)).toBeGreaterThan(0.5);
  expect(JOINT.z).toBeGreaterThan(kerbFace(false) + 3);
  expect(JOINT.z).toBeLessThan(kerbFace(true) - 3);
  for (const fixture of fixtures)
    expect(overlap(jointFootprint, fixture)).toBe(false);
});

test("patches lie on the carriageway, clear of tyres, gullies, covers, the joint and each other", () => {
  expect(PATCHES.length).toBeGreaterThanOrEqual(2);
  PATCHES.forEach((patch, i) => {
    expect(patch.z[0]).toBeGreaterThanOrEqual(kerbFace(false));
    expect(patch.z[1]).toBeLessThanOrEqual(kerbFace(true));
    for (const other of [...fixtures, jointFootprint, ...PATCHES.slice(i + 1)])
      expect(overlap(patch, other)).toBe(false);
  });
});
