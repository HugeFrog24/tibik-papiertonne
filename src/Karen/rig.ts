import { restLeg } from "../characters/legs";
import type { ArmPose, Pose, Skeleton } from "../characters/skeleton";
import type { Vec3 } from "../toon/primitives";

export type { ArmPose, Pose, Side } from "../characters/skeleton";

const HEAD_CENTER: Vec3 = [0, 0.14, 0.235];
const HEAD_SIZE: Vec3 = [0.155, 0.175, 0.15];

const HIP_HEIGHT = 0.485;
const HIP_SPLAY = 0.7;
const FOOT_RADIUS = 0.09;
const FOOT_DROP = (HIP_HEIGHT - FOOT_RADIUS) / Math.cos(HIP_SPLAY);
const LEG_LENGTH = 0.418;
const BELOW_ANKLE = FOOT_DROP - LEG_LENGTH;
export const INK_WIDTH = 0.014;
const SHOE_HEIGHT = 0.065;

export type HairPiece = {
  readonly name: "cap" | "lobe" | "fringe" | "curtain" | "tuft";
  readonly center: Vec3;
  readonly size: Vec3;
  readonly rotation: Vec3;
};

const fromHead = ([x, y, z]: Vec3): Vec3 => [
  HEAD_CENTER[0] + x,
  HEAD_CENTER[1] + y,
  HEAD_CENTER[2] + z,
];

const JOWL: Vec3 = [0.108, -0.075, 0.03];

const hair = (
  name: HairPiece["name"],
  center: Vec3,
  size: Vec3,
  rotation: Vec3 = [0, 0, 0],
): HairPiece => ({
  name,
  center: fromHead(center),
  size,
  rotation,
});

export const KAREN_SKELETON = {
  hipHeight: HIP_HEIGHT,
  neckHeight: 0.78,
  torso: {
    profile: [
      [0, -0.19],
      [0.26, -0.175],
      [0.38, -0.12],
      [0.42, -0.04],
      [0.435, 0.02],
      [0.47, 0.06],
      [0.51, 0.13],
      [0.53, 0.26],
      [0.53, 0.4],
      [0.515, 0.53],
      [0.47, 0.66],
      [0.39, 0.77],
      [0.27, 0.855],
      [0.13, 0.895],
      [0, 0.905],
    ],
    depthScale: 0.55,
  },
  headCenter: HEAD_CENTER,
  headSize: HEAD_SIZE,
  jowl: { center: fromHead(JOWL), size: [0.072, 0.074, 0.06] as Vec3 },
  head: [
    { name: "head", center: HEAD_CENTER, radius: 0.16 },
    { name: "hair", center: fromHead([0, 0.05, -0.04]), radius: 0.17 },
    { name: "jowl", center: fromHead(JOWL), radius: 0.074 },
    { name: "jowl", center: fromHead([-JOWL[0], JOWL[1], JOWL[2]]), radius: 0.074 },
    { name: "hair", center: fromHead([0.15, -0.09, 0.02]), radius: 0.06 },
    { name: "hair", center: fromHead([-0.15, -0.09, 0.02]), radius: 0.06 },
    { name: "hair", center: fromHead([0.15, -0.2, 0.07]), radius: 0.045 },
    { name: "hair", center: fromHead([-0.15, -0.2, 0.07]), radius: 0.045 },
  ],
  shoulder: { x: 0.5, y: 0.62 },
  upperArm: { length: 0.27, radius: 0.115 },
  forearm: { length: 0.24, radius: 0.1 },
  hand: { offset: 0.31, size: [0.075, 0.085, 0.075] as Vec3 },
  hipX: 0.24,
  hipSplay: HIP_SPLAY,
  thigh: { length: LEG_LENGTH / 2, radius: 0.15 },
  shin: { length: LEG_LENGTH / 2, radius: 0.15 },
  foot: {
    offset: [BELOW_ANKLE * Math.sin(HIP_SPLAY), -BELOW_ANKLE * Math.cos(HIP_SPLAY), 0.1] as Vec3,
    size: [0.085, FOOT_RADIUS, 0.16] as Vec3,
  },
  shoe: {
    size: [0.085, SHOE_HEIGHT, 0.15] as Vec3,
    drop: FOOT_RADIUS - SHOE_HEIGHT - INK_WIDTH,
    yaw: 0.28,
  },
  hair: [
    hair("cap", [0, 0.045, -0.035], [0.172, 0.15, 0.165]),
    hair("lobe", [0.068, 0.158, 0], [0.105, 0.066, 0.13], [0, 0, -0.36]),
    hair("lobe", [-0.068, 0.158, 0], [0.105, 0.066, 0.13], [0, 0, 0.36]),
    hair("fringe", [0, 0.13, 0.065], [0.05, 0.045, 0.07]),
    hair("fringe", [0.058, 0.12, 0.088], [0.08, 0.034, 0.06], [0, 0, 0.45]),
    hair("fringe", [-0.058, 0.12, 0.088], [0.08, 0.034, 0.06], [0, 0, -0.45]),
    hair("curtain", [0.15, -0.12, 0.04], [0.05, 0.165, 0.06], [-0.45, 0, 0.1]),
    hair("curtain", [-0.15, -0.12, 0.04], [0.05, 0.165, 0.06], [-0.45, 0, -0.1]),
    hair("tuft", [0.195, -0.05, -0.02], [0.055, 0.02, 0.035], [0, 0, -0.55]),
    hair("tuft", [-0.05, 0.2, -0.07], [0.05, 0.02, 0.035], [0, 0.4, 0.9]),
  ] as readonly HairPiece[],
} as const satisfies Skeleton & {
  readonly headCenter: Vec3;
  readonly headSize: Vec3;
  readonly jowl: { readonly center: Vec3; readonly size: Vec3 };
  readonly shoe: { readonly size: Vec3; readonly drop: number; readonly yaw: number };
  readonly hair: readonly HairPiece[];
};

export const KAREN_ARM_REST: ArmPose = { raise: 0, out: 0.72, elbow: 0.85, inward: 1.57 };

export const KAREN_ARM_RUN: ArmPose = { raise: 0.15, out: 0.75, elbow: 1.3, inward: 0.3 };
export const KAREN_RUN_SWING = 0.6;
export const karenRunArm = (swing: number): ArmPose => ({
  ...KAREN_ARM_RUN,
  raise: KAREN_ARM_RUN.raise + swing,
});

export const KAREN_ARM_HIPS: ArmPose = { raise: 0, out: 1.1, elbow: 1.5, inward: 1.7 };

export const KAREN_ARM_POINT: ArmPose = { raise: 1.35, out: 0.3, elbow: 0.1, inward: 0 };

export const KAREN_HEAD_LIMITS = { yaw: 0.22, pitchDown: 0.07, pitchUp: 0.3, roll: 0.25 } as const;

export const limitKarenHead = (pose: Pose): Pose => {
  const { yaw, pitchDown, pitchUp, roll } = KAREN_HEAD_LIMITS;
  const nod = Math.max(0, pose.headPitch);
  const used = Math.abs(pose.headYaw) / yaw + Math.abs(pose.headRoll) / roll + nod / pitchDown;
  const scale = used > 1 ? 1 / used : 1;
  return {
    ...pose,
    headYaw: pose.headYaw * scale,
    headRoll: pose.headRoll * scale,
    headPitch: pose.headPitch > 0 ? pose.headPitch * scale : Math.max(-pitchUp, pose.headPitch),
  };
};

export const KAREN_REST: Pose = {
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
  leftArm: KAREN_ARM_REST,
  rightArm: KAREN_ARM_REST,
  leftLeg: restLeg(KAREN_SKELETON, 1),
  rightLeg: restLeg(KAREN_SKELETON, -1),
};

export const KAREN_POINTING: Pose = {
  ...KAREN_REST,
  lean: 0.08,
  headPitch: -0.05,
  leftArm: KAREN_ARM_HIPS,
  rightArm: KAREN_ARM_POINT,
};
