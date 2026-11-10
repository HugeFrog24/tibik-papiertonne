import { expect, test } from "vitest";
import { KAREN_ARM_HIPS, KAREN_ARM_POINT, KAREN_REST, KAREN_SKELETON, karenRunArm } from "../Karen/rig";
import { armIntoTorso, type ArmPose } from "./skeleton";
import { blendArm, throughArm } from "../physics/armDescent";
import { bendAround } from "./gesture";

const RESTING = 0.002;
const depth = (arm: ArmPose) => armIntoTorso(KAREN_SKELETON, { ...KAREN_REST, rightArm: arm }, "rightArm");
const deepestAlong = (path: (w: number) => ArmPose) => Math.max(...Array.from({ length: 41 }, (_, i) => depth(path(i / 40))));
const aroundHer = bendAround(KAREN_SKELETON, KAREN_REST, "rightArm");

test.each([
  ["from her hips to pointing", KAREN_ARM_HIPS, { ...KAREN_ARM_POINT, raise: 1.05 }],
  ["from a running swing to pointing", karenRunArm(0), KAREN_ARM_POINT],
  ["from a running swing to her hips", karenRunArm(0), KAREN_ARM_HIPS],
])("a gesture whose straight path would cut through her bust bends around it: %s", (_, from, to) => {
  expect(deepestAlong((w) => blendArm(from, to, w))).toBeGreaterThan(RESTING);
  const via = aroundHer(from, to);
  expect(deepestAlong((w) => throughArm(from, via, to, w))).toBeLessThanOrEqual(RESTING);
});

test("a gesture already clear of her body keeps its straight path", () => {
  const [from, to] = [KAREN_ARM_POINT, { ...KAREN_ARM_POINT, raise: 1.05 }];
  expect(aroundHer(from, to)).toEqual(blendArm(from, to, 0.5));
});
