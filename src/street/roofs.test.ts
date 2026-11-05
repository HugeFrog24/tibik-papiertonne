import { expect, test } from "vitest";
import { CORE } from "../building/stairwell";
import { BLOCK_SPAN, BUILDING_HEIGHT, CORNICE, FACADE_Z, KERB_HEIGHT, KERB_Y, ROAD_Y, acrossFootprint, acrossZ } from "./building";
import { FACADE_THICKNESS } from "./facade";
import { footprint, overlap, partFootprint, type Footprint } from "./footprint";
import { STREET_PARTS } from "./layout";
import { ROAD_PLANE, STREET_END, STREET_MIDDLE } from "./roadShape";
import { BLOCK_DEPTH, PARAPET, TOWN, TOWN_GROUND, endBlockFootprint, roofParts, townFootprint, townWindows, townWindowsOn } from "./townShape";

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

const bottom = (p: { center: readonly number[]; size: readonly number[] }) => p.center[1] - p.size[1] / 2;
const span = (p: { center: readonly number[]; size: readonly number[] }, axis: number) =>
  [p.center[axis] - p.size[axis] / 2, p.center[axis] + p.size[axis] / 2] as const;

test("the parapets stand on the slab, the front one right behind the cornice, and no roof part runs into another", () => {
  const front = parapets.reduce((a, b) => (b.center[2] > a.center[2] ? b : a));
  expect(span(front, 2)[1]).toBeCloseTo(span(CORNICE, 2)[0], 9);
  expect(bottom(CORNICE)).toBeCloseTo(top(slab), 9);
  for (const part of parts.filter((p) => p !== slab)) {
    expect(parts.some((q) => q !== part && Math.abs(top(q) - bottom(part)) < 1e-9), `${part.name} rests on something`).toBe(true);
    for (const axis of [0, 2]) {
      expect(span(part, axis)[0], part.name).toBeGreaterThanOrEqual(Math.min(span(slab, axis)[0], span(CORNICE, axis)[0]) - 1e-9);
      expect(span(part, axis)[1], part.name).toBeLessThanOrEqual(Math.max(span(slab, axis)[1], span(CORNICE, axis)[1]) + 1e-9);
    }
  }
  const above = parts.filter((p) => p !== slab);
  for (const [i, a] of above.entries())
    for (const b of above.slice(i + 1)) {
      const inside = [0, 1, 2].every((axis) => span(a, axis)[0] < span(b, axis)[1] - 1e-9 && span(b, axis)[0] < span(a, axis)[1] - 1e-9);
      expect(inside, `${a.name} into ${b.name}`).toBe(false);
    }
});

test("the smoke vent's dome is in the roof data, so a camera's clearance test sees what is drawn", () => {
  const upstand = parts.find((p) => p.name === "smoke vent")!;
  const dome = parts.find((p) => p.name === "smoke vent dome")!;
  expect(bottom(dome)).toBeCloseTo(top(upstand), 9);
  expect(dome.size[0]).toBeCloseTo(dome.size[2], 9);
  expect(dome.size[1]).toBeCloseTo(dome.size[0] / 2, 9);
  expect(dome.size[0]).toBeLessThan(upstand.size[0]);
  expect(dome.center[0]).toBeCloseTo(upstand.center[0], 9);
  expect(dome.center[2]).toBeCloseTo(upstand.center[2], 9);
});

const grow = (fp: Footprint, by: number): Footprint => ({
  x: [fp.x[0] - by, fp.x[1] + by],
  z: [fp.z[0] - by, fp.z[1] + by],
});

test("behind both rows the town keeps its distance: nothing nearer than z = -20 behind No. 12, and the same behind No. 13", () => {
  for (const b of TOWN) {
    const fp = townFootprint(b);
    if (b.z < STREET_MIDDLE) expect(fp.z[1]).toBeLessThanOrEqual(-20);
    else expect(fp.z[0]).toBeGreaterThanOrEqual(acrossZ(-20));
  }
});

test("the town runs on past both ends of the street", () => {
  expect(TOWN.some((b) => b.x > STREET_END)).toBe(true);
  expect(TOWN.some((b) => b.x < -STREET_END)).toBe(true);
});

test("the town's blocks stand apart, with a lane of at least 3 m between any two", () => {
  for (const [i, a] of TOWN.entries())
    for (const b of TOWN.slice(i + 1))
      expect(overlap(grow(townFootprint(a), 1.5), grow(townFootprint(b), 1.5)), `${a.x},${a.z} / ${b.x},${b.z}`).toBe(false);
});

test("the town stays off the road and clear of the blocks that close the street's ends", () => {
  const road = footprint(0, ROAD_PLANE.z, ROAD_PLANE.length, ROAD_PLANE.depth);
  for (const b of TOWN) {
    const fp = townFootprint(b);
    expect(overlap(fp, road)).toBe(false);
    for (const end of [1, -1] as const) expect(overlap(fp, endBlockFootprint(end))).toBe(false);
  }
  expect(endBlockFootprint(1).x[0]).toBeCloseTo(STREET_END, 9);
  expect(endBlockFootprint(1).x[1]).toBeCloseTo(STREET_END + BLOCK_DEPTH, 9);
  expect(endBlockFootprint(-1).x[1]).toBeCloseTo(-STREET_END, 9);
});

test("the town's windows switch off one by one as the night goes on; none of them dims", () => {
  let before = TOWN.map((block, i) => new Set(townWindowsOn(block, i, 1)));
  const all = TOWN.reduce((n, block) => n + townWindows(block).length, 0);
  const lit = before.reduce((n, on) => n + on.size, 0);
  expect(lit / all).toBeGreaterThan(0.1);
  expect(lit / all).toBeLessThan(0.35);
  for (const share of [0.8, 0.5, 0.2, 0]) {
    const now = TOWN.map((block, i) => new Set(townWindowsOn(block, i, share)));
    now.forEach((on, i) => {
      for (const k of on) expect(before[i].has(k)).toBe(true);
    });
    before = now;
  }
  expect(before.every((on) => on.size === 0)).toBe(true);
});

test("seen from above the town stands on ground: one plane under every block and yard, below every street surface", () => {
  for (const b of TOWN) {
    const fp = townFootprint(b);
    expect(fp.x[0]).toBeGreaterThan(TOWN_GROUND.x[0]);
    expect(fp.x[1]).toBeLessThan(TOWN_GROUND.x[1]);
    expect(fp.z[0]).toBeGreaterThan(TOWN_GROUND.z[0]);
    expect(fp.z[1]).toBeLessThan(TOWN_GROUND.z[1]);
  }
  expect(TOWN_GROUND.y).toBeLessThan(ROAD_Y - 0.05);
  expect(TOWN_GROUND.y).toBeLessThan(KERB_Y - KERB_HEIGHT / 2 - 0.05);
});
