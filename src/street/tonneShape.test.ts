import { Vector3 } from "three";
import { expect, test } from "vitest";
import type { Obb } from "../physics/collision";
import { TONNE, tonneColliders, tonneLidParts } from "./tonneShape";

const AT = [0, 0, 0] as [number, number, number];

const corners = (box: Obb) =>
  [-1, 1].flatMap((u) =>
    [-1, 1].flatMap((v) =>
      [-1, 1].map((w) =>
        box.center
          .clone()
          .addScaledVector(box.axes[0], u * box.half[0])
          .addScaledVector(box.axes[1], v * box.half[1])
          .addScaledVector(box.axes[2], w * box.half[2]),
      ),
    ),
  );

const extent = (boxes: readonly Obb[], axis: "x" | "y" | "z") => {
  const values = boxes.flatMap(corners).map((p: Vector3) => p[axis]);
  return [Math.min(...values), Math.max(...values)] as const;
};

const named = (boxes: readonly Obb[], pattern: RegExp) => boxes.filter((b) => pattern.test(b.name));

const STANDARD_240 = { height: 1.1, width: 0.58, depth: 0.74 };

test("a 240 l Tonne after DIN EN 840: 1.10 m to the top of its shut lid, 0.58 m wide and 0.74 m deep", () => {
  const [, lidTop] = extent(named(tonneLidParts("Tonne", AT, 0), /lid$/), "y");
  expect(lidTop).toBeCloseTo(STANDARD_240.height, 2);
  expect(TONNE.width).toBeCloseTo(STANDARD_240.width, 3);
  expect(TONNE.depth).toBeCloseTo(STANDARD_240.depth, 3);
});

test("the lid has two grips standing on its top at its front left and front right corners, none on its front edge", () => {
  const parts = tonneLidParts("Tonne", AT, 0);
  const lid = named(parts, /lid$/);
  const grips = named(parts, /lid grip/);
  expect(grips).toHaveLength(2);
  expect(named(parts, /handle/)).toHaveLength(0);
  const [, lidTop] = extent(lid, "y");
  const [lidLeft, lidRight] = extent(lid, "x");
  const [, lidFront] = extent(lid, "z");
  const sides = grips.map((grip) => {
    const [bottom] = extent([grip], "y");
    const [left, right] = extent([grip], "x");
    const [, front] = extent([grip], "z");
    expect(bottom).toBeCloseTo(lidTop, 3);
    expect(lidFront - front).toBeGreaterThan(0.01);
    expect(lidFront - front).toBeLessThan(0.1);
    expect(Math.min(left - lidLeft, lidRight - right)).toBeLessThan(0.1);
    return Math.sign(grip.center.x);
  });
  expect(sides.sort()).toEqual([-1, 1]);
});

test("a transport bar runs across the back top, standing off the back wall by a hand's gap", () => {
  const bins = tonneColliders("Tonne", AT, 0);
  const [bar] = named(bins, /back bar$/);
  expect(bar).toBeDefined();
  const [barBack, barFront] = extent([bar], "z");
  const [barLeft, barRight] = extent([bar], "x");
  const [barBottom, barTop] = extent([bar], "y");
  expect(barRight - barLeft).toBeGreaterThan(0.4);
  expect(-TONNE.depth / 2 - barFront).toBeGreaterThanOrEqual(0.03);
  expect(barBack).toBeGreaterThan(-TONNE.depth / 2 - 0.12);
  expect(TONNE.height - barTop).toBeLessThan(0.1);
  expect(barBottom).toBeGreaterThan(TONNE.height - 0.15);
  expect(named(bins, /back bar post/)).toHaveLength(2);
});
