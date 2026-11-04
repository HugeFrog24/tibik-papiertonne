import { Vector3 } from "three";
import { expect, test } from "vitest";
import { clumpGeometry } from "./clumpShape";
import { faces } from "../toon/geometryChecks";

const vertices = (rootSign: 1 | -1) => {
  const position = clumpGeometry(rootSign).getAttribute("position");
  return Array.from({ length: position.count }, (_, i) =>
    new Vector3().fromBufferAttribute(position, i),
  );
};

test("a clump stays inside its lock's ellipsoid, so the hair physics still bounds it", () => {
  for (const side of [1, -1] as const)
    for (const v of vertices(side))
      expect(v.length()).toBeLessThanOrEqual(1 + 1e-9);
});

test("a clump is thick at its root and ends in a point at its tip", () => {
  for (const side of [1, -1] as const) {
    const vs = vertices(side);
    const ringAt = (y: number) =>
      Math.max(
        ...vs
          .filter((v) => Math.abs(v.y - y) < 0.06)
          .map((v) => Math.hypot(v.x, v.z)),
      );
    const tip = vs.reduce((best, v) => (side * v.y < side * best.y ? v : best));
    const nearTip = vs.filter((v) => v.distanceTo(tip) < 0.05);
    expect(
      Math.max(...nearTip.map((v) => Math.hypot(v.x, v.z - tip.z))),
    ).toBeLessThan(0.06);
    expect(ringAt(0)).toBeGreaterThan(0.4);
  }
});

test("the root end points the right way: up the lock for both orientations", () => {
  for (const side of [1, -1] as const) {
    const vs = vertices(side);
    const top = Math.max(...vs.map((v) => side * v.y));
    const fattest = vs.reduce((best, v) =>
      Math.hypot(v.x, v.z) > Math.hypot(best.x, best.z) ? v : best,
    );
    expect(side * fattest.y).toBeGreaterThan(0);
    expect(top).toBeGreaterThan(0.9);
  }
});

test("every face points outward, so the toon fill is drawn and the ink hull stays behind it", () => {
  for (const side of [1, -1] as const) {
    const inward = faces(clumpGeometry(side)).filter(({ a, b, c, normal }) => {
      const centroid = a.clone().add(b).add(c).divideScalar(3);
      const axis = new Vector3(0, centroid.y, 0);
      return (
        normal.dot(centroid.clone().sub(axis)) < 0 &&
        Math.abs(centroid.x) + Math.abs(centroid.z) > 0.02
      );
    });
    expect(inward.length).toBe(0);
  }
});
