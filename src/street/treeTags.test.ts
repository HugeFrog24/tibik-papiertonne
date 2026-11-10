import { Vector3 } from "three";
import { expect, test } from "vitest";
import { seenBy } from "../dialogue/screen";
import { SHOTS } from "../scenes/hausmuell/cameras";
import { OUTLINE } from "../toon/primitives";
import {
  MORE_TREES,
  STREET_PARTS,
  STREET_TREE_XS,
  TREE_POSITION,
} from "./layout";
import { STREET_TREES, TREE_TAG, TRUNK, treeNumber } from "./trees";
import { poleBox, wrapNormal, wrapWidth } from "./wraps";
import { wrapGaps } from "./wrapChecks";

test("the trunk drawn is the trunk that collides: same height and base width", () => {
  const solid = STREET_PARTS.find((p) => p.name === "tree trunk")!;
  expect(solid.size).toEqual(poleBox(TRUNK));
  expect(solid.size).toEqual([0.26, 3.2, 0.26]);
  expect(solid.center[1]).toBe(TRUNK.height / 2);
  expect(TRUNK.radiusAt(0)).toBe(TRUNK.radius[1]);
  expect(TRUNK.radiusAt(TRUNK.height)).toBeCloseTo(TRUNK.radius[0], 12);
});

test("each tree's tag is a small plate nailed flat to the bark, 0.5-2 mm proud, inside the ink line, at about 2 m", () => {
  const gaps = wrapGaps(TRUNK, TREE_TAG);
  expect(Math.min(...gaps)).toBeGreaterThanOrEqual(0.0005);
  expect(Math.max(...gaps)).toBeLessThanOrEqual(0.002);
  expect(Math.max(...gaps)).toBeLessThan(OUTLINE);
  const width = wrapWidth(TRUNK, TREE_TAG);
  expect(width).toBeGreaterThanOrEqual(0.06);
  expect(width).toBeLessThanOrEqual(0.1);
  expect(TREE_TAG.bottom).toBeGreaterThanOrEqual(1.8);
  expect(TREE_TAG.bottom + TREE_TAG.height).toBeLessThanOrEqual(2.5);
});

test("every tree on both sides of the street has its own number, the one drawn on its tag", () => {
  expect(STREET_TREES).toHaveLength(1 + 2 * MORE_TREES.length);
  const numbers = STREET_TREES.map((t) => t.number);
  expect(new Set(numbers).size).toBe(STREET_TREES.length);
  for (const n of numbers) expect(n).toMatch(/^\d{3}$/);
  const near = STREET_TREES.filter((t) => t.side === "near").map((t) => t.x);
  const far = STREET_TREES.filter((t) => t.side === "far").map((t) => t.x);
  expect([...near].sort((a, b) => a - b)).toEqual(
    [...STREET_TREE_XS].sort((a, b) => a - b),
  );
  expect([...far].sort((a, b) => a - b)).toEqual(
    [...MORE_TREES].sort((a, b) => a - b),
  );
  for (const t of STREET_TREES) expect(treeNumber(t.side, t.x)).toBe(t.number);
  expect(() => treeNumber("near", 999)).toThrow();
});

test("the tree behind Karen shows its tag to the camera", () => {
  const shot = SHOTS.find((s) => s.name === "Karen: Hausmüll")!;
  const setup = shot.at((shot.from + shot.to) / 2);
  const { x: nx, z: nz } = wrapNormal(TRUNK, TREE_TAG);
  const normal = new Vector3(nx, 0, nz);
  const at = new Vector3(
    20,
    TREE_TAG.bottom + TREE_TAG.height / 2,
    TREE_POSITION[2],
  );
  expect(STREET_TREE_XS).toContain(20);
  expect(seenBy(at, setup)).toBe(true);
  expect(
    new Vector3(...setup.position).sub(at).normalize().dot(normal),
  ).toBeGreaterThan(0.5);
});
