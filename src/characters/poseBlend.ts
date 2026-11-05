import { blendArm } from "../physics/holds";
import type { Vec3 } from "../toon/primitives";
import { lerp } from "./scalar";
import type { LegPose, Pose } from "./skeleton";

const blendVec3 = (a: Vec3, b: Vec3, w: number): Vec3 => [lerp(a[0], b[0], w), lerp(a[1], b[1], w), lerp(a[2], b[2], w)];

const blendLeg = (a: LegPose, b: LegPose, w: number): LegPose => ({
  hip: blendVec3(a.hip, b.hip, w),
  knee: lerp(a.knee, b.knee, w),
  ankle: blendVec3(a.ankle, b.ankle, w),
});

const SCALARS = ["bob", "lean", "twist", "sway", "headPitch", "headYaw", "headRoll", "gazeYaw", "gazePitch", "blink"] as const;

export const blendPose = (a: Pose, b: Pose, w: number): Pose => {
  if (w <= 0) return a;
  if (w >= 1) return b;
  const scalars = Object.fromEntries(SCALARS.map((k) => [k, lerp(a[k], b[k], w)])) as Pick<Pose, (typeof SCALARS)[number]>;
  return {
    ...a,
    ...scalars,
    leftArm: blendArm(a.leftArm, b.leftArm, w),
    rightArm: blendArm(a.rightArm, b.rightArm, w),
    leftLeg: blendLeg(a.leftLeg, b.leftLeg, w),
    rightLeg: blendLeg(a.rightLeg, b.rightLeg, w),
  };
};
