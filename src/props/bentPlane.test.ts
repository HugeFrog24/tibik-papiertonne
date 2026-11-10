import { Vector3 } from "three";
import { expect, test } from "vitest";
import { bentPlane } from "./bentPlane";

const lift = (x: number, y: number) => 0.001 + 0.01 * x * y;

test("a bent plane spans its size from its corner, each point lifted by the bend at its place", () => {
  const g = bentPlane([0.2, 0.1], [4, 2], lift);
  const p = g.getAttribute("position");
  expect(p.count).toBe(5 * 3);
  const xs = Array.from({ length: p.count }, (_, i) => p.getX(i));
  const ys = Array.from({ length: p.count }, (_, i) => p.getY(i));
  for (const [got, want] of [[Math.min(...xs), 0], [Math.max(...xs), 0.2], [Math.min(...ys), 0], [Math.max(...ys), 0.1]])
    expect(got).toBeCloseTo(want, 7);
  for (let i = 0; i < p.count; i++) expect(p.getZ(i)).toBeCloseTo(lift(p.getX(i), p.getY(i)), 9);
});

test("seen from behind, every face and normal of a bent plane turns the other way", () => {
  const flat = () => 0;
  for (const back of [false, true]) {
    const g = bentPlane([0.2, 0.1], [4, 2], flat, back);
    const sign = back ? -1 : 1;
    const normals = g.getAttribute("normal");
    for (let i = 0; i < normals.count; i++) expect(normals.getZ(i) * sign).toBeGreaterThan(0.99);
    const index = g.getIndex()!;
    const position = g.getAttribute("position");
    const at = (k: number) => new Vector3().fromBufferAttribute(position, index.getX(k));
    for (let k = 0; k < index.count; k += 3)
      expect(at(k + 1).sub(at(k)).cross(at(k + 2).sub(at(k))).z * sign).toBeGreaterThan(0);
  }
});
