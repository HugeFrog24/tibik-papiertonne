import { Matrix4, Vector3 } from "three";
import { expect, test } from "vitest";
import { blendThrough } from "./orient";

test("a half turn blended through a quarter-turned midway frame always turns the same way, however little the ends wobble", () => {
  const upright = new Matrix4();
  const midway = new Matrix4().makeRotationX(Math.PI / 2).setPosition(0, 0.5, 0);
  for (const wobble of [-0.002, 0, 0.002]) {
    const over = new Matrix4().makeRotationX(Math.PI + wobble).setPosition(0, 1, 0);
    const top = (k: number) => new Vector3().setFromMatrixColumn(blendThrough(upright, midway, over, k), 1);
    expect(top(0.25).z, String(wobble)).toBeGreaterThan(0.6);
    expect(top(0.5).z, String(wobble)).toBeCloseTo(1, 9);
    expect(top(0.75).z, String(wobble)).toBeGreaterThan(0.6);
    expect(new Vector3().setFromMatrixPosition(blendThrough(upright, midway, over, 0.75)).y, String(wobble)).toBeCloseTo(0.75, 9);
  }
  expect(blendThrough(upright, midway, new Matrix4(), 0)).toBe(upright);
});
