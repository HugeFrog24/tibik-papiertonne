import { Vector3 } from "three";
import { expect, test } from "vitest";
import { KEY_RING, keyParts } from "./keyRingShape";

const circlePoints = (
  centre: Vector3,
  u: Vector3,
  v: Vector3,
  radius: number,
  n = 96,
) =>
  Array.from({ length: n }, (_, k) => {
    const a = (2 * Math.PI * k) / n;
    return centre
      .clone()
      .addScaledVector(u, radius * Math.cos(a))
      .addScaledVector(v, radius * Math.sin(a));
  });

const boxPoints = (b: ReturnType<typeof keyParts>[number]["blade"], n = 8) =>
  Array.from({ length: (n + 1) ** 3 }, (_, k) => {
    const f = [k % (n + 1), Math.floor(k / (n + 1)) % (n + 1), Math.floor(k / (n + 1) ** 2)].map(
      (i) => i / n - 0.5,
    );
    return b.centre
      .clone()
      .addScaledVector(b.axes[0], f[0] * b.size[0])
      .addScaledVector(b.axes[1], f[1] * b.size[1])
      .addScaledVector(b.axes[2], f[2] * b.size[2]);
  });

const gap = (a: readonly Vector3[], ra: number, b: readonly Vector3[], rb: number) => {
  let least = Infinity;
  for (const p of a) for (const q of b) least = Math.min(least, p.distanceTo(q));
  return least - ra - rb;
};

const RING = circlePoints(
  new Vector3(),
  new Vector3(1, 0, 0),
  new Vector3(0, 1, 0),
  KEY_RING.ring.radius,
);

test("the ring runs through each key's bow without touching it, outlines included", () => {
  for (const key of keyParts())
    expect(
      gap(
        RING,
        KEY_RING.ring.tube + KEY_RING.ink,
        circlePoints(key.bow.centre, key.bow.u, key.bow.v, key.bow.radius),
        key.bow.tube + KEY_RING.ink,
      ),
      key.name,
    ).toBeGreaterThan(0);
});

test("the two keys hang side by side without touching each other, outlines included", () => {
  const [a, b] = keyParts();
  const bowOf = (k: typeof a) => circlePoints(k.bow.centre, k.bow.u, k.bow.v, k.bow.radius);
  expect(gap(bowOf(a), a.bow.tube + KEY_RING.ink, bowOf(b), b.bow.tube + KEY_RING.ink)).toBeGreaterThan(0);
  expect(gap(boxPoints(a.blade), KEY_RING.ink, boxPoints(b.blade), KEY_RING.ink)).toBeGreaterThan(0);
  expect(gap(bowOf(a), a.bow.tube + KEY_RING.ink, boxPoints(b.blade), KEY_RING.ink)).toBeGreaterThan(0);
  expect(gap(bowOf(b), b.bow.tube + KEY_RING.ink, boxPoints(a.blade), KEY_RING.ink)).toBeGreaterThan(0);
});

test("each blade grows out of its own bow and hangs below the ring", () => {
  for (const key of keyParts()) {
    const root = key.blade.centre.clone().addScaledVector(key.blade.axes[0], -key.blade.size[0] / 2);
    expect(root.distanceTo(key.bow.centre)).toBeLessThan(key.bow.radius + key.bow.tube);
    expect(key.tip.y).toBeLessThan(-KEY_RING.ring.radius);
  }
  expect(keyParts().map((k) => k.name)).toEqual(["mailbox", "house"]);
});
