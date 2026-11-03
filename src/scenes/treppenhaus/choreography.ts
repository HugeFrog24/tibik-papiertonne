import { FLIGHTS, riserZ, stairwellGround } from "../../building/stairwell";
import { armKf, blinkAt, kf } from "../../characters/animate";
import { ankleOnTread, planGait, plantFeet, rhythmicSteps, strideAt, type GaitPlan, type RootAt, type Step } from "../../characters/gait";
import type { Side } from "../../characters/skeleton";
import { ARM_REST, ARM_WALK, RIG, TIBIK_REST, type ArmPose, type TibikPose } from "../../Tibik/rig";
import type { Vec3 } from "../../toon/primitives";
import { tibikGait as papiertonnenTibikGait, type TibikFrame } from "../papiertonnen/choreography";

const EG = FLIGHTS[0];
const STAIR_X = -2.6;
const STEP = 0.55;
const SWING = 0.4;
export const DESCENT_START = 5.5;
const DESCENT_STEPS = EG.risers;
const DESCENT_END = DESCENT_START + DESCENT_STEPS * STEP + SWING;
export const STORY_END = 20.2;

const TURN = Math.PI / 2;
const FACING_DOOR = 3 * TURN;
const FACING_DOWN = 4 * TURN;

type Point = readonly [number, number];
type Walk = {
  readonly from: number;
  readonly to: number;
  readonly via: readonly [Point, Point, Point, Point];
};

const STAIR_FOOT: Point = [STAIR_X, -3.62];
const TURN_SPOT: Point = [-1.25, -3.18];
const BY_THE_DOOR: Point = [-1.2, -2.97];
const DOOR_SWEEP_CLEAR: Point = [-1.15, -3.3];
const IN_THE_DOORWAY: Point = [-1.85, -2.35];

const ARRIVE: Walk = { from: 15.8, to: 17.4, via: [STAIR_FOOT, [STAIR_X, -3.0], [-2.3, TURN_SPOT[1]], TURN_SPOT] };
const PIVOT_END = 17.75;
const STEP_BACK: readonly [number, number] = [17.9, 18.6];
const LEAVE: Walk = { from: 18.7, to: STORY_END, via: [DOOR_SWEEP_CLEAR, [-1.45, -3.25], [IN_THE_DOORWAY[0], -3.1], IN_THE_DOORWAY] };
const WALKS = [ARRIVE, LEAVE];
const SQUEEZE = 19.35;

const ROOT_TIMES = [0, 1.1, 3.1, 3.75, 4.1, 4.4, 4.7, 5.4, 15.4, ARRIVE.from, ARRIVE.to, PIVOT_END, ...STEP_BACK, LEAVE.from, LEAVE.to];
const ROOT_X = [-4.7, -4.7, -2.75, -2.75, -2.75, -2.78, -2.78, STAIR_X, STAIR_X, STAIR_FOOT[0], TURN_SPOT[0], BY_THE_DOOR[0], BY_THE_DOOR[0], DOOR_SWEEP_CLEAR[0], DOOR_SWEEP_CLEAR[0], IN_THE_DOORWAY[0]];
const ROOT_Z = [-9.27, -9.27, -9.27, -9.27, -9.27, -8.95, -8.95, -8.79, STAIR_FOOT[1], STAIR_FOOT[1], TURN_SPOT[1], BY_THE_DOOR[1], BY_THE_DOOR[1], DOOR_SWEEP_CLEAR[1], DOOR_SWEEP_CLEAR[1], IN_THE_DOORWAY[1]];

const slope = (z: number) => {
  const line = EG.from + ((riserZ(EG, 0) + 0.12 - z) * EG.rise) / EG.going;
  return Math.min(EG.from + EG.risers * EG.rise, Math.max(EG.from, line));
};

const DESCENT_ROOT: readonly [number, number] = [5.4, 15.4];
const descending = (t: number) => t >= DESCENT_ROOT[0] && t <= DESCENT_ROOT[1];
const steady = (n: number) => n;

const bezier = (via: Walk["via"], u: number): Point => {
  const w = [(1 - u) ** 3, 3 * u * (1 - u) ** 2, 3 * u ** 2 * (1 - u), u ** 3];
  return [0, 1].map((k) => via.reduce((sum, p, i) => sum + w[i] * p[k], 0)) as unknown as Point;
};
const tangent = (via: Walk["via"], u: number): Point => {
  const w = [(1 - u) ** 2, 2 * u * (1 - u), u ** 2];
  return [0, 1].map((k) => w.reduce((sum, wi, i) => sum + 3 * wi * (via[i + 1][k] - via[i][k]), 0)) as unknown as Point;
};

const SAMPLES = 64;
const arcLengths = new Map<Walk, number[]>();
const lengthsOf = (walk: Walk) => {
  let table = arcLengths.get(walk);
  if (!table) {
    const points = Array.from({ length: SAMPLES + 1 }, (_, i) => bezier(walk.via, i / SAMPLES));
    table = points.reduce<number[]>((acc, p, i) => [...acc, i === 0 ? 0 : acc[i - 1] + Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1])], []);
    arcLengths.set(walk, table);
  }
  return table;
};
const parameterAt = (walk: Walk, fraction: number) => {
  const table = lengthsOf(walk);
  const wanted = fraction * table[SAMPLES];
  const i = Math.max(0, Math.min(SAMPLES - 1, table.findIndex((l) => l >= wanted) - 1));
  const span = table[i + 1] - table[i];
  return (i + (span > 0 ? (wanted - table[i]) / span : 0)) / SAMPLES;
};

const RAMP = 0.25;
const cruise = (s: number) => {
  const top = 1 / (1 - RAMP);
  if (s <= RAMP) return (top * s * s) / (2 * RAMP);
  if (s >= 1 - RAMP) return 1 - (top * (1 - s) ** 2) / (2 * RAMP);
  return top * (s - RAMP / 2);
};

const walkAt = (walk: Walk, t: number) => {
  const s = Math.min(1, Math.max(0, (t - walk.from) / (walk.to - walk.from)));
  const u = parameterAt(walk, cruise(s));
  const [x, z] = bezier(walk.via, u);
  return { x, z, yaw: headingAt(walk, u) };
};

const headingAt = (walk: Walk, u: number) => {
  const [dx, dz] = tangent(walk.via, u);
  return FACING_DOWN + Math.atan2(dx, dz);
};

const YAW_TIMES = [0, 3.1, 3.75, 4.7, 5.4, ARRIVE.from, ARRIVE.to, PIVOT_END, ...STEP_BACK, LEAVE.from, LEAVE.to];
const YAW = [TURN, TURN, FACING_DOOR, FACING_DOOR, FACING_DOWN, FACING_DOWN, headingAt(ARRIVE, 1), FACING_DOWN, FACING_DOWN, headingAt(LEAVE, 0), headingAt(LEAVE, 0), FACING_DOWN];

const rootAt: RootAt = (t) => {
  const walk = WALKS.find((w) => t >= w.from && t <= w.to);
  if (walk) {
    const { x, z, yaw } = walkAt(walk, t);
    return { x, z, yaw, y: stairwellGround(x, z) };
  }
  const x = kf(t, ROOT_TIMES, ROOT_X);
  const z = descending(t) ? kf(t, [...DESCENT_ROOT], [-8.79, -3.62], steady) : kf(t, ROOT_TIMES, ROOT_Z);
  return { x, z, yaw: kf(t, YAW_TIMES, YAW), y: descending(t) ? slope(z) : stairwellGround(x, z) };
};

const speed = (t: number) => {
  const a = rootAt(t - 0.005);
  const b = rootAt(t + 0.005);
  return Math.hypot(b.x - a.x, b.z - a.z) / 0.01;
};
const cadence = (t: number) => 2.4 + 1.25 * speed(t);

const treadAnkle = (side: Side, k: number) => {
  const { z } = ankleOnTread(RIG, side, 0, { x: STAIR_X, z: riserZ(EG, k) });
  return { x: STAIR_X + side * RIG.hipX, z };
};

const descentSteps = (): Step[] => [
  ...Array.from({ length: DESCENT_STEPS }, (_, i): Step => {
    const side: Side = i % 2 === 0 ? -1 : 1;
    const lift = DESCENT_START + i * STEP;
    return { side, lift, land: lift + SWING, at: treadAnkle(side, DESCENT_STEPS - 1 - i) };
  }),
  {
    side: DESCENT_STEPS % 2 === 0 ? -1 : 1,
    lift: DESCENT_START + DESCENT_STEPS * STEP,
    land: DESCENT_END,
    at: treadAnkle(DESCENT_STEPS % 2 === 0 ? -1 : 1, 0),
  },
];

const arrivalSteps = () => rhythmicSteps({ from: ARRIVE.from + 0.05, to: ARRIVE.to, first: 1, cadence, overlap: 0.12 });
const last = (steps: Step[]): Side => steps[steps.length - 1].side;
const other = (steps: Step[]): Side => (last(steps) === 1 ? -1 : 1);

const steps = (): Step[] => [
  ...rhythmicSteps({ from: 1.1, to: 3.1, first: -1, cadence, overlap: 0.12 }),
  { side: -1, lift: 3.1, land: 3.25 },
  { side: 1, lift: 3.27, land: 3.42 },
  { side: -1, lift: 3.44, land: 3.59 },
  { side: 1, lift: 3.61, land: 3.76 },
  { side: 1, lift: 4.1, land: 4.25 },
  { side: -1, lift: 4.27, land: 4.42 },
  { side: -1, lift: 4.75, land: 4.95 },
  { side: 1, lift: 5.0, land: 5.2 },
  ...descentSteps(),
  ...arrivalSteps(),
  { side: other(arrivalSteps()), lift: ARRIVE.to + 0.02, land: ARRIVE.to + 0.17 },
  { side: last(arrivalSteps()), lift: ARRIVE.to + 0.19, land: PIVOT_END },
  { side: other(arrivalSteps()), lift: STEP_BACK[0] + 0.05, land: STEP_BACK[0] + 0.33 },
  { side: last(arrivalSteps()), lift: STEP_BACK[0] + 0.38, land: STEP_BACK[1] },
  ...rhythmicSteps({ from: LEAVE.from + 0.05, to: STORY_END, first: other(arrivalSteps()), cadence, overlap: 0.12 }),
];

let gait: GaitPlan | undefined;
export const treppenhausTibikGait = () =>
  (gait ??= planGait(RIG, papiertonnenTibikGait().style, rootAt, steps(), [-1, STORY_END + 0.5], stairwellGround));

export const footstepStoryTimes = (): number[] =>
  treppenhausTibikGait()
    .touchdowns.map((s) => s.time)
    .filter((t) => t >= 0 && t <= STORY_END);

export const tibikDoorAt = (t: number) => kf(t, [0.3, 1.1, 3.5, 4.1], [0, 1.62, 1.62, 0]);
export const haustuerAt = (t: number) => kf(t, [STEP_BACK[0] - 0.05, STEP_BACK[1] + 0.25], [0, 1.5]);
export const lightsAt = (t: number) => kf(t, [4.5, 4.7], [0, 1]);

export const RAIL_SPAN: readonly [number, number] = [DESCENT_START + 0.7, DESCENT_START + (DESCENT_STEPS - 1) * STEP];

const walking = (t: number) =>
  kf(
    t,
    [1.0, 1.2, 1.45, 1.6, ARRIVE.from, ARRIVE.from + 0.2, ARRIVE.to - 0.2, ARRIVE.to, LEAVE.from, LEAVE.from + 0.2, SQUEEZE - 0.2, SQUEEZE],
    [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0],
  );
const ARM_TIMES = [1.0, 1.2, 1.45, 1.6, 2.95, 3.15, 4.6, 4.75, 5.35, 5.5, ARRIVE.from, ARRIVE.from + 0.2, ARRIVE.to - 0.2, ARRIVE.to, LEAVE.from, LEAVE.from + 0.2, SQUEEZE - 0.2, SQUEEZE];
const ARM_TUCK: ArmPose = { raise: 0.35, out: 0.55, elbow: 1.6, inward: 1.0 };
const ARM_TO_RAIL: ArmPose = { raise: 2.6, out: 0.9, elbow: 1.5, inward: 0.1 };
const ARM_POSES = [ARM_REST, ARM_WALK, ARM_WALK, ARM_TUCK, ARM_TUCK, ARM_REST, ARM_REST, ARM_TUCK, ARM_TUCK, ARM_WALK, ARM_WALK, ARM_WALK, ARM_WALK, ARM_REST, ARM_REST, ARM_WALK, ARM_WALK, ARM_TUCK];

export const tibikAt = (t: number): TibikFrame => {
  const { x, z, yaw, y = 0 } = rootAt(t);
  const walk = walking(t);
  const swing = 0.35 * walk * strideAt(treppenhausTibikGait(), t);
  const pose: TibikPose = {
    ...TIBIK_REST,
    bob: 0,
    sway: 0.05 * walk * strideAt(treppenhausTibikGait(), t),
    headPitch: kf(t, [DESCENT_START - 0.3, DESCENT_START + 0.3, 15.3, 15.8], [0, 0.2, 0.2, 0]),
    blink: blinkAt(t, [0.9, 3.8, 7.2, 11.5, 16.4]),
    leftArm: armKf(t, ARM_TIMES, ARM_POSES),
    rightArm:
      t >= 5.35 && t < 15.8
        ? armKf(t, [5.35, 5.55, 14.85, 15.2], [ARM_TUCK, ARM_TO_RAIL, ARM_TO_RAIL, ARM_REST])
        : armKf(t, ARM_TIMES, ARM_POSES),
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
  return { ...placed, pose: plantFeet(treppenhausTibikGait(), t, placed), holdingBox: false };
};
