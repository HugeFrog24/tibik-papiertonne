import { expect, test } from "vitest";
import { BED_RECT } from "../building/bedroomShape";
import { allColliders, bodyColliders } from "../characters/skeleton";
import { lyingInBed } from "../Tibik/bedPoses";
import { RIG } from "../Tibik/rig";
import { OUTLINE } from "../toon/primitives";
import { BLANKET, blanketEdge, blanketGrid, blanketSurface } from "./blanketShape";

const sides = [1, -1] as const;
const bodyOf = (side: 1 | -1) => allColliders(RIG, lyingInBed(side));

const covered = (side: 1 | -1, cover: number) => {
  const body = bodyOf(side);
  const grid = blanketGrid(BED_RECT, body, cover);
  const at = (i: number, j: number) => grid.height(grid.columns[i], grid.rows[j]);
  return { body, grid, at };
};

test("the drawn blanket never passes through him or the mattress, outlines included, between its vertices too", () => {
  for (const side of sides)
    for (const cover of [0, 0.5, 1]) {
      const { body, grid, at } = covered(side, cover);
      const problems: string[] = [];
      const check = (x: number, z: number, h: number) => {
        const overMattress = x >= BED_RECT.x0 && x <= BED_RECT.x1 && z >= BED_RECT.z0 && z <= BED_RECT.z1;
        if (overMattress && h < BED_RECT.top + 0.001) problems.push(`into the mattress at ${x.toFixed(2)},${z.toFixed(2)}`);
        for (const s of body) {
          const reach = s.radius + OUTLINE / 2;
          const d = Math.hypot(x - s.center.x, z - s.center.z);
          if (d < reach && h < s.center.y + Math.sqrt(reach * reach - d * d)) problems.push(`into his ${s.name} at ${x.toFixed(2)},${z.toFixed(2)}`);
        }
      };
      for (let i = 0; i < grid.columns.length; i++)
        for (let j = 0; j < grid.rows.length; j++) {
          check(grid.columns[i], grid.rows[j], at(i, j));
          if (i + 1 < grid.columns.length && j + 1 < grid.rows.length) {
            const x = (grid.columns[i] + grid.columns[i + 1]) / 2;
            const z = (grid.rows[j] + grid.rows[j + 1]) / 2;
            check(x, z, Math.min((at(i, j) + at(i + 1, j + 1)) / 2, (at(i + 1, j) + at(i, j + 1)) / 2));
          }
        }
      expect([...new Set(problems)].slice(0, 6), `side ${side}, cover ${cover}`).toEqual([]);
    }
});

test("the blanket's rows and columns meet the mattress's edges, and it hangs over the sides and the foot", () => {
  for (const side of sides) {
    const { grid, at } = covered(side, 1);
    const on = (values: readonly number[], v: number) => values.some((u) => Math.abs(u - v) < 1e-9);
    expect(on(grid.rows, BED_RECT.z0)).toBe(true);
    expect(on(grid.rows, BED_RECT.z1)).toBe(true);
    expect(on(grid.columns, BED_RECT.x1)).toBe(true);
    const middleColumn = Math.floor(grid.columns.length / 2);
    const awayRow = side === 1 ? 0 : grid.rows.length - 1;
    expect(BED_RECT.top - at(middleColumn, awayRow), `side ${side}`).toBeGreaterThan(0.08);
    expect(BED_RECT.top - at(grid.columns.length - 1, Math.floor(grid.rows.length / 2)), `side ${side}`).toBeGreaterThan(0.08);
  }
});

test("the blanket's hem comes down to the sheet where it does not lie on him", () => {
  const folded = blanketGrid(BED_RECT, [], 0);
  for (const z of folded.rows.filter((r) => r > BED_RECT.z0 && r < BED_RECT.z1))
    expect(folded.height(folded.columns[0], z) - BED_RECT.top).toBeLessThan(0.004);
});

test("pulled up it reaches his chest, folded it lies at the foot", () => {
  const placement = lyingInBed(1);
  const body = allColliders(RIG, placement);
  const chest = bodyColliders(RIG, placement).upperTorso;
  const chestX = chest.reduce((sum, s) => sum + s.center.x, 0) / chest.length;
  expect(Math.abs(blanketEdge(BED_RECT, body, 1) - chestX)).toBeLessThan(0.15);
  const folded = blanketEdge(BED_RECT, body, 0);
  expect(BED_RECT.x1 - folded).toBeGreaterThan(0.25);
  expect(BED_RECT.x1 - folded).toBeLessThan(0.55);
  expect(blanketEdge(BED_RECT, body, 0.5)).toBeGreaterThan(blanketEdge(BED_RECT, body, 1));
  expect(blanketEdge(BED_RECT, body, 0.5)).toBeLessThan(folded);
  expect(BLANKET.color).toBe("#3b3f45");
});

test("folded at the foot it lies in layers, thicker than one ply", () => {
  const height = blanketSurface(BED_RECT, [], 0);
  const middle = (BED_RECT.z0 + BED_RECT.z1) / 2;
  expect(height(BED_RECT.x1 - 0.1, middle) - BED_RECT.top).toBeGreaterThan(0.02);
  expect(blanketSurface(BED_RECT, [], 1)(BED_RECT.x1 - 0.1, middle) - BED_RECT.top).toBeLessThan(0.015);
});
