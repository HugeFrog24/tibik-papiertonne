import { kf } from "../characters/animate";
import type { ArmPose } from "../characters/skeleton";
import { blendArm } from "../physics/holds";
import { ARM_REST, ARM_TUCK, ARM_WALK } from "./rig";

type Leg = readonly [number, number];

export const WALK_SWING = 0.35;
export const WALK_SWAY = 0.05;

const legKeys = ([a, b]: Leg) => [a, a + 0.3, b - 0.5, b];

export const walkingOn = (t: number, legs: readonly Leg[]) => legs.map((leg) => kf(t, legKeys(leg), [0, 1, 1, 0]));

export const walkArmKeys = (legs: readonly Leg[]) => ({
  times: legs.flatMap(legKeys),
  poses: legs.flatMap(() => [ARM_REST, ARM_WALK, ARM_WALK, ARM_REST]),
});

export const swungArms = (arms: ArmPose, swing: number, tucked: number) => ({
  leftArm: blendArm({ ...arms, raise: arms.raise - swing }, ARM_TUCK, tucked),
  rightArm: blendArm({ ...arms, raise: arms.raise + swing }, ARM_TUCK, tucked),
});
