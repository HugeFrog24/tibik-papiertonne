import { doorLeaf, gripSolid } from "../../building/doors";
import {
  FLIGHTS,
  TIBIK_DOOR,
  TIBIK_LIGHT_BUTTON,
  buttonSolid,
  riserZ,
  stairwellGround,
} from "../../building/stairwell";
import { groundWithMats } from "../../building/ground";
import type { Hold } from "../../physics/holds";
import { HAUSTUER } from "../../street/facade";
import { armKf, blinkAt, kf } from "../../characters/animate";
import { Easing } from "remotion";
import {
  STEP_OVERLAP,
  ankleOnTread,
  opposite,
  planGait,
  plantFeet,
  rhythmicSteps,
  strideAt,
  walkCadence,
  type RootAt,
  type Step,
} from "../../characters/gait";
import { lazy } from "../../physics/lazy";
import { easeUnit, smoothstep } from "../../characters/scalar";
import type { Side } from "../../characters/skeleton";
import {
  ARM_REST,
  ARM_TUCK,
  RIG,
  TIBIK_REST,
  type ArmPose,
  type TibikPose,
} from "../../Tibik/rig";
import type { Vec3 } from "../../toon/primitives";
import { TIBIK_GAIT, type TibikFrame } from "../../Tibik/character";
import {
  headingAt,
  walkAt,
  type Point,
  type Walk,
} from "../../characters/walkPath";

const EG = FLIGHTS[0];
const STAIR_X = -2.6;
const STEP = 0.55;
const SWING = 0.4;
export const DESCENT_START = 5.5;
const DESCENT_STEPS = EG.risers;
const DESCENT_END = DESCENT_START + DESCENT_STEPS * STEP + SWING;
export const STORY_END = 20.95;
const LEAVE_END = 20.4;

const TURN = Math.PI / 2;
const FACING_BACK = 2 * TURN;
const FACING_DOOR = 3 * TURN;
const FACING_DOWN = 4 * TURN;

const BESIDE_HIS_DOOR: Point = [-3.85, -8.5];
const IN_HIS_DOORWAY: Point = [-3.45, -9.14];
const OUT_ON_THE_LANDING: Point = [-2.62, -9.14];
const AT_THE_SWITCH: Point = [-2.72, -8.85];
const STAIR_TOP: Point = [STAIR_X, -8.79];

const CRACKED = 0.22;
const SWUNG = 1.25;
const LEVER_PULL: readonly [number, number] = [0.25, 0.55];
const coastTime = (pull: readonly [number, number], from: number, to: number) =>
  (pull[1] - pull[0]) * ((to - from) / from);
const SIDLE_IN: readonly [number, number] = [0.95, 1.95];
const SHUFFLE = 5;
const SWUNG_AT = LEVER_PULL[1] + coastTime(LEVER_PULL, CRACKED, SWUNG);
const SHUT: readonly [number, number] = [SWUNG_AT, 3.0];
const TO_THE_SWITCH: readonly [number, number] = [3.25, 3.9];

const FOLLOW_ANGLES = [0, 0.2, 0.4, 0.6, 0.8, 1.0, SWUNG];
const FOLLOW_X = [
  OUT_ON_THE_LANDING[0],
  -2.71,
  -2.82,
  -2.95,
  -3.07,
  -3.22,
  IN_HIS_DOORWAY[0],
];

const STAIR_FOOT: Point = [STAIR_X, -3.62];
const TURN_SPOT: Point = [-1.25, -3.18];
const BY_THE_HAUSTUER: Point = [-1.2, -3.1];
const CATCHING_IT: Point = [-1.6, -3.05];
const IN_THE_DOORWAY: Point = [-1.85, -2.35];

const HAUSTUER_CRACKED = 0.35;
const HAUSTUER_PEAK = 1.2;
const HAUSTUER_HELD = 1.35;
const ARRIVE: Walk = {
  from: 15.8,
  to: 17.4,
  via: [STAIR_FOOT, [STAIR_X, -3.0], [-2.3, TURN_SPOT[1]], TURN_SPOT],
  ramps: [0.4, 0.2],
};
const PIVOT_END = 18.0;
const HAUSTUER_PULL: readonly [number, number] = [18.25, 18.5];
export const HAUSTUER_SWUNG_AT =
  HAUSTUER_PULL[1] + coastTime(HAUSTUER_PULL, HAUSTUER_CRACKED, HAUSTUER_PEAK);
const CATCH_STEP: readonly [number, number] = [18.85, 19.2];
const HAUSTUER_CAUGHT = 19.15;
const HAUSTUER_PUSHED = 19.55;
const LEAVE: Walk = {
  from: 19.3,
  to: LEAVE_END,
  via: [CATCHING_IT, [-1.78, -2.98], [IN_THE_DOORWAY[0], -2.8], IN_THE_DOORWAY],
};
const WALKS = [ARRIVE, LEAVE];

const LEAVE_THE_SWITCH = 4.7;
const LIGHTS_UP: readonly [number, number] = [4.5, 4.7];
const TURN_STEPS: readonly (readonly [number, number])[] = [
  [4.75, 4.95],
  [5.0, 5.2],
];
const ARMS_IN = 5.35;
const RIGHT_HAND_ON_RAIL: readonly [number, number] = [5.55, 14.85];
const RIGHT_ARM_DOWN = 15.2;
const REACH_FOR_THE_LEAF = 18.9;

const DESCENT_ROOT: readonly [number, number] = [5.4, 15.4];

const ROOT_KEYS: readonly (readonly [number, Point])[] = [
  [0, BESIDE_HIS_DOOR],
  [SIDLE_IN[0], BESIDE_HIS_DOOR],
  [SIDLE_IN[1], IN_HIS_DOORWAY],
  [SHUT[0], IN_HIS_DOORWAY],
  [SHUT[1], OUT_ON_THE_LANDING],
  [TO_THE_SWITCH[0], OUT_ON_THE_LANDING],
  [TO_THE_SWITCH[1], AT_THE_SWITCH],
  [LEAVE_THE_SWITCH, AT_THE_SWITCH],
  [DESCENT_ROOT[0], STAIR_TOP],
  [DESCENT_ROOT[1], STAIR_FOOT],
  [ARRIVE.from, STAIR_FOOT],
  [ARRIVE.to, TURN_SPOT],
  [PIVOT_END, BY_THE_HAUSTUER],
  [CATCH_STEP[0], BY_THE_HAUSTUER],
  [CATCH_STEP[1], CATCHING_IT],
  [LEAVE.from, CATCHING_IT],
  [LEAVE.to, IN_THE_DOORWAY],
];
const ROOT_TIMES = ROOT_KEYS.map(([t]) => t);
const ROOT_X = ROOT_KEYS.map(([, p]) => p[0]);
const ROOT_Z = ROOT_KEYS.map(([, p]) => p[1]);

const slope = (z: number) => {
  const line = EG.from + ((riserZ(EG, 0) + 0.12 - z) * EG.rise) / EG.going;
  return Math.min(EG.from + EG.risers * EG.rise, Math.max(EG.from, line));
};

const descending = (t: number) => t >= DESCENT_ROOT[0] && t <= DESCENT_ROOT[1];

const SHOULDER_TO_LEVER = 0.35;
const SHOULDER_TO_HAUSTUER = -0.4;
const HAUSTUER_LET_GO = 18.75;
const HAUSTUER_REACH = 17.85;
const HAUSTUER_GRIP = 18.08;
const YAW_KEYS: readonly (readonly [number, number])[] = [
  [0, FACING_BACK + SHOULDER_TO_LEVER],
  [SIDLE_IN[0], FACING_BACK + SHOULDER_TO_LEVER],
  [SIDLE_IN[1], FACING_BACK],
  [TO_THE_SWITCH[0], FACING_BACK],
  [TO_THE_SWITCH[1], FACING_DOOR],
  [LEAVE_THE_SWITCH, FACING_DOOR],
  [DESCENT_ROOT[0], FACING_DOWN],
  [ARRIVE.from, FACING_DOWN],
  [ARRIVE.to, FACING_DOWN + headingAt(ARRIVE, 1)],
  [PIVOT_END, FACING_DOOR + SHOULDER_TO_HAUSTUER],
  [HAUSTUER_LET_GO, FACING_DOOR + SHOULDER_TO_HAUSTUER],
  [CATCH_STEP[1], FACING_DOWN + headingAt(LEAVE, 0)],
  [LEAVE.from, FACING_DOWN + headingAt(LEAVE, 0)],
  [LEAVE.to, FACING_DOWN],
];
const YAW_TIMES = YAW_KEYS.map(([t]) => t);
const YAW = YAW_KEYS.map(([, yaw]) => yaw);

const pulledThenCoasting = (
  t: number,
  pull: readonly [number, number],
  cracked: number,
  open: number,
) => {
  if (t <= pull[0]) return 0;
  if (t <= pull[1]) return cracked * ((t - pull[0]) / (pull[1] - pull[0])) ** 2;
  const s = Math.min(1, (t - pull[1]) / coastTime(pull, cracked, open));
  return cracked + (open - cracked) * (1 - (1 - s) ** 2);
};

export const LEVER = { down: 0.5, press: 0.14, settle: 0.01, back: 0.08 };

const leverAt = (t: number, pull: readonly [number, number]) => {
  const start = pull[0] - LEVER.settle - LEVER.press;
  if (t <= start || t >= pull[1] + LEVER.back) return 0;
  if (t < pull[0] - LEVER.settle)
    return LEVER.down * smoothstep((t - start) / LEVER.press);
  if (t <= pull[1]) return LEVER.down;
  return LEVER.down * (1 - smoothstep((t - pull[1]) / LEVER.back));
};

export const tibikLeverAt = (t: number) => leverAt(t, LEVER_PULL);
export const haustuerLeverAt = (t: number) => leverAt(t, HAUSTUER_PULL);

export const tibikDoorAt = (t: number) =>
  t < SHUT[0]
    ? pulledThenCoasting(t, LEVER_PULL, CRACKED, SWUNG)
    : kf(t, SHUT, [SWUNG, 0]);
export const haustuerAt = (t: number) =>
  t < HAUSTUER_CAUGHT
    ? pulledThenCoasting(t, HAUSTUER_PULL, HAUSTUER_CRACKED, HAUSTUER_PEAK)
    : kf(
        t,
        [HAUSTUER_CAUGHT + 0.05, HAUSTUER_PUSHED],
        [HAUSTUER_PEAK, HAUSTUER_HELD],
      );
const LIGHT_PRESS = 4.47;
const BUTTON_HOLD = { reach: 4.1, grip: 4.45, release: 4.65, done: 4.95 };
export const lightsAt = (t: number) => kf(t, LIGHTS_UP, [0, 1]);

export const treppenhausIndoors = (t: number) => 1 - easeUnit(haustuerAt(t));

export const SOUND_CUES = {
  hisDoorOpens: LEVER_PULL[0],
  hisDoorShuts: SHUT[1],
  lightSwitch: LIGHT_PRESS,
  haustuerOpens: HAUSTUER_PULL[0],
} as const;

export const HOLDS: readonly Hold[] = [
  {
    name: "his door lever",
    arm: "rightArm",
    reach: -0.3,
    grip: 0,
    release: LEVER_PULL[1],
    done: 0.85,
    target: (t) =>
      gripSolid(TIBIK_DOOR, tibikDoorAt(t), "inner", tibikLeverAt(t)),
  },
  {
    name: "his door knob",
    arm: "leftArm",
    reach: 1.55,
    grip: SHUT[0],
    release: SHUT[1],
    done: SHUT[1] + 0.25,
    target: (t) => gripSolid(TIBIK_DOOR, tibikDoorAt(t), "outer"),
  },
  {
    name: "the light button",
    arm: "leftArm",
    ...BUTTON_HOLD,
    target: () => buttonSolid(TIBIK_LIGHT_BUTTON),
  },
  {
    name: "the Haustür lever",
    arm: "leftArm",
    reach: HAUSTUER_REACH,
    grip: HAUSTUER_GRIP,
    release: HAUSTUER_PULL[1],
    done: HAUSTUER_LET_GO,
    target: (t) =>
      gripSolid(HAUSTUER, haustuerAt(t), "inner", haustuerLeverAt(t)),
  },
  {
    name: "the Haustür",
    arm: "rightArm",
    reach: REACH_FOR_THE_LEAF,
    grip: HAUSTUER_CAUGHT,
    release: STORY_END,
    done: STORY_END + 0.3,
    target: (t) => doorLeaf(HAUSTUER, haustuerAt(t)),
  },
];

const shutting = (t: number) => t >= SHUT[0] && t <= SHUT[1];

const SIDLE: Walk = {
  from: SIDLE_IN[0],
  to: SIDLE_IN[1],
  via: [
    BESIDE_HIS_DOOR,
    [BESIDE_HIS_DOOR[0], -9.0],
    [-3.75, IN_HIS_DOORWAY[1]],
    IN_HIS_DOORWAY,
  ],
};

export const treppenhausRoot: RootAt = (t) => {
  if (t >= SIDLE.from && t <= SIDLE.to) {
    const { x, z } = walkAt(SIDLE, t);
    return { x, z, yaw: kf(t, YAW_TIMES, YAW), y: stairwellGround(x, z) };
  }
  const walk = WALKS.find((w) => t >= w.from && t <= w.to);
  if (walk) {
    const { x, z, heading } = walkAt(walk, t);
    const yaw = FACING_DOWN + heading;
    return { x, z, yaw, y: stairwellGround(x, z) };
  }
  const x = shutting(t)
    ? kf(tibikDoorAt(t), FOLLOW_ANGLES, FOLLOW_X, Easing.linear)
    : kf(t, ROOT_TIMES, ROOT_X);
  const z = descending(t)
    ? kf(t, DESCENT_ROOT, [STAIR_TOP[1], STAIR_FOOT[1]], Easing.linear)
    : kf(t, ROOT_TIMES, ROOT_Z);
  return {
    x,
    z,
    yaw: kf(t, YAW_TIMES, YAW),
    y: descending(t) ? slope(z) : stairwellGround(x, z),
  };
};

const cadence = walkCadence(treppenhausRoot);

const treadAnkle = (side: Side, k: number) => {
  const { z } = ankleOnTread(RIG, side, 0, { x: STAIR_X, z: riserZ(EG, k) });
  return { x: STAIR_X + side * RIG.hipX, z };
};

const descentSteps = (): Step[] => [
  ...Array.from({ length: DESCENT_STEPS }, (_, i): Step => {
    const side: Side = i % 2 === 0 ? -1 : 1;
    const lift = DESCENT_START + i * STEP;
    return {
      side,
      lift,
      land: lift + SWING,
      at: treadAnkle(side, DESCENT_STEPS - 1 - i),
    };
  }),
  {
    side: DESCENT_STEPS % 2 === 0 ? -1 : 1,
    lift: DESCENT_START + DESCENT_STEPS * STEP - 0.12,
    land: DESCENT_END,
    at: treadAnkle(DESCENT_STEPS % 2 === 0 ? -1 : 1, 0),
  },
];

const arrivalSteps = () =>
  rhythmicSteps({
    from: ARRIVE.from + 0.05,
    to: ARRIVE.to,
    first: 1,
    cadence,
    overlap: STEP_OVERLAP,
  });
const last = (steps: Step[]): Side => steps[steps.length - 1].side;
const other = (steps: Step[]): Side => opposite(last(steps));

export const treppenhausSteps = (): Step[] => {
  const arrival = arrivalSteps();
  return [
    ...rhythmicSteps({
      from: SIDLE_IN[0] + 0.02,
      to: SIDLE_IN[1],
      first: -1,
      cadence: () => SHUFFLE,
      overlap: STEP_OVERLAP,
    }),
    ...rhythmicSteps({
      from: SHUT[0] + 0.05,
      to: SHUT[1],
      first: -1,
      cadence,
      overlap: STEP_OVERLAP,
    }),
    { side: 1, lift: TO_THE_SWITCH[0] + 0.05, land: TO_THE_SWITCH[0] + 0.25 },
    { side: -1, lift: TO_THE_SWITCH[0] + 0.27, land: TO_THE_SWITCH[0] + 0.45 },
    { side: 1, lift: TO_THE_SWITCH[0] + 0.47, land: TO_THE_SWITCH[1] },
    { side: -1, lift: TURN_STEPS[0][0], land: TURN_STEPS[0][1] },
    { side: 1, lift: TURN_STEPS[1][0], land: TURN_STEPS[1][1] },
    ...descentSteps(),
    ...arrival,
    { side: other(arrival), lift: ARRIVE.to + 0.02, land: ARRIVE.to + 0.16 },
    { side: last(arrival), lift: ARRIVE.to + 0.18, land: ARRIVE.to + 0.32 },
    { side: other(arrival), lift: ARRIVE.to + 0.34, land: ARRIVE.to + 0.47 },
    { side: last(arrival), lift: ARRIVE.to + 0.49, land: PIVOT_END },
    {
      side: other(arrival),
      lift: CATCH_STEP[0] + 0.02,
      land: CATCH_STEP[0] + 0.18,
    },
    { side: last(arrival), lift: CATCH_STEP[0] + 0.2, land: CATCH_STEP[1] },
    ...rhythmicSteps({
      from: LEAVE.from + 0.05,
      to: LEAVE.to,
      first: other(arrival),
      cadence,
      overlap: STEP_OVERLAP,
    }),
  ];
};

export const treppenhausTibikGait = lazy(() =>
  planGait(
    RIG,
    TIBIK_GAIT,
    treppenhausRoot,
    treppenhausSteps(),
    [-1, STORY_END + 0.5],
    stairwellGround,
    groundWithMats,
  ),
);

export const footstepStoryTimes = (): number[] =>
  treppenhausTibikGait()
    .touchdowns.map((s) => s.time)
    .filter((t) => t >= 0 && t <= STORY_END);

export const RAIL_SPAN: readonly [number, number] = [
  DESCENT_START + 0.7,
  DESCENT_START + (DESCENT_STEPS - 1) * STEP - 0.05,
];

const walking = (t: number) =>
  kf(
    t,
    [ARRIVE.from, ARRIVE.from + 0.2, ARRIVE.to - 0.2, ARRIVE.to],
    [0, 1, 1, 0],
  );
const ARM_ON_STAIRS: ArmPose = {
  raise: 0.2,
  out: 0.7,
  elbow: 0.35,
  inward: 0.1,
};
const ARM_TO_RAIL: ArmPose = { raise: -0.4, out: 0.5, elbow: 1.8, inward: 0 };
const ARM_KEYS: readonly (readonly [number, ArmPose])[] = [
  [0, ARM_TUCK],
  [SHUT[1], ARM_TUCK],
  [SHUT[1] + 0.25, ARM_REST],
  [TURN_STEPS[1][1], ARM_REST],
  [ARMS_IN, ARM_TUCK],
  [DESCENT_START, ARM_ON_STAIRS],
  [ARRIVE.to - 0.2, ARM_ON_STAIRS],
  [ARRIVE.to, ARM_TUCK],
];
const ARM_TIMES = ARM_KEYS.map(([t]) => t);
const ARM_POSES = ARM_KEYS.map(([, pose]) => pose);

export const treppenhausArm = (t: number) => armKf(t, ARM_TIMES, ARM_POSES);

export const LEAVING = {
  besideHisDoor: BESIDE_HIS_DOOR,
  leverPull: LEVER_PULL,
  sidle: SIDLE_IN,
  shut: SHUT,
  toTheSwitch: TO_THE_SWITCH,
  leaveTheSwitch: LEAVE_THE_SWITCH,
  lightPress: LIGHT_PRESS,
  lightsUp: LIGHTS_UP,
  buttonHold: BUTTON_HOLD,
  turnSteps: TURN_STEPS,
  descentStart: DESCENT_START,
  descentRoot: DESCENT_ROOT,
  step: STEP,
} as const;

export const tibikAt = (t: number): TibikFrame => {
  const { x, z, yaw, y = 0 } = treppenhausRoot(t);
  const walk = walking(t);
  const swing = 0.35 * walk * strideAt(treppenhausTibikGait(), t);
  const pose: TibikPose = {
    ...TIBIK_REST,
    bob: 0,
    sway: 0.05 * walk * strideAt(treppenhausTibikGait(), t),
    headPitch: kf(
      t,
      [DESCENT_START - 0.3, DESCENT_START + 0.3, 15.3, ARRIVE.from],
      [0, 0.2, 0.2, 0],
    ),
    blink: blinkAt(t, [0.9, 3.8, 7.2, 11.5, 16.4, 18.8]),
    leftArm: treppenhausArm(t),
    rightArm:
      t >= ARMS_IN && t < ARRIVE.from
        ? armKf(
            t,
            [ARMS_IN, ...RIGHT_HAND_ON_RAIL, RIGHT_ARM_DOWN],
            [ARM_TUCK, ARM_TO_RAIL, ARM_TO_RAIL, ARM_REST],
          )
        : treppenhausArm(t),
  };
  const placed = {
    position: [x, y, z] as Vec3,
    rotationY: yaw,
    pose: {
      ...pose,
      leftArm: { ...pose.leftArm, raise: pose.leftArm.raise - swing },
      rightArm: { ...pose.rightArm, raise: pose.rightArm.raise + swing },
    },
  };
  return {
    ...placed,
    pose: plantFeet(treppenhausTibikGait(), t, placed),
    holdingBox: false,
  };
};
