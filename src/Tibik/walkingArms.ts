import { armKf, kf } from "../characters/animate";
import type { ArmPose } from "../characters/skeleton";
import { blendArm } from "../physics/armDescent";
import { ARM_REST, ARM_TUCK, ARM_WALK } from "./rig";

type Leg = readonly [number, number];

export const WALK_SWING = 0.35;
export const WALK_SWAY = 0.05;

const legKeys = ([a, b]: Leg) => [a, a + 0.3, b - 0.5, b];

export const walkingOn = (t: number, legs: readonly Leg[]) => legs.map((leg) => kf(t, legKeys(leg), [0, 1, 1, 0]));

export const walkArmKeys = (legs: readonly Leg[], held: readonly Leg[] = []) => ({
  times: legs.flatMap(legKeys),
  poses: legs.flatMap((leg) => (held.includes(leg) ? [ARM_REST, ARM_REST, ARM_REST, ARM_REST] : [ARM_REST, ARM_WALK, ARM_WALK, ARM_REST])),
});

export const swungArm = (arm: ArmPose, swing: number, tucked: number) => blendArm({ ...arm, raise: arm.raise + swing }, ARM_TUCK, tucked);

export const swungArms = (arms: ArmPose, swing: number, tucked: number) => ({
  leftArm: swungArm(arms, -swing, tucked),
  rightArm: swungArm(arms, swing, tucked),
});

export const walkingPose = (t: number, legs: readonly Leg[], step: number, tucked = 0) => {
  const walking = Math.max(...walkingOn(t, legs));
  const keys = walkArmKeys(legs);
  const arms = armKf(t, keys.times, keys.poses);
  return {
    sway: step * WALK_SWAY * walking * (1 - tucked),
    ...swungArms(arms, WALK_SWING * walking * step * (1 - tucked), tucked),
  };
};
