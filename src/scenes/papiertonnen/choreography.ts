import { Easing } from "remotion";
import { armKf, blinkAt, kf } from "../../characters/animate";
import {
  planGait,
  plantFeet,
  rhythmicSteps,
  strideAt,
  type GaitPlan,
  type GaitStyle,
  type RootAt,
  type Step,
} from "../../characters/gait";
import { BIN_Z, SEARCHED_BIN, binByName } from "../../street/layout";
import { restingLid } from "../../street/lids";
import {
  ARM_REST,
  ARM_WALK,
  RIG,
  TIBIK_REST,
  type ArmPose,
  type TibikPose,
} from "../../Tibik/rig";
import type { Vec3 } from "../../toon/primitives";

export const SHOT_OPEN_LID = 3.2;
export const SHOT_INSIDE_BIN = 4.8;
export const SHOT_FOUND_BOX = 7.0;
export const PAPIERTONNEN_DURATION = 10.5;

export const TARGET_BIN_X = binByName(SEARCHED_BIN).position[0];
export { BIN_Z, kf };

const PROPPED = restingLid(binByName(SEARCHED_BIN), binByName(SEARCHED_BIN).lid);
export const lidAt = (t: number) => kf(t, [3.6, 4.0, 4.2], [PROPPED, 0.6, 1.8]);

const REACH_LID: ArmPose = { raise: 1.45, out: 0.1, elbow: 0.3, inward: 0.1 };
const LIFT_LID: ArmPose = { raise: 1.95, out: 0.1, elbow: 0.55, inward: 0.1 };
const FLICK_LID: ArmPose = { raise: 2.3, out: 0.1, elbow: 0.3, inward: 0.1 };
const INTO_BIN: ArmPose = { raise: 1.75, out: 0.15, elbow: 1.6, inward: 0.2 };
const HUG_BOX: ArmPose = { raise: 1.0, out: 0.05, elbow: 0.5, inward: 0.5 };
const ON_RIM: ArmPose = { raise: 0.9, out: 0.25, elbow: 0.3, inward: 0.1 };

export type TibikFrame = {
  readonly position: Vec3;
  readonly rotationY: number;
  readonly pose: TibikPose;
  readonly holdingBox: boolean;
};

export type KartonState = {
  readonly position: Vec3;
  readonly rotation: Vec3;
  readonly open: number;
  readonly pickup: number;
  readonly sideGrip: number;
};

export const kartonAt = (t: number): KartonState => {
  const times = [8.0, 8.2];
  return {
    position: [0, kf(t, times, [0.5, 0.6]), kf(t, times, [0.38, 0.43])],
    rotation: [kf(t, [9.6, 9.75, 9.9], [0, 0.04, 0]), kf(t, [9.6, 9.75, 9.9], [0, 0.1, 0]), 0],
    open: kf(t, [9.05, 9.55], [0, 1]),
    pickup: kf(t, [7.3, 8.0], [0, 1]),
    sideGrip: kf(t, [8.0, 8.2], [0, 1]),
  };
};

const WALK_SPEED = 1.6;
const walkX = (t: number) =>
  t < 2
    ? -2.6 + WALK_SPEED * t
    : kf(t, [2, 3], [0.6, TARGET_BIN_X], Easing.out(Easing.quad));
const turnAt = (t: number) => kf(t, [3.0, 3.35, 8.2, 9.0], [Math.PI / 2, Math.PI, Math.PI, 0.5]);
const walkZ = (t: number) => kf(t, [2.9, 3.35, 7.4, 7.9, 8.2, 9.0], [-0.75, -0.95, -0.95, -0.82, -0.82, -0.7]);
const rootAt: RootAt = (t) => ({ x: walkX(t), z: walkZ(t), yaw: turnAt(t) });

const TIBIK_GAIT: GaitStyle = { stride: 0.72, plantAt: 0.4, lift: 0.06, heelStrike: 0.42, heelRoll: 0.06, toeOff: 0.6, toeRoll: 0.12 };
const walkSpeed = (t: number) => Math.abs(walkX(t + 0.005) - walkX(t - 0.005)) / 0.01;
const TIBIK_STEPS: Step[] = [
  ...rhythmicSteps({ from: -0.7, to: 3.0, first: -1, cadence: (t) => 2.4 + 1.25 * walkSpeed(t), overlap: 0.12 }),
  { side: 1, lift: 3.0, land: 3.17 },
  { side: -1, lift: 3.21, land: 3.4 },
  { side: -1, lift: 7.45, land: 7.62 },
  { side: 1, lift: 7.66, land: 7.84 },
  { side: -1, lift: 8.2, land: 8.35 },
  { side: 1, lift: 8.37, land: 8.52 },
  { side: -1, lift: 8.54, land: 8.69 },
  { side: 1, lift: 8.71, land: 8.86 },
  { side: -1, lift: 8.88, land: 9.03 },
];

let gait: GaitPlan | null = null;
export const tibikGait = () => (gait ??= planGait(RIG, TIBIK_GAIT, rootAt, TIBIK_STEPS, [-1, PAPIERTONNEN_DURATION]));

export const footstepTimes = (fps: number): number[] =>
  tibikGait()
    .touchdowns.filter((s) => s.time >= 0 && s.time < PAPIERTONNEN_DURATION)
    .map((s) => Math.round(s.time * fps) / fps);

export const tibikAt = (t: number): TibikFrame => {
  const { x, z, yaw: rotationY } = rootAt(t);
  const walk = kf(t, [2.6, 3.05], [1, 0]);
  const step = strideAt(tibikGait(), t);

  const lean = kf(t, [4.3, 4.75, 7.4, 7.9], [0, 0.25, 0.25, 0]);

  const bounce = Math.max(0, Math.sin((t - 9.95) * Math.PI * 4)) * kf(t, [9.95, 10.0, 10.4, 10.5], [0, 1, 1, 0]);

  const rightArm =
    t < SHOT_FOUND_BOX
      ? armKf(
          t,
          [2.6, 3.1, 3.3, 3.6, 4.0, 4.2, 4.75, 6.0, 6.5],
          [ARM_WALK, ARM_REST, ARM_REST, REACH_LID, LIFT_LID, FLICK_LID, ON_RIM, ON_RIM, INTO_BIN],
        )
      : armKf(
          t,
          [7.0, 7.9],
          [INTO_BIN, HUG_BOX],
        );

  const rummage = kf(t, [6.5, 6.6, 6.9, 7.0], [0, 1, 1, 0]) * Math.sin(t * 22);

  const swing = 0.35 * walk * step;

  const pose: TibikPose = {
    ...TIBIK_REST,
    bob: -bounce * 0.04,
    sway: step * 0.05 * walk,
    lean,
    headPitch:
      kf(t, [4.3, 4.75, 7.0, 7.3, 9.0, 9.15, 9.85, 9.95], [0, 0.35, 0.35, 0, 0, 0.1, 0.1, 0]) +
      kf(t, [9.95, 10.08, 10.2, 10.33, 10.45], [0, 0.12, 0, 0.12, 0]),
    headYaw:
      kf(t, [5.0, 5.3, 5.6, 5.95, 6.2], [0, 0.18, 0.18, -0.18, 0]),
    headRoll: kf(t, [8.2, 8.5, 8.8, 9.1], [0, 0.2, -0.1, 0]),
    gazeYaw:
      kf(t, [5.0, 5.3, 5.6, 5.95, 6.2], [0, 0.5, 0.5, -0.5, 0]),
    gazePitch: kf(t, [4.5, 4.8, 7.6, 7.9, 9.0, 9.15, 9.85, 9.95], [0, -0.15, -0.15, 0, 0, -0.2, -0.2, 0]),
    blink: blinkAt(t, [1.6, 5.45, 6.4, 8.3]),
    leftArm: armKf(t, [2.6, 3.1, 4.3, 4.75, 6.9, 7.1, 7.9], [ARM_WALK, ARM_REST, ARM_REST, ON_RIM, ON_RIM, INTO_BIN, HUG_BOX]),
    rightArm: {
      ...rightArm,
      raise: rightArm.raise + 0.12 * rummage + swing,
      elbow: rightArm.elbow - 0.2 * rummage,
    },
  };

  const placed = {
    position: [x, 0, z] as Vec3,
    rotationY,
    pose: {
      ...pose,
      leftArm: { ...pose.leftArm, raise: pose.leftArm.raise - swing },
    },
  };
  return {
    ...placed,
    pose: plantFeet(tibikGait(), t, placed),
    holdingBox: t >= SHOT_FOUND_BOX,
  };
};
