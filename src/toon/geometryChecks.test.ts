import { BoxGeometry } from "three";
import { expect, test } from "vitest";
import { faces } from "./geometryChecks";

test("faces lists every triangle of an indexed geometry with its winding normal", () => {
  const box = faces(new BoxGeometry(1, 1, 1));
  expect(box).toHaveLength(12);
  for (const { a, b, c, normal } of box) {
    const centroid = a.clone().add(b).add(c).divideScalar(3);
    expect(normal.dot(centroid)).toBeGreaterThan(0);
  }
  const flipped = new BoxGeometry(1, 1, 1);
  flipped.setIndex([...flipped.getIndex()!.array].reverse());
  expect(
    faces(flipped).every(
      ({ a, b, c, normal }) => normal.dot(a.clone().add(b).add(c)) < 0,
    ),
  ).toBe(true);
});
