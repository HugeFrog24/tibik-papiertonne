import { blendArm } from "../physics/holds";
import type { Vec3 } from "../toon/primitives";
import { lerp } from "./scalar";
import type { ArmPose, LegPose, Pose } from "./skeleton";

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

const layerVec3 = (base: Vec3, to: Vec3, from: Vec3): Vec3 => [base[0] + to[0] - from[0], base[1] + to[1] - from[1], base[2] + to[2] - from[2]];

const layerLeg = (base: LegPose, to: LegPose, from: LegPose): LegPose => ({
  hip: layerVec3(base.hip, to.hip, from.hip),
  knee: base.knee + to.knee - from.knee,
  ankle: layerVec3(base.ankle, to.ankle, from.ankle),
});

const layerArm = (base: ArmPose, to: ArmPose, from: ArmPose): ArmPose => ({
  raise: base.raise + to.raise - from.raise,
  out: base.out + to.out - from.out,
  elbow: base.elbow + to.elbow - from.elbow,
  inward: base.inward + to.inward - from.inward,
});

export const layerPose = <P extends Pose>(base: P, to: P, from: P): P => ({
  ...to,
  ...(Object.fromEntries(SCALARS.map((k) => [k, base[k] + to[k] - from[k]])) as Pick<Pose, (typeof SCALARS)[number]>),
  leftArm: layerArm(base.leftArm, to.leftArm, from.leftArm),
  rightArm: layerArm(base.rightArm, to.rightArm, from.rightArm),
  leftLeg: layerLeg(base.leftLeg, to.leftLeg, from.leftLeg),
  rightLeg: layerLeg(base.rightLeg, to.rightLeg, from.rightLeg),
});
