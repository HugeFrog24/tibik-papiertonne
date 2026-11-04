import { Matrix4, Vector3 } from "three";
import { expect, test } from "vitest";
import { armColliders } from "../characters/skeleton";
import { KAREN_REST, KAREN_SKELETON } from "../Karen/rig";
import { frame, obb } from "./collision";
import { workArm, type Hold } from "./holds";

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
    pose: { raise: 0.8, out: 0.3, elbow: 0.8, inward: 0.3 },
    exact: true,
  };
  const solved = workArm(karen, "leftArm", 0.5, [], [hold]);
  const spheres = armColliders(KAREN_SKELETON, solved, "leftArm");
  expect(spheres[spheres.length - 1].center.distanceTo(point)).toBeLessThan(
    0.004,
  );
});
