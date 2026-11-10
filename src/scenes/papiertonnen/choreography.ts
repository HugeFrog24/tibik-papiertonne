import { Easing } from "remotion";
import { armKf, blinkAt, kf } from "../../characters/animate";
import {
  rhythmicSteps,
  shiftSteps,
  STEP_OVERLAP,
  strideAt,
  touchdownTimes,
  walkCadence,
  type RootAt,
  type Step,
} from "../../characters/gait";
import { doorLeaf } from "../../building/doors";
import { stairwellGround, stepLift } from "../../building/stairwell";
import { walkAt, type Walk } from "../../characters/walkPath";
import type { Hold } from "../../physics/holds";
import { lazy } from "../../physics/lazy";
import { HAUSTUER, closerEnd, closerSwing } from "../../street/facade";
import { BIN_Z, SEARCHED_BIN, binByName } from "../../street/layout";
import { restingLid } from "../../street/lids";
import { guardLid } from "../../street/restingLids";
import { OUTLINE } from "../../toon/primitives";
import {
  ARM_REST,
  ARM_WALK,
  TIBIK_REST,
  type ArmPose,
  type TibikPose,
} from "../../Tibik/rig";
import type { Vec3 } from "../../toon/primitives";
import { tibikGaitOf, plantedTibik, type TibikFrame } from "../../Tibik/character";
import { OUT_OF_THE_DOOR } from "../treppenhaus/choreography";
import { sidleThrough } from "../enterHouse";
import type { Line } from "../../dialogue/line";
import { treppenhausEnd } from "../treppenhaus/solve";

export const OPENING = 1.5;
export const SHOT_OPEN_LID = 3.2 + OPENING;
export const SHOT_INSIDE_BIN = 4.8 + OPENING;
export const SHOT_FOUND_BOX = 7.0 + OPENING;
export const KARTON_OPENS: readonly [number, number] = [9.05 + OPENING, 9.55 + OPENING];
export const PAPIERTONNEN_DURATION = 9.9 + OPENING;
export const AFTER_THE_OPENING = {
  lidRises: [3.6, 4.0, 4.2],
  rummages: [6.5, 6.6, 6.9, 7.0],
  pulledOut: [7.3, 8.0],
  hopsForJoy: [9.6, 9.75, 9.9],
} as const;
export const PAPIERTONNEN_LAST_T = PAPIERTONNEN_DURATION - 1 / 30;

const BEFORE_THE_CUT = 0.1;

export const LINES: readonly Line[] = [
  {
    speaker: "karen",
    from: KARTON_OPENS[0],
    to: PAPIERTONNEN_DURATION - BEFORE_THE_CUT,
    text: "EY!",
    name: "Karen: Ey (von weitem)",
    tone: "shout",
    far: true,
  },
];

export const TARGET_BIN_X = binByName(SEARCHED_BIN).position[0];
export { BIN_Z, kf };

const PROPPED = restingLid(
  binByName(SEARCHED_BIN),
  binByName(SEARCHED_BIN).lid,
);
const FLUNG_OPEN = guardLid(binByName(SEARCHED_BIN), 1.8, OUTLINE);
export const lidAt = (t: number) =>
  kf(t - OPENING, AFTER_THE_OPENING.lidRises, [PROPPED, 0.6, FLUNG_OPEN]);

const REACH_LID: ArmPose = { raise: 1.45, out: 0.1, elbow: 0.3, inward: 0.1 };
const LIFT_LID: ArmPose = { raise: 1.95, out: 0.1, elbow: 0.55, inward: 0.1 };
const FLICK_LID: ArmPose = { raise: 2.3, out: 0.1, elbow: 0.3, inward: 0.1 };
const INTO_BIN: ArmPose = { raise: 1.75, out: 0.15, elbow: 1.6, inward: 0.2 };
const HUG_BOX: ArmPose = { raise: 1.0, out: 0.05, elbow: 0.5, inward: 0.5 };
const ON_RIM: ArmPose = { raise: 0.9, out: 0.25, elbow: 0.3, inward: 0.1 };

export type { TibikFrame } from "../../Tibik/character";

export type KartonState = {
  readonly position: Vec3;
  readonly rotation: Vec3;
  readonly open: number;
  readonly pickup: number;
  readonly sideGrip: number;
};

export const kartonAt = (t: number): KartonState => {
  const u = t - OPENING;
  const times = [8.0, 8.2];
  return {
    position: [0, kf(u, times, [0.5, 0.6]), kf(u, times, [0.38, 0.4])],
    rotation: [
      kf(u, AFTER_THE_OPENING.hopsForJoy, [0, 0.04, 0]),
      kf(u, AFTER_THE_OPENING.hopsForJoy, [0, 0.1, 0]),
      0,
    ],
    open: kf(t, KARTON_OPENS, [0, 1]),
    pickup: kf(u, AFTER_THE_OPENING.pulledOut, [0, 1]),
    sideGrip: kf(u, [8.0, 8.2], [0, 1]),
  };
};

const OPENING_END = 2 + OPENING;
const FIRST_STEP = 0.1;
const DOOR_RELEASE = 0.3;
export const HAUSTUER_LATCHED = closerEnd(DOOR_RELEASE);
const CLEAR_OF_THE_FRAME: readonly [number, number] = [1.6, 2.1];
const LETTING_GO = 0.5;

const OFF_THE_STEP = 0.4;
const PAST_THE_LEAF = 1.2;
const TOWARD_THE_BINS = sidleThrough([DOOR_RELEASE, PAST_THE_LEAF], -1);

export const PAPIERTONNEN_DOOR = { letGo: DOOR_RELEASE + LETTING_GO, alongTheBins: CLEAR_OF_THE_FRAME[0] };

const ALONG_THE_BINS = -0.58;

const walkingOut = lazy((): Walk => {
  const [x, , z] = treppenhausEnd().tibik.position;
  return {
    from: 0,
    to: OPENING_END,
    via: [
      [x, z],
      [x, -0.95],
      [-0.55, ALONG_THE_BINS],
      [0.6, ALONG_THE_BINS],
    ],
    startSpeed: OUT_OF_THE_DOOR,
    endSpeed: 2 * (TARGET_BIN_X - 0.6),
  };
});

const stepDown = (z: number) => stepLift(z, 0.25, 0.5);

export const papiertonnenHaustuerAt = (t: number) => {
  const held = treppenhausEnd().haustuer;
  return t <= DOOR_RELEASE ? held : closerSwing(t, DOOR_RELEASE, held);
};

export const PAPIERTONNEN_HOLDS: readonly Hold[] = [
  {
    name: "the Haustür",
    arm: "rightArm",
    path: "hand",
    reach: -1,
    grip: -0.5,
    release: DOOR_RELEASE,
    done: PAPIERTONNEN_DOOR.letGo,
    target: (t) => doorLeaf(HAUSTUER, papiertonnenHaustuerAt(t)),
  },
];

export const nearTheDoor = (t: number) => t < OPENING_END;

const WALK_SPEED = 1.6;
const walkX = (t: number) =>
  t < 2
    ? -2.6 + WALK_SPEED * t
    : kf(t, [2, 3], [0.6, TARGET_BIN_X], Easing.out((k) => Easing.quad(k)));
const turnAt = (t: number) =>
  kf(t, [2.9, 3.4, 8.2, 9.0], [Math.PI / 2, Math.PI, Math.PI, 0.5]);
const walkZ = (t: number) =>
  kf(
    t,
    [2.9, 3.35, 7.4, 7.9, 8.2, 9.0],
    [ALONG_THE_BINS, -0.95, -0.95, -0.82, -0.82, -0.7],
  );
const rootAt: RootAt = (t) => {
  if (t < OPENING_END) {
    const { x, z, heading } = walkAt(walkingOut(), t);
    return { x, z, yaw: heading, y: stepDown(z) };
  }
  const u = t - OPENING;
  return { x: walkX(u), z: walkZ(u), yaw: turnAt(u), y: 0 };
};

const AT_THE_BIN: Step[] = shiftSteps(
  [
  { side: 1, lift: 3.0, land: 3.17 },
  { side: -1, lift: 3.21, land: 3.4 },
  { side: -1, lift: 7.45, land: 7.62 },
  { side: 1, lift: 7.66, land: 7.84 },
  { side: -1, lift: 8.2, land: 8.35 },
  { side: 1, lift: 8.37, land: 8.52 },
  { side: -1, lift: 8.54, land: 8.69 },
  { side: 1, lift: 8.71, land: 8.86 },
  { side: -1, lift: 8.88, land: 9.03 },
  ],
  OPENING,
);
const walkToTheBin = (first: 1 | -1) =>
  rhythmicSteps({
    from: FIRST_STEP,
    to: AT_THE_BIN[0].lift,
    first,
    cadence: walkCadence(rootAt),
    overlap: STEP_OVERLAP,
  });
const tibikSteps = (): Step[] => {
  const steps = walkToTheBin(-1);
  const alternating =
    steps[steps.length - 1].side !== AT_THE_BIN[0].side
      ? steps
      : walkToTheBin(1);
  return [...alternating, ...AT_THE_BIN];
};

export const tibikGait = tibikGaitOf(rootAt, tibikSteps, PAPIERTONNEN_DURATION, stairwellGround);

export const footstepTimes = (fps: number): number[] =>
  touchdownTimes(tibikGait(), PAPIERTONNEN_DURATION, fps);

export const tibikAt = (t: number): TibikFrame => {
  const { x, z, yaw: rotationY, y = 0 } = rootAt(t);
  const u = t - OPENING;
  const opening = t < OPENING_END;
  const walk = opening
    ? kf(t, CLEAR_OF_THE_FRAME, [0, 1])
    : kf(u, [2.6, 3.05], [1, 0]);
  const step = strideAt(tibikGait(), t);

  const lean = kf(u, [4.3, 4.75, 7.4, 7.9], [0, 0.25, 0.25, 0]);

  const rightArm = opening
    ? ARM_WALK
    : u < SHOT_FOUND_BOX - OPENING
      ? armKf(
          u,
          [2.6, 3.1, 3.3, ...AFTER_THE_OPENING.lidRises, 4.75, 6.0, AFTER_THE_OPENING.rummages[0]],
          [
            ARM_WALK,
            ARM_REST,
            ARM_REST,
            REACH_LID,
            LIFT_LID,
            FLICK_LID,
            ON_RIM,
            ON_RIM,
            INTO_BIN,
          ],
        )
      : armKf(u, [7.0, 7.9], [INTO_BIN, HUG_BOX]);

  const rummage = kf(u, AFTER_THE_OPENING.rummages, [0, 1, 1, 0]) * Math.sin(u * 22);

  const sidle = TOWARD_THE_BINS(t);
  const swing = 0.35 * walk * step * sidle.swing;

  const pose: TibikPose = {
    ...TIBIK_REST,
    sway: step * 0.05 * walk * sidle.swing,
    twist: sidle.twist,
    lean,
    headPitch:
      kf(
        u,
        [4.3, 4.75, 7.0, 7.3, 9.0, 9.15, 9.85, 9.95],
        [0, 0.35, 0.35, 0, 0, 0.1, 0.1, 0],
      ),
    headYaw: kf(u, [5.0, 5.3, 5.6, 5.95, 6.2], [0, 0.18, 0.18, -0.18, 0]) + sidle.headYaw,
    headRoll: kf(u, [8.2, 8.5, 8.8, 9.1], [0, 0.2, -0.1, 0]),
    gazeYaw: kf(u, [5.0, 5.3, 5.6, 5.95, 6.2], [0, 0.5, 0.5, -0.5, 0]),
    gazePitch: kf(
      u,
      [4.5, 4.8, 7.6, 7.9, 9.0, 9.15, 9.85, 9.95],
      [0, -0.15, -0.15, 0, 0, -0.2, -0.2, 0],
    ),
    blink: blinkAt(u, [1.6, 5.45, 6.4, 8.3]),
    leftArm: opening
      ? armKf(t, [0, OFF_THE_STEP, ...CLEAR_OF_THE_FRAME], [ARM_REST, ARM_WALK, ARM_WALK, ARM_REST])
      : armKf(
          u,
          [4.3, 4.75, 6.9, 7.1, 7.9],
          [ARM_REST, ON_RIM, ON_RIM, INTO_BIN, HUG_BOX],
        ),
    rightArm: {
      ...rightArm,
      raise: rightArm.raise + 0.12 * rummage + swing,
      elbow: rightArm.elbow - 0.2 * rummage,
    },
  };

  const placed = {
    position: [x, y, z] as Vec3,
    rotationY,
    pose: {
      ...pose,
      leftArm: { ...pose.leftArm, raise: pose.leftArm.raise - swing },
    },
  };
  return plantedTibik(tibikGait(), t, placed, t >= SHOT_FOUND_BOX);
};
