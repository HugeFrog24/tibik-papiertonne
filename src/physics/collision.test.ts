import { Box3, Euler, Matrix4, Vector3 } from "three";
import { seeded } from "./seeded";
import { describe, expect, test } from "vitest";
import {
  capsule,
  collide,
  contacts,
  frame,
  halfSpace,
  obb,
  obbCorners,
  smallestClearing,
  sphere,
} from "./collision";

const box = (
  position: [number, number, number],
  size: [number, number, number],
  rotation?: Euler,
) => obb("box", frame(new Matrix4(), position, rotation), size);

describe("sphere vs box", () => {
  test("touching from outside is not a collision", () => {
    expect(
      collide(
        sphere("s", new Vector3(1.5, 0, 0), 0.5),
        box([0, 0, 0], [2, 2, 2]),
      ),
    ).toBeNull();
  });

  test("overlap depth and push direction", () => {
    const c = collide(
      sphere("s", new Vector3(1.4, 0, 0), 0.5),
      box([0, 0, 0], [2, 2, 2]),
    );
    expect(c?.depth).toBeCloseTo(0.1);
    expect(c?.normal.x).toBeCloseTo(1);
  });

  test("centre inside the box pushes out through the nearest face", () => {
    const c = collide(
      sphere("s", new Vector3(0, 0.9, 0), 0.2),
      box([0, 0, 0], [2, 2, 2]),
    );
    expect(c?.depth).toBeCloseTo(0.3);
    expect(c?.normal.y).toBeCloseTo(1);
  });

  test("respects box rotation", () => {
    const diamond = box([0, 0, 0], [1, 1, 1], new Euler(0, 0, Math.PI / 4));
    expect(
      collide(sphere("s", new Vector3(0.75, 0, 0), 0.05), diamond)?.depth,
    ).toBeCloseTo(0.0071, 3);
    expect(
      collide(sphere("s", new Vector3(0.8, 0, 0), 0.05), diamond),
    ).toBeNull();
  });
});

describe("half-spaces", () => {
  const ground = halfSpace("ground", new Vector3(0, 1, 0), 0);

  test("sphere sinking into the ground", () => {
    expect(
      collide(sphere("s", new Vector3(0, 0.1, 0), 0.15), ground)?.depth,
    ).toBeCloseTo(0.05);
    expect(
      collide(sphere("s", new Vector3(0, 0.2, 0), 0.15), ground),
    ).toBeNull();
  });

  test("tilted box against the ground", () => {
    const tilted = box([0, 0.6, 0], [1, 1, 1], new Euler(0, 0, Math.PI / 4));
    expect(collide(tilted, ground)?.depth).toBeCloseTo(Math.SQRT1_2 - 0.6);
  });
});

describe("box vs box", () => {
  test("separated, overlapping and crossing thin walls", () => {
    expect(
      collide(box([0, 0, 0], [1, 1, 1]), box([1.1, 0, 0], [1, 1, 1])),
    ).toBeNull();
    expect(
      collide(box([0, 0, 0], [1, 1, 1]), box([0.9, 0, 0], [1, 1, 1]))?.depth,
    ).toBeCloseTo(0.1);
    expect(
      collide(box([0, 0, 0], [1, 1, 1]), box([0, 0, 0], [0.02, 3, 3])),
    ).not.toBeNull();
  });
});

test("capsules are covered by overlapping spheres", () => {
  const spheres = capsule(
    "arm",
    new Vector3(0, 0, 0),
    new Vector3(0, -0.4, 0),
    0.06,
  );
  for (let i = 1; i < spheres.length; i++) {
    expect(
      spheres[i - 1].center.distanceTo(spheres[i].center),
    ).toBeLessThanOrEqual(0.03 + 1e-9);
  }
});

test("smallestClearing finds the first collision-free amount", () => {
  expect(smallestClearing((a) => 0.37 - a, 1)).toBeCloseTo(0.37, 3);
  expect(smallestClearing(() => 0, 1)).toBe(0);
  expect(smallestClearing(() => 1, 0.5)).toBe(0.5);
});

test("contacts() finds exactly the contacts of testing every shape against every solid", () => {
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const spread = (scale: number) =>
    new Vector3(
      (random() - 0.5) * scale,
      (random() - 0.5) * scale,
      (random() - 0.5) * scale,
    );
  const tilt = () => new Euler(random() * 3, random() * 3, random() * 3);
  for (let round = 0; round < 200; round++) {
    const shapes = Array.from(
      { length: 2 + Math.floor(random() * 30) },
      (_, i) =>
        i % 5 === 4
          ? obb(
              `shape ${i}`,
              frame(new Matrix4(), spread(1.2).toArray(), tilt()),
              [
                0.1 + random() * 0.4,
                0.1 + random() * 0.4,
                0.1 + random() * 0.4,
              ],
            )
          : sphere(`shape ${i}`, spread(1.2), 0.02 + random() * 0.25),
    );
    const solids = Array.from(
      { length: 1 + Math.floor(random() * 25) },
      (_, i) =>
        i % 7 === 6
          ? halfSpace(`floor ${i}`, new Vector3(0, 1, 0), -0.4 - random())
          : i % 3 === 2
            ? sphere(`ball ${i}`, spread(4), 0.05 + random() * 0.5)
            : obb(
                `solid ${i}`,
                frame(new Matrix4(), spread(4).toArray(), tilt()),
                [0.1 + random(), 0.1 + random(), 0.1 + random()],
              ),
    );
    const everyPair = shapes.flatMap((shape) =>
      solids.map((solid) => collide(shape, solid)).filter((c) => c !== null),
    );
    expect(contacts(shapes, solids)).toEqual(everyPair);
  }
});

test("obbCorners gives the eight corners of a turned box", () => {
  const box = obb(
    "box",
    frame(new Matrix4(), [1, 2, 3], new Euler(0, Math.PI / 2, 0)),
    [2, 4, 6],
  );
  const corners = obbCorners(box);
  expect(corners).toHaveLength(8);
  const xs = corners
    .map((p) => Math.round(p.x * 1e6) / 1e6)
    .sort((a, b) => a - b);
  const ys = corners
    .map((p) => Math.round(p.y * 1e6) / 1e6)
    .sort((a, b) => a - b);
  expect([xs[0], xs[7]]).toEqual([-2, 4]);
  expect([ys[0], ys[7]]).toEqual([0, 4]);
  for (const p of corners)
    expect(p.clone().sub(box.center).length()).toBeCloseTo(
      Math.sqrt(1 + 4 + 9),
      9,
    );
});

test("a sphere touches a box exactly when the box's nearest point lies within its radius, near the box and far from it", () => {
  const place = new Matrix4()
    .makeRotationFromEuler(new Euler(0.4, 0.9, 0.2))
    .setPosition(1, 2, 3);
  const size = [0.6, 0.3, 1.2] as const;
  const box = obb("box", place, size);
  const local = new Box3(
    new Vector3(-size[0] / 2, -size[1] / 2, -size[2] / 2),
    new Vector3(size[0] / 2, size[1] / 2, size[2] / 2),
  );
  const toLocal = place.clone().invert();
  const next = seeded(7);
  let touching = 0;
  for (let i = 0; i < 4000; i++) {
    const center = new Vector3(
      1 + (next() - 0.5) * 4,
      2 + (next() - 0.5) * 4,
      3 + (next() - 0.5) * 4,
    );
    const radius = 0.02 + next() * 0.6;
    const gap = local.distanceToPoint(center.clone().applyMatrix4(toLocal));
    if (Math.abs(gap - radius) < 1e-9) continue;
    const hit = collide(sphere("s", center, radius), box) !== null;
    expect(hit, `at ${center.toArray().join(",")} r ${radius}`).toBe(gap < radius);
    if (hit) touching++;
  }
  expect(touching).toBeGreaterThan(100);
  expect(touching).toBeLessThan(3800);
});

const originalSphereVsBox = (
  center: Vector3,
  radius: number,
  box: ReturnType<typeof obb>,
) => {
  const d = center.clone().sub(box.center);
  const local = box.axes.map((axis) => d.dot(axis));
  const clamped = local.map((v, i) =>
    Math.max(-box.half[i], Math.min(box.half[i], v)),
  );
  const offset = local.map((v, i) => v - clamped[i]);
  const distance = Math.hypot(...offset);
  if (distance > 0) {
    const depth = radius - distance;
    if (depth <= 0) return null;
    const normal = new Vector3();
    offset.forEach((v, i) => normal.addScaledVector(box.axes[i], v / distance));
    return { depth, normal: normal.toArray() };
  }
  let best = 0;
  for (let i = 1; i < 3; i++)
    if (
      box.half[i] - Math.abs(local[i]) <
      box.half[best] - Math.abs(local[best])
    )
      best = i;
  return {
    depth: radius + box.half[best] - Math.abs(local[best]),
    normal: box.axes[best]
      .clone()
      .multiplyScalar(Math.sign(local[best]) || 1)
      .toArray(),
  };
};

test("near a box's corners, at any scale, the sphere-box test answers exactly as the original allocating version did", () => {
  const next = seeded(11);
  const mismatches: string[] = [];
  for (const scale of [0.01, 1, 1e3, 1e6, 1e7, 1e8])
    for (let i = 0; i < 4000; i++) {
      const place = new Matrix4()
        .makeRotationFromEuler(new Euler(next() * 6, next() * 6, next() * 6))
        .setPosition(
          (next() - 0.5) * scale,
          (next() - 0.5) * scale,
          (next() - 0.5) * scale,
        );
      const size = [0, 0, 0].map(() => (0.1 + next()) * scale) as [
        number,
        number,
        number,
      ];
      const box = obb("box", place, size);
      const signs = [0, 0, 0].map(() => (next() < 0.5 ? -1 : 1));
      const corner = box.center.clone();
      box.axes.forEach((axis, k) =>
        corner.addScaledVector(axis, signs[k] * box.half[k]),
      );
      const out = corner.clone().sub(box.center).normalize();
      const radius = (0.05 + next()) * scale;
      const center = corner
        .clone()
        .addScaledVector(out, radius * (1 - 1e-15 * (next() * 20 - 10)));
      const expected = originalSphereVsBox(center, radius, box);
      const got = collide(sphere("s", center, radius), box);
      const same =
        expected === null
          ? got === null
          : got !== null &&
            got.depth === expected.depth &&
            got.normal.toArray().every((v, k) => v === expected.normal[k]);
      if (!same) mismatches.push(`scale ${scale} #${i}`);
    }
  expect(mismatches.slice(0, 5)).toEqual([]);
});

test("a capsule with no radius is refused instead of looping forever", () => {
  expect(() =>
    capsule("c", new Vector3(0, 0, 0), new Vector3(1, 0, 0), 0),
  ).toThrow();
});
