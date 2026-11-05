import { Vector3 } from "three";
import { kf } from "../characters/animate";
import { STEP_OVERLAP, opposite, rhythmicSteps, type Step } from "../characters/gait";
import { inWindow } from "../characters/scalar";
import type { Side } from "../characters/skeleton";
import { walkFacing, type Walk } from "../characters/walkPath";
import { coastTime, doorFrame, fittingsOf, gripSolid, pulledThenCoasting } from "../building/doors";
import { stepLift } from "../building/stairwell";
import type { Hold } from "../physics/holds";
import { KEY_APPROACH, KEY_GRIP, keyBowGrip, keyDepthAt, keyInLock } from "../props/keyRingShape";
import { HAUSTUER, closerEnd, closerSwing } from "../street/facade";

export type Stand = { readonly x: number; readonly z: number };
export type Root = { readonly x: number; readonly z: number; readonly yaw: number; readonly y: number };

export const FACING_THE_WALL = Math.PI;
const ONTO_THE_STEP = [0.26, 0.3] as const;
const STANCE = 0.17;

export const DOOR_STAND: Stand = { x: -1.25, z: -1.8 };
export const ON_THE_PAVEMENT = -1.42;
const ON_THE_STEP = DOOR_STAND.z - 0.05;
const INSIDE = { x: -1.45, z: -3.4 };
const BACK_STAND = { x: -1.15, z: ON_THE_PAVEMENT };
const BEFORE_THE_DOORWAY = { x: -1.875, z: ON_THE_PAVEMENT };
const IN_THE_DOORWAY = { x: BEFORE_THE_DOORWAY.x, z: ON_THE_STEP };
const ON_THE_DOORSTEP = { x: DOOR_STAND.x, z: ON_THE_STEP };

export const HOUSE_KEY_INSERT = 0.026;
export const HAUSTUER_WIDE = 1.65;
const PULLED = 0.4;

export const walkLeg = (walk: Walk, t: number, settle = true): Root => {
  const { x, z, yaw } = walkFacing(walk, t, FACING_THE_WALL, settle);
  return { x, z, yaw, y: stepLift(z, ...ONTO_THE_STEP) };
};

const shuffle = (t: number, span: readonly [number, number], from: Stand, to: Stand): Root => {
  const k = inWindow(t, span);
  const z = from.z + (to.z - from.z) * k;
  return { x: from.x + (to.x - from.x) * k, z, yaw: FACING_THE_WALL, y: stepLift(z, ...ONTO_THE_STEP) };
};

export const squareAt =
  (stand: Stand, facing = FACING_THE_WALL) =>
  (s: Step): Step =>
    facing === FACING_THE_WALL
      ? { ...s, at: { x: stand.x - s.side * STANCE, z: stand.z } }
      : { ...s, at: { x: stand.x + s.side * STANCE * Math.cos(facing), z: stand.z - s.side * STANCE * Math.sin(facing) } };

export const pinEnd = (steps: readonly Step[], stands: readonly Stand[], facing = FACING_THE_WALL): Step[] =>
  steps.map((s, i) => {
    const k = i - (steps.length - stands.length);
    return k < 0 ? s : squareAt(stands[k], facing)(s);
  });

export const pinStart = (steps: readonly Step[], stands: readonly Stand[], facing = FACING_THE_WALL): Step[] =>
  steps.map((s, i) => (i < stands.length ? squareAt(stands[i], facing)(s) : s));

export const pinApproach = (steps: readonly Step[]): Step[] =>
  pinEnd(steps, [{ x: DOOR_STAND.x, z: ON_THE_PAVEMENT }, ON_THE_DOORSTEP, ON_THE_DOORSTEP]);

const CYLINDER = new Vector3(...fittingsOf(HAUSTUER).faces.find((f) => f.kind === "cylinder" && f.out > 0)!.center);

export const outerCylinderAt = (angle: number) => CYLINDER.clone().applyMatrix4(doorFrame(HAUSTUER, angle));

export const enterHouse = (unlock: number) => {
  const UNLOCK = [unlock, unlock + 1.05] as const;
  const IN = [UNLOCK[1], UNLOCK[1] + 1.4] as const;
  const BACK_STEP: readonly [number, number] = [UNLOCK[0] + 0.6, UNLOCK[1] + 0.15];
  const ROUND_THE_LEAF: readonly [number, number] = [IN[0] + 0.5, IN[0] + 1.9];
  const IN_WALK: readonly [number, number] = [ROUND_THE_LEAF[1], IN[0] + 4.4];
  const WALKING_IN: readonly [number, number] = [ROUND_THE_LEAF[0], IN_WALK[1]];
  const THROUGH_THE_DOORWAY: readonly [number, number] = [ROUND_THE_LEAF[0] + 0.5, IN_WALK[1] + 0.3];
  const INDOORS: readonly [number, number] = [BACK_STEP[1] + 1.2, BACK_STEP[1] + 2.0];

  const walkIn: Walk = {
    from: IN_WALK[0],
    to: IN_WALK[1] - 0.3,
    via: [
      [BEFORE_THE_DOORWAY.x, BEFORE_THE_DOORWAY.z],
      [BEFORE_THE_DOORWAY.x, -2.6],
      [-1.8, -3.4],
      [INSIDE.x, INSIDE.z],
    ],
  };

  const rootAt = (t: number): Root | null => {
    if (t >= IN_WALK[0]) return walkLeg(walkIn, t, false);
    if (t >= ROUND_THE_LEAF[0]) return shuffle(t, ROUND_THE_LEAF, BACK_STAND, BEFORE_THE_DOORWAY);
    if (t >= BACK_STEP[0]) return shuffle(t, BACK_STEP, DOOR_STAND, BACK_STAND);
    return null;
  };

  const stepBack = (first: Side): Step[] => {
    const [from, to] = BACK_STEP;
    const half = (from + to) / 2;
    return [
      { side: first, lift: from, land: half + STEP_OVERLAP / 2 },
      { side: opposite(first), lift: half - STEP_OVERLAP / 2, land: to },
    ].map(squareAt(BACK_STAND));
  };

  const steps = (first: Side, cadence: (t: number) => number): Step[] => {
    const back = stepBack(first);
    const round = pinEnd(
      rhythmicSteps({ from: ROUND_THE_LEAF[0], to: ROUND_THE_LEAF[1], first: opposite(back[back.length - 1].side), cadence, overlap: STEP_OVERLAP }),
      [BEFORE_THE_DOORWAY, BEFORE_THE_DOORWAY],
    );
    const inside = pinStart(
      rhythmicSteps({ from: IN_WALK[0], to: IN_WALK[1], first: opposite(round[round.length - 1].side), cadence, overlap: STEP_OVERLAP }),
      [IN_THE_DOORWAY],
    );
    return [...back, ...round, ...inside];
  };

  const INSERTED = UNLOCK[0] + KEY_APPROACH;
  const TURN: readonly [number, number] = [INSERTED + 0.05, BACK_STEP[0]];
  const TURN_BACK: readonly [number, number] = [BACK_STEP[1] - 0.4, BACK_STEP[1]];
  const KEY_OUT: readonly [number, number] = [BACK_STEP[1], BACK_STEP[1] + 0.15];
  const SWUNG = BACK_STEP[1] + coastTime(BACK_STEP, PULLED, HAUSTUER_WIDE);
  const DOOR_SHUT = closerEnd(SWUNG);

  const haustuerAt = (t: number) =>
    t < SWUNG ? pulledThenCoasting(t, BACK_STEP, PULLED, HAUSTUER_WIDE) : closerSwing(t, SWUNG, HAUSTUER_WIDE);

  const keyDepth = (t: number) => keyDepthAt(t, [UNLOCK[0], INSERTED], KEY_OUT, HOUSE_KEY_INSERT);
  const keyTurn = (t: number) => kf(t, [TURN[0], TURN[1], TURN_BACK[0], TURN_BACK[1]], [0, Math.PI, Math.PI, 0]);
  const houseKeyInLock = (t: number) => keyInLock(doorFrame(HAUSTUER, haustuerAt(t)), CYLINDER, "house", keyDepth(t), keyTurn(t));
  const leftHandAt = (t: number) => keyBowGrip(houseKeyInLock(Math.min(t, KEY_OUT[1])), "house", KEY_GRIP);

  const hold: Hold = {
    name: "his house key, turned to pull the Haustür open",
    arm: "leftArm",
    reach: UNLOCK[0] - 0.4,
    grip: UNLOCK[0],
    release: KEY_OUT[1],
    done: KEY_OUT[1] + 0.3,
    target: (t) => gripSolid(HAUSTUER, haustuerAt(t), "outer"),
    near: leftHandAt,
    exact: true,
  };

  return {
    unlock: UNLOCK,
    in: IN,
    backStep: BACK_STEP,
    roundTheLeaf: ROUND_THE_LEAF,
    inWalk: IN_WALK,
    walkingIn: WALKING_IN,
    throughTheDoorway: THROUGH_THE_DOORWAY,
    rootAt,
    steps,
    haustuerAt,
    houseKeyInLock,
    hold,
    keysInLock: [UNLOCK[0], KEY_OUT[1]] as const,
    sounds: { keyIn: INSERTED, unlocked: TURN[1], opens: BACK_STEP[0], keyOut: KEY_OUT[0], shut: DOOR_SHUT },
    doorShut: DOOR_SHUT,
    tuckedAt: (t: number) =>
      kf(t, [THROUGH_THE_DOORWAY[0], THROUGH_THE_DOORWAY[0] + 0.3, THROUGH_THE_DOORWAY[1] - 0.3, THROUGH_THE_DOORWAY[1]], [0, 1, 1, 0]),
    indoors: INDOORS,
    indoorsAt: (t: number) => inWindow(t, INDOORS),
  };
};

export type Entry = ReturnType<typeof enterHouse>;
