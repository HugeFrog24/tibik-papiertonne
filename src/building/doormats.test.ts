import { expect, test } from "vitest";
import { footCapsule } from "../characters/skeleton";
import { TIBIK_FOOT, sunkSoles } from "../scenes/drawnSoles";
import { TREPPENHAUS_DURATION } from "../scenes/treppenhaus/cameras";
import { treppenhausTibikGait } from "../scenes/treppenhaus/choreography";
import { solveTreppenhaus } from "../scenes/treppenhaus/solve";
import { RIG } from "../Tibik/rig";
import { OUTLINE } from "../toon/primitives";
import {
  DOORMATS,
  MAT_SIZES,
  MAT_THICKNESS,
  SHOE,
  SHOES,
  doorOfMat,
  doormatRect,
} from "./doormatShape";
import { reachOver } from "../street/footprint";
import {
  FLAT_DOORS,
  TIBIK_DOOR,
  TREADS,
  onTread,
  stairwellGround,
} from "./stairwell";

test("each doormat lies flat on one landing slab, in front of its own door and no wider than it", () => {
  for (const mat of DOORMATS) {
    const r = doormatRect(mat);
    const door = doorOfMat(mat);
    const slab = TREADS.find(
      (t) =>
        t.top === r.y &&
        [r.x0, r.x1].every((x) => [r.z0, r.z1].every((z) => onTread(t, x, z))),
    );
    expect(slab, `${mat.storey} ${mat.side}`).toBeDefined();
    expect(slab!.name).toMatch(/landing|hallway/);
    expect(r.z1 - r.z0).toBeLessThanOrEqual(door.width);
    const doorMiddle = door.hinge[2] + door.width / 2;
    expect((r.z0 + r.z1) / 2).toBeCloseTo(doorMiddle, 9);
    expect(door.hinge[1]).toBeGreaterThan(r.y);
  }
});

test("they come in the usual shop sizes, 40 × 60 or 50 × 80 cm", () => {
  for (const mat of DOORMATS)
    expect(Object.values(MAT_SIZES)).toContainEqual(mat.size);
});

test("at most one per door, not every flat has one, and Tibik has one", () => {
  const keys = DOORMATS.map((m) => `${m.storey}-${m.side}`);
  expect(new Set(keys).size).toBe(keys.length);
  expect(DOORMATS.length).toBeLessThan(FLAT_DOORS.length);
  expect(DOORMATS.map(doorOfMat)).toContain(TIBIK_DOOR);
});

test("a mat clears its closed door leaf, outlines included", () => {
  for (const mat of DOORMATS) {
    const r = doormatRect(mat);
    const door = doorOfMat(mat);
    const inner = mat.side === "links" ? r.x0 : r.x1;
    expect(
      Math.abs(inner - door.hinge[0]) - door.thickness / 2,
    ).toBeGreaterThan(2 * OUTLINE);
  }
});

test("the neighbour's shoes stand on their mat, not in it", () => {
  const mat = DOORMATS.find((m) => m.storey === 1 && m.side === "rechts")!;
  const r = doormatRect(mat);
  for (const shoe of SHOES) {
    expect(shoe.position[1] - SHOE[1]).toBeCloseTo(r.y + MAT_THICKNESS, 9);
    expect(shoe.position[0] - SHOE[0]).toBeGreaterThan(r.x0);
    expect(shoe.position[0] + SHOE[0]).toBeLessThan(r.x1);
    expect(shoe.position[2] - SHOE[2]).toBeGreaterThan(r.z0);
    expect(shoe.position[2] + SHOE[2]).toBeLessThan(r.z1);
  }
});

test("in the Treppenhaus Tibik steps onto his own mat, and the gait plants that foot on the mat's top", () => {
  const { heel, toe, radius } = footCapsule(RIG, 1);
  const sole = -heel[1] + radius;
  const mat = DOORMATS.find((m) => doorOfMat(m).name === "Tibik's door")!;
  const r = doormatRect(mat);
  let onIt = 0;
  for (const leg of ["leftLeg", "rightLeg"] as const)
    for (const plant of treppenhausTibikGait().plants[leg]) {
      const { x, y, z } = plant.ankle;
      const reach = toe[2] + radius;
      if (!reachOver(x, z, reach, r) || Math.abs(y - sole - r.y) > 0.1)
        continue;
      onIt++;
      if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1)
        expect(plant.support).toBeCloseTo(r.y + MAT_THICKNESS, 9);
    }
  expect(onIt).toBeGreaterThan(0);
});

const MAT_TOPS = DOORMATS.map(doormatRect);

const floorAndMats = (x: number, z: number) => {
  const floor = stairwellGround(x, z);
  const mat = MAT_TOPS.find(
    (r) =>
      Math.abs(r.y - floor) < 1e-9 &&
      x >= r.x0 &&
      x <= r.x1 &&
      z >= r.z0 &&
      z <= r.z1,
  );
  return mat ? mat.y + MAT_THICKNESS : floor;
};

test(
  "in the Treppenhaus his drawn soles, outline included, never dip into a mat as drawn or the floor",
  { timeout: 300_000 },
  () => {
    const problems = sunkSoles(
      TIBIK_FOOT,
      (t) => ({ ...solveTreppenhaus(t).tibik, skeleton: RIG }),
      0,
      TREPPENHAUS_DURATION,
      floorAndMats,
    );
    expect(problems.slice(0, 6)).toEqual([]);
  },
);
