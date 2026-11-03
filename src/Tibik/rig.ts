import { restLeg } from "../characters/legs";
import type { ArmPose, Pose, Skeleton } from "../characters/skeleton";
import type { Vec3 } from "../toon/primitives";

export type { ArmPose, Side } from "../characters/skeleton";
export type TibikPose = Pose;

const HEAD_CENTER_Y = 0.234;

export const RIG = {
  hipHeight: 0.48,
  neckHeight: 0.7,
  torso: {
    profile: [
      [0, -0.12],
      [0.22, -0.1],
      [0.33, -0.04],
      [0.39, 0.06],
      [0.405, 0.18],
      [0.39, 0.32],
      [0.35, 0.45],
      [0.3, 0.57],
      [0.24, 0.68],
      [0.14, 0.76],
      [0, 0.8],
    ],
    depthScale: 0.8,
  },
  headCenterY: HEAD_CENTER_Y,
  headSize: [0.335, 0.234, 0.279] as Vec3,
  eye: {
    x: 0.155,
    y: HEAD_CENTER_Y + 0.215,
    z: 0.05,
    radius: 0.085,
    iris: { offset: 0.062, radius: 0.052 },
    pupil: { offset: 0.095, radius: 0.033 },
  },
  head: [
    { name: "head", center: [0.12, HEAD_CENTER_Y, 0], radius: 0.215 },
    { name: "head", center: [-0.12, HEAD_CENTER_Y, 0], radius: 0.215 },
    { name: "head", center: [0, HEAD_CENTER_Y - 0.01, 0.06], radius: 0.22 },
    { name: "head", center: [0, HEAD_CENTER_Y, -0.06], radius: 0.22 },
    { name: "left eye", center: [0.155, HEAD_CENTER_Y + 0.215, 0.05], radius: 0.085 },
    { name: "right eye", center: [-0.155, HEAD_CENTER_Y + 0.215, 0.05], radius: 0.085 },
    { name: "left iris", center: [0.16, HEAD_CENTER_Y + 0.2, 0.125], radius: 0.06 },
    { name: "right iris", center: [-0.16, HEAD_CENTER_Y + 0.2, 0.125], radius: 0.06 },
  ],
  shoulder: { x: 0.3, y: 0.58 },
  upperArm: { length: 0.22, radius: 0.065 },
  forearm: { length: 0.19, radius: 0.06 },
  hand: { offset: 0.24, size: [0.075, 0.08, 0.065] as Vec3 },
  hipX: 0.17,
  hipSplay: 0,
  thigh: { length: 0.15, radius: 0.115 },
  shin: { length: 0.15, radius: 0.1 },
  foot: { offset: [0, -0.09, 0.06] as Vec3, size: [0.12, 0.07, 0.17] as Vec3 },
} as const satisfies Skeleton & {
  readonly headCenterY: number;
  readonly headSize: Vec3;
  readonly eye: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly radius: number;
    readonly iris: { readonly offset: number; readonly radius: number };
    readonly pupil: { readonly offset: number; readonly radius: number };
  };
};

export const ARM_REST: ArmPose = { raise: 0.8, out: 0.8, elbow: 1.5, inward: 1.2 };

export const ARM_WALK: ArmPose = { raise: 0.1, out: 0.95, elbow: 0.35, inward: 0 };

export const TIBIK_REST: Pose = {
  bob: 0,
  lean: 0,
  twist: 0,
  sway: 0,
  headPitch: 0,
  headYaw: 0,
  headRoll: 0,
  gazeYaw: 0,
  gazePitch: 0,
  blink: 0,
  leftArm: ARM_REST,
  rightArm: ARM_REST,
  leftLeg: restLeg(RIG, 1),
  rightLeg: restLeg(RIG, -1),
};
