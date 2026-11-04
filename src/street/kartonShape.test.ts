import { Matrix4 } from "three";
import { expect, test } from "vitest";
import { contacts, obbCorners, type Obb } from "../physics/collision";
import {
  FOUND_KARTON_SIZE,
  PANEL,
  flapSplay,
  kartonFlapSolids,
  kartonFlaps,
  SHIPPING_LABELS,
  kartonPanels,
} from "./kartonShape";

const [w, h, d] = FOUND_KARTON_SIZE;
const flapsAt = (closed: number) =>
  kartonFlapSolids(FOUND_KARTON_SIZE, 1, closed, new Matrix4());

const highest = (o: Obb) => Math.max(...obbCorners(o).map((p) => p.y));
const lowest = (o: Obb) => Math.min(...obbCorners(o).map((p) => p.y));

const flapsThroughEachOther = (flapsAt: (closed: number) => Obb[]) => {
  const problems: string[] = [];
  for (let closed = 0; closed <= 1 + 1e-9; closed += 0.02) {
    const flaps = flapsAt(closed);
    flaps.forEach((flap, i) => {
      for (const c of contacts([flap], flaps.slice(i + 1)))
        if (c.depth > 1e-4)
          problems.push(`${closed.toFixed(2)}: ${c.a} in ${c.b}`);
    });
  }
  return problems.slice(0, 5);
};

test("a closed carton's flaps lie flat over the top, the long ones on the short ones", () => {
  const flaps = flapsAt(1);
  for (const flap of flaps) {
    expect(lowest(flap)).toBeGreaterThan(h / 2 - PANEL);
    expect(highest(flap)).toBeLessThan(h / 2 + 3 * PANEL);
  }
  const short = [flaps[1], flaps[3]];
  const long = [flaps[0], flaps[2]];
  for (const l of long)
    for (const s of short)
      expect(lowest(l)).toBeGreaterThanOrEqual(highest(s) - 1e-6);
});

test("the long flaps meet in the middle: no overlap, at most one cardboard thickness apart", () => {
  const [a, , b] = flapsAt(1);
  const tip = (o: Obb) => obbCorners(o).map((p) => p.z);
  const gap = Math.min(...tip(b)) - Math.max(...tip(a));
  expect(gap).toBeGreaterThanOrEqual(-1e-9);
  expect(gap).toBeLessThanOrEqual(PANEL + 1e-9);
  expect(w).toBeGreaterThan(d);
});

test("no flap passes through another while the carton closes", () => {
  expect(flapsThroughEachOther(flapsAt)).toEqual([]);
});

test("an open carton keeps its flaps splayed as before", () => {
  for (const open of [0, 0.5, 1])
    for (const flap of kartonFlaps(FOUND_KARTON_SIZE, open))
      expect(flap.fold).toBeCloseTo(-flapSplay(open), 12);
});

test("the long flaps can close one after the other, still passing through nothing", () => {
  const order = [
    [0.5, 0.75],
    [0, 0.5],
    [0.75, 1],
    [0, 0.5],
  ] as const;
  const half = kartonFlaps(FOUND_KARTON_SIZE, 1, 0.75, order);
  expect(half[0].fold).toBeCloseTo(Math.PI / 2, 9);
  expect(half[2].fold).toBeCloseTo(-flapSplay(1), 9);
  expect(
    flapsThroughEachOther((closed) =>
      kartonFlapSolids(FOUND_KARTON_SIZE, 1, closed, new Matrix4(), 0, order),
    ),
  ).toEqual([]);
});

test("a reused box gets its new A6 address label right over the old blacked-out one, so none of the old label shows, and it fits on the panel", () => {
  expect(SHIPPING_LABELS.fresh.size).toEqual([0.148, 0.105]);
  const [ow, oh] = SHIPPING_LABELS.old.size;
  const [fw, fh] = SHIPPING_LABELS.fresh.size;
  expect(fw).toBeGreaterThan(ow);
  expect(fh).toBeGreaterThan(oh);
  expect(SHIPPING_LABELS.fresh.lift).toBeGreaterThan(SHIPPING_LABELS.old.lift);
  const panel = kartonPanels(FOUND_KARTON_SIZE, 0)[0];
  const centre = SHIPPING_LABELS.along * panel.length;
  expect(Math.abs(centre) + fw / 2).toBeLessThan(panel.length / 2);
  expect(fh).toBeLessThan(FOUND_KARTON_SIZE[1]);
});
