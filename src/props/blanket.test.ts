import { expect, test } from "vitest";
import { BED_RECT } from "../building/bedroomShape";
import { allColliders, bodyColliders } from "../characters/skeleton";
import { lyingInBed } from "../Tibik/bedPoses";
import { RIG, TIBIK_REST } from "../Tibik/rig";
import { blanketProblems } from "./blanketChecks";
import { BLANKET, blanketEdge, blanketGrid, blanketSurface } from "./blanketShape";

const sides = [1, -1] as const;
const bodyOf = (side: 1 | -1) => allColliders(RIG, lyingInBed(side));

const covered = (side: 1 | -1, cover: number) => {
  const body = bodyOf(side);
  const grid = blanketGrid(BED_RECT, body, { cover });
  const at = (i: number, j: number) => grid.height(grid.columns[i], grid.rows[j]);
  return { body, grid, at };
};

test("the drawn blanket never passes through him or the mattress, outlines included, between its vertices too", () => {
  for (const side of sides)
    for (const cover of [0, 0.5, 1]) expect(blanketProblems(BED_RECT, bodyOf(side), { cover }).slice(0, 6), `side ${side}, cover ${cover}`).toEqual([]);
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
  const folded = blanketGrid(BED_RECT, [], { cover: 0 });
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
  const height = blanketSurface(BED_RECT, [], { cover: 0 });
  const middle = (BED_RECT.z0 + BED_RECT.z1) / 2;
  expect(height(BED_RECT.x1 - 0.1, middle) - BED_RECT.top).toBeGreaterThan(0.02);
  expect(blanketSurface(BED_RECT, [], { cover: 1 })(BED_RECT.x1 - 0.1, middle) - BED_RECT.top).toBeLessThan(0.015);
});

test("turned back from the door side, the bed lies bare there and the turned-back part lies doubled beside the fold", () => {
  const aside = 0.6;
  const fold = BED_RECT.z0 + aside;
  const grid = blanketGrid(BED_RECT, [], { cover: 1, aside });
  expect(grid.rows[0]).toBeCloseTo(fold, 9);
  const surface = blanketSurface(BED_RECT, [], { cover: 1, aside });
  const x = BED_RECT.x1 - 0.3;
  expect(surface(x, fold + 0.1) - surface(x, fold + aside + 0.1)).toBeCloseTo(BLANKET.ply, 6);
  expect(surface(x, BED_RECT.z1 - 0.05) - BED_RECT.top).toBeLessThan(0.015);
  expect(blanketGrid(BED_RECT, [], { cover: 1 }).rows).toEqual(blanketGrid(BED_RECT, [], { cover: 1, aside: 0 }).rows);
});

test("turned back from the door side, it drapes over whatever of him lies under it and never passes through him", () => {
  for (const side of sides)
    for (const aside of [0.3, 0.6]) expect(blanketProblems(BED_RECT, bodyOf(side), { cover: 1, aside }).slice(0, 6), `side ${side}, aside ${aside}`).toEqual([]);
});

test("the blanket's head hem can stay where it was laid, whatever pose he is in", () => {
  const laid = blanketEdge(BED_RECT, bodyOf(-1), 1);
  const grid = blanketGrid(BED_RECT, [], { cover: 1, aside: 0, edge: laid });
  expect(grid.columns[0]).toBeCloseTo(laid, 9);
});

test("standing beside the bed's foot he lifts no part of the blanket", () => {
  const standing = allColliders(RIG, { position: [BED_RECT.x1 + 0.63, BED_RECT.top - 0.55, BED_RECT.z1 - 0.01], rotationY: Math.PI / 2, pose: TIBIK_REST });
  const laid = blanketEdge(BED_RECT, bodyOf(-1), 1);
  for (const lie of [{ cover: 1, edge: laid }, { cover: 1, aside: 0.82, edge: laid }]) {
    const alone = blanketGrid(BED_RECT, [], lie);
    const beside = blanketGrid(BED_RECT, standing, lie);
    for (const x of alone.columns) for (const z of alone.rows) expect(beside.height(x, z), `${x.toFixed(2)},${z.toFixed(2)}`).toBeCloseTo(alone.height(x, z), 9);
  }
});
