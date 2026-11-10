import { doorShiverAt } from "./banging";
import { CODA } from "./cigarette";
import { gripSolid } from "../../building/doors";
import { groundWithMats } from "../../building/ground";
import { TIBIK_DOOR, stairwellGround } from "../../building/stairwell";
import {
  shiftSteps,
  type RootAt,
  type Step,
} from "../../characters/gait";
import { AT_THE_CHEST, TAPE_STRIPS } from "./parcel";
import {
  EXIT,
  exitArms,
  exitDoorAt,
  exitHead,
  exitLeverAt,
  exitRoot,
  exitSteps,
} from "./exit";
import { inWindow } from "../../characters/scalar";
import type { Hold } from "../../physics/holds";
import { floorLevel } from "../../street/building";
import { tibikGaitOf, plantedTibik, type TibikFrame } from "../../Tibik/character";
import { TIBIK_CROUCH, TIBIK_REST } from "../../Tibik/rig";

export const AJAR = { slit: 0.12 };
export const AJAR_ANGLE = Math.acos(1 - AJAR.slit / TIBIK_DOOR.width);

export const UNLATCH: readonly [number, number] = [9.0, 9.15];
export const OPEN: readonly [number, number] = [9.15, 9.45];
export const SHUT: readonly [number, number] = [15.45, 15.75];
const LEVER_DOWN = 0.5;

const ajarAt = (t: number) => inWindow(t, OPEN) - inWindow(t, SHUT);

export const tibikDoorAt = (t: number) =>
  AJAR_ANGLE * ajarAt(t) +
  exitDoorAt(t) +
  doorShiverAt(t);

export const tibikLeverAt = (t: number) =>
  LEVER_DOWN *
    (inWindow(t, UNLATCH) - inWindow(t, [OPEN[0] + 0.05, OPEN[0] + 0.15])) +
  exitLeverAt(t);

export const TIBIK_AT_THE_GAP = { x: -4.05, z: -8.715, yaw: Math.PI / 2 };

export const TURN: readonly [number, number] = [4.65, 5.6];
const PACKING = { lean: 0.25, crouch: TIBIK_CROUCH };
export const LEAN_TO_THE_LEVER = 0.4;
const IN_TO_THE_LEVER: readonly [number, number] = [UNLATCH[0] - 0.3, UNLATCH[0]];
const UP_FROM_THE_LEVER: readonly [number, number] = [SHUT[1], SHUT[1] + 0.25];
const leverLean = (t: number) =>
  LEAN_TO_THE_LEVER * (inWindow(t, IN_TO_THE_LEVER) - inWindow(t, UP_FROM_THE_LEVER)) * (1 - ajarAt(t));
const packing = (t: number) =>
  inWindow(t, [2.0, 2.4]) -
  inWindow(t, [4.4, 4.75]) +
  TAPE_STRIPS.reduce(
    (sum, { times }) =>
      sum +
      inWindow(t, [times.at - 0.1, times.pick]) -
      inWindow(t, [times.down, times.done]),
    0,
  );
export const TO_THE_DOOR: readonly [number, number] = [4.85, 5.85];
const BACK = SHUT[1] + 0.25 - TURN[0];
const TURN_BACK: readonly [number, number] = [TURN[0] + BACK, TURN[1] + BACK];
const TO_THE_CHEST: readonly [number, number] = [
  TO_THE_DOOR[0] + BACK,
  TO_THE_DOOR[1] + BACK,
];

const flurRoot: RootAt = (t) => {
  const walked = inWindow(t, TO_THE_DOOR) - inWindow(t, TO_THE_CHEST);
  return {
    x: AT_THE_CHEST.x + (TIBIK_AT_THE_GAP.x - AT_THE_CHEST.x) * walked,
    z: AT_THE_CHEST.z + (TIBIK_AT_THE_GAP.z - AT_THE_CHEST.z) * walked,
    yaw:
      AT_THE_CHEST.yaw +
      (TIBIK_AT_THE_GAP.yaw - AT_THE_CHEST.yaw) *
        (inWindow(t, TURN) - inWindow(t, TURN_BACK)),
    y: floorLevel(1),
  };
};

const tibikRoot = exitRoot(flurRoot);
const WALKING_UNTIL = CODA.jumpCut + 1;

const OUT: readonly Step[] = [
  { side: 1, lift: 4.72, land: 4.86 },
  { side: -1, lift: 4.88, land: 5.02 },
  { side: 1, lift: 5.04, land: 5.18 },
  { side: -1, lift: 5.22, land: 5.38 },
  { side: 1, lift: 5.42, land: 5.58 },
  { side: -1, lift: 5.62, land: 5.78 },
  { side: 1, lift: 5.8, land: 5.94 },
];

const STEPS: readonly Step[] = [
  ...OUT,
  ...shiftSteps(OUT, BACK),
  ...exitSteps(OUT, TURN[0], WALKING_UNTIL),
];

export const tibikGait = tibikGaitOf(tibikRoot, () => STEPS, WALKING_UNTIL, stairwellGround, groundWithMats);

export const tibikAt = (t: number): TibikFrame => {
  const { x, z, yaw, y = floorLevel(1) } = tibikRoot(t);
  const leaving = t >= EXIT.pickup - 1;
  const placed = {
    position: [x, y, z] as [number, number, number],
    rotationY: yaw,
    pose: {
      ...TIBIK_REST,
      lean: PACKING.lean * packing(t) + leverLean(t),
      bob: TIBIK_REST.bob - PACKING.crouch * packing(t),
      ...(leaving ? { ...exitArms(t, TIBIK_REST), ...exitHead(t) } : {}),
    },
  };
  return plantedTibik(tibikGait(), t, placed);
};

export const LEVER_HOLD: Hold = {
  name: "his door lever",
  arm: "leftArm",
  reach: IN_TO_THE_LEVER[0],
  grip: IN_TO_THE_LEVER[1],
  release: UP_FROM_THE_LEVER[0],
  done: UP_FROM_THE_LEVER[1],
  target: (t) =>
    gripSolid(TIBIK_DOOR, tibikDoorAt(t), "inner", tibikLeverAt(t)),
  continuous: true,
  letGoAround: true,
};
