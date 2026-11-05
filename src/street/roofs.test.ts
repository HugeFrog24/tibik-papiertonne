import { expect, test } from "vitest";
import { CORE } from "../building/stairwell";
import { BLOCK_SPAN, BUILDING_HEIGHT, FACADE_Z, acrossFootprint } from "./building";
import { FACADE_THICKNESS } from "./facade";
import { overlap, partFootprint } from "./footprint";
import { STREET_PARTS } from "./layout";
import { BLOCK_DEPTH, PARAPET, TOWN, roofParts } from "./townShape";

const top = (p: { center: readonly number[]; size: readonly number[] }) => p.center[1] + p.size[1] / 2;
const parts = roofParts();
const slab = parts.find((p) => p.name === "roof slab")!;
const parapets = parts.filter((p) => p.name === "parapet");

test("every block is roofed flat: the slab covers its footprint and a parapet runs round it", () => {
  expect(Math.abs(top(slab) - BUILDING_HEIGHT)).toBeLessThan(0.01);
  const fp = partFootprint(slab);
  expect(fp.x[0]).toBeCloseTo(-BLOCK_SPAN / 2, 9);
  expect(fp.x[1]).toBeCloseTo(BLOCK_SPAN / 2, 9);
  expect(fp.z[1]).toBeCloseTo(FACADE_Z - FACADE_THICKNESS, 9);
  expect(fp.z[0]).toBeCloseTo(FACADE_Z - BLOCK_DEPTH, 9);
  expect(parapets).toHaveLength(4);
  for (const p of parapets) {
    expect(top(p)).toBeCloseTo(BUILDING_HEIGHT + PARAPET.height, 9);
    expect(Math.min(p.size[0], p.size[2])).toBeCloseTo(PARAPET.thickness, 9);
  }
});

test("the smoke vent the stairwell button opens sits on the roof above the stairwell", () => {
  const dome = parts.find((p) => p.name === "smoke vent")!;
  expect(dome.center[0]).toBeGreaterThan(CORE.x0);
  expect(dome.center[0]).toBeLessThan(CORE.x1);
  expect(dome.center[2]).toBeGreaterThan(CORE.z1);
  expect(dome.center[2]).toBeLessThan(CORE.z0);
  expect(dome.center[1] - dome.size[1] / 2).toBeCloseTo(BUILDING_HEIGHT, 9);
});

test("the town lies beyond the street and never inside a block, the street or the across-street twin", () => {
  const blocks = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((n) => ({
    x: [n * BLOCK_SPAN - BLOCK_SPAN / 2, n * BLOCK_SPAN + BLOCK_SPAN / 2] as const,
    z: [FACADE_Z - BLOCK_DEPTH, FACADE_Z] as const,
  }));
  expect(TOWN.length).toBeGreaterThan(8);
  for (const b of TOWN) {
    const fp = { x: [b.x - b.w / 2, b.x + b.w / 2] as const, z: [b.z - b.d / 2, b.z + b.d / 2] as const };
    expect(b.h).toBeGreaterThanOrEqual(15);
    expect(b.h).toBeLessThanOrEqual(25);
    for (const block of blocks) {
      expect(overlap(fp, block), "a block").toBe(false);
      expect(overlap(fp, acrossFootprint(block)), "the across-street twin").toBe(false);
    }
    for (const part of STREET_PARTS) expect(overlap(fp, partFootprint(part)), part.name).toBe(false);
  }
});
