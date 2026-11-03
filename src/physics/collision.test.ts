import { Euler, Matrix4, Vector3 } from "three";
import { describe, expect, test } from "vitest";
import {
  capsule,
  collide,
  frame,
  halfSpace,
  obb,
  smallestClearing,
  sphere,
} from "./collision";

const box = (position: [number, number, number], size: [number, number, number], rotation?: Euler) =>
  obb("box", frame(new Matrix4(), position, rotation), size);

describe("sphere vs box", () => {
  test("touching from outside is not a collision", () => {
    expect(collide(sphere("s", new Vector3(1.5, 0, 0), 0.5), box([0, 0, 0], [2, 2, 2]))).toBeNull();
  });

  test("overlap depth and push direction", () => {
    const c = collide(sphere("s", new Vector3(1.4, 0, 0), 0.5), box([0, 0, 0], [2, 2, 2]));
    expect(c?.depth).toBeCloseTo(0.1);
    expect(c?.normal.x).toBeCloseTo(1);
  });

  test("centre inside the box pushes out through the nearest face", () => {
    const c = collide(sphere("s", new Vector3(0, 0.9, 0), 0.2), box([0, 0, 0], [2, 2, 2]));
    expect(c?.depth).toBeCloseTo(0.3);
    expect(c?.normal.y).toBeCloseTo(1);
  });

  test("respects box rotation", () => {
    const diamond = box([0, 0, 0], [1, 1, 1], new Euler(0, 0, Math.PI / 4));
    expect(collide(sphere("s", new Vector3(0.75, 0, 0), 0.05), diamond)?.depth).toBeCloseTo(0.0071, 3);
    expect(collide(sphere("s", new Vector3(0.8, 0, 0), 0.05), diamond)).toBeNull();
  });
});

describe("half-spaces", () => {
  const ground = halfSpace("ground", new Vector3(0, 1, 0), 0);

  test("sphere sinking into the ground", () => {
    expect(collide(sphere("s", new Vector3(0, 0.1, 0), 0.15), ground)?.depth).toBeCloseTo(0.05);
    expect(collide(sphere("s", new Vector3(0, 0.2, 0), 0.15), ground)).toBeNull();
  });

  test("tilted box against the ground", () => {
    const tilted = box([0, 0.6, 0], [1, 1, 1], new Euler(0, 0, Math.PI / 4));
    expect(collide(tilted, ground)?.depth).toBeCloseTo(Math.SQRT1_2 - 0.6);
  });
});

describe("box vs box", () => {
  test("separated, overlapping and crossing thin walls", () => {
    expect(collide(box([0, 0, 0], [1, 1, 1]), box([1.1, 0, 0], [1, 1, 1]))).toBeNull();
    expect(collide(box([0, 0, 0], [1, 1, 1]), box([0.9, 0, 0], [1, 1, 1]))?.depth).toBeCloseTo(0.1);
    expect(collide(box([0, 0, 0], [1, 1, 1]), box([0, 0, 0], [0.02, 3, 3]))).not.toBeNull();
  });
});

test("capsules are covered by overlapping spheres", () => {
  const spheres = capsule("arm", new Vector3(0, 0, 0), new Vector3(0, -0.4, 0), 0.06);
  for (let i = 1; i < spheres.length; i++) {
    expect(spheres[i - 1].center.distanceTo(spheres[i].center)).toBeLessThanOrEqual(0.03 + 1e-9);
  }
});

test("smallestClearing finds the first collision-free amount", () => {
  expect(smallestClearing((a) => 0.37 - a, 1)).toBeCloseTo(0.37, 3);
  expect(smallestClearing(() => 0, 1)).toBe(0);
  expect(smallestClearing(() => 1, 0.5)).toBe(0.5);
});
