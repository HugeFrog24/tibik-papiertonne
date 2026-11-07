import { Matrix4, Quaternion, Vector3 } from "three";
import { expect, test } from "vitest";
import { armColliders } from "../characters/skeleton";
import { KAREN_REST, KAREN_SKELETON } from "../Karen/rig";
import { frame, obb } from "./collision";
import { followTheHand, holdWindow, workArm, type Hold } from "./holds";

const karen = {
  position: [0, 0, 0] as [number, number, number],
  rotationY: 0,
  pose: KAREN_REST,
  skeleton: KAREN_SKELETON,
};

test("an exact hold puts the centre of the hand on its point, not just anywhere on the thing", () => {
  const point = new Vector3(0.45, 0.9, 0.4);
  const hold: Hold = {
    name: "a grip",
    arm: "leftArm",
    reach: 0,
    grip: 0.1,
    release: 1,
    done: 1.1,
    target: () =>
      obb(
        "thing",
        frame(new Matrix4(), [0.45, 0.9, 0.52]),
        [0.05, 0.12, 0.016],
      ),
    near: () => point,
    pose: { raise: 0.8, out: 0.3, elbow: 0.8, inward: 0.6 },
    exact: true,
  };
  const solved = workArm(karen, "leftArm", 0.5, [], [hold]);
  const spheres = armColliders(KAREN_SKELETON, solved, "leftArm");
  expect(spheres[spheres.length - 1].center.distanceTo(point)).toBeLessThan(
    0.004,
  );
});

test("a held prop follows the hand: it moves by the hand's miss, scaled by how firmly it is held", () => {
  const frame = new Matrix4().makeRotationY(0.4).setPosition(1, 2, 3);
  const moved = followTheHand(frame, new Vector3(0.5, 0.5, 0.5), new Vector3(0.4, 0.5, 0.7), 0.5);
  expect(new Vector3().setFromMatrixPosition(moved).toArray().map((v) => +v.toFixed(9))).toEqual([1.05, 2, 2.9]);
  expect(new Quaternion().setFromRotationMatrix(moved).angleTo(new Quaternion().setFromRotationMatrix(frame))).toBeCloseTo(0, 6);
  expect(followTheHand(frame, new Vector3(9, 9, 9), new Vector3(0, 0, 0), 0)).toEqual(frame);
});

test("handing over from one exact grip to the next, the hand goes straight from the one to the other instead of sagging between them", () => {
  const from = new Vector3(0.45, 0.9, 0.4);
  const to = new Vector3(0.32, 1.05, 0.45);
  const grip = (name: string, point: Vector3, window: readonly [number, number, number, number]): Hold => ({
    name,
    arm: "leftArm",
    ...holdWindow(window),
    target: () => obb(name, frame(new Matrix4(), point.toArray() as [number, number, number]), [0.03, 0.03, 0.03]),
    near: () => point,
    exact: true,
  });
  const holds = [grip("first", from, [0, 0.1, 1, 1.4]), grip("second", to, [1, 1.4, 3, 3.1])];
  const segment = to.clone().sub(from);
  for (let t = 1; t <= 1.4 + 1e-9; t += 0.05) {
    const spheres = armColliders(KAREN_SKELETON, workArm(karen, "leftArm", t, [], holds), "leftArm");
    const hand = spheres[spheres.length - 1].center;
    const along = Math.min(1, Math.max(0, hand.clone().sub(from).dot(segment) / segment.lengthSq()));
    const off = hand.distanceTo(from.clone().addScaledVector(segment, along));
    expect(off, t.toFixed(2)).toBeLessThan(0.005);
  }
});
