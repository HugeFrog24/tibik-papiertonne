import { Vector3 } from "three";
import { kf } from "../characters/animate";
import { STEP_OVERLAP, opposite, rhythmicSteps, type Step } from "../characters/gait";
import { inWindow, round6 } from "../characters/scalar";
import type { Side } from "../characters/skeleton";
import { walkFacing, type Walk } from "../characters/walkPath";
import { coastTime, doorFrame, fittingsOf, gripSolid, pulledThenCoasting } from "../building/doors";
import { CORE, DOOR_STEP, EG_FIRST_RISER, LANE_SPLIT, stepLift } from "../building/stairwell";
import type { Hold } from "../physics/holds";
import { KEY_APPROACH, KEY_GRIP, keyBowGrip, keyDepthAt, keyInLock } from "../props/keyRingShape";
import { FACADE_THICKNESS, HAUSTUER, closerEnd, closerSwing } from "../street/facade";
import { FACADE_Z } from "../street/building";

export type Stand = { readonly x: number; readonly z: number };
export type Root = { readonly x: number; readonly z: number; readonly yaw: number; readonly y: number };

export const FACING_THE_WALL = Math.PI;
const STANCE = 0.17;

export const DOOR_STAND: Stand = { x: -1.25, z: -1.7 };
export const ON_THE_PAVEMENT = -1.42;
const ONTO_THE_STEP = [round6(ON_THE_PAVEMENT - DOOR_STEP.z1), round6(ON_THE_PAVEMENT - DOOR_STAND.z)] as const;
const AT_THE_LOCK = { lean: 0.2, flex: 0.03, rise: 0.5 };
const ON_THE_STEP = DOOR_STAND.z - 0.05;
export const STAIR_SIDE = CORE.x0;
export const BALUSTRADE_SIDE = LANE_SPLIT;
const AT_THE_STAIRS = { x: (STAIR_SIDE + BALUSTRADE_SIDE) / 2, z: EG_FIRST_RISER + 0.35 };
const INTO_THE_LANE = 0.75;
const HANDS_TO_REST = 0.2;
const STRAIGHT_IN = 1.5;
const TOWARD_THE_STAIRS = 0.4;
const BACK_STAND = { x: -1.15, z: ON_THE_PAVEMENT };
const CLEAR_OF_THE_LEAF = 1.8;
const FURTHER_BACK = (() => {
  const [hx, , hz] = HAUSTUER.hinge;
  const across = BACK_STAND.x - hx;
  return { x: BACK_STAND.x, z: round6(hz + Math.sqrt(CLEAR_OF_THE_LEAF ** 2 - across ** 2)) };
})();
const BEFORE_THE_DOORWAY = { x: -1.875, z: ON_THE_PAVEMENT };
const IN_THE_DOORWAY = { x: BEFORE_THE_DOORWAY.x, z: round6(DOOR_STEP.z1 - 0.13) };
const ON_THE_DOORSTEP = { x: DOOR_STAND.x, z: ON_THE_STEP };

export const HOUSE_KEY_INSERT = 0.026;
export const HAUSTUER_WIDE = 1.65;
const PULLED = 0.4;
export const SIDLE = { twist: -0.95, look: 0.8, swing: 0.3, turning: 0.35, clear: 0.3 };

export const sidleThrough = ([from, to]: readonly [number, number], side: Side) => (t: number) => {
  const w = kf(t, [from, from + SIDLE.turning, to, to + SIDLE.turning], [0, 1, 1, 0]);
  return { twist: side * SIDLE.twist * w, headYaw: -side * SIDLE.twist * SIDLE.look * w, swing: 1 - (1 - SIDLE.swing) * w };
};
const INNER_FACE = FACADE_Z - FACADE_THICKNESS;
const SECOND_STEP_TAKES = 0.45;

export const walkLeg = (walk: Walk, t: number, settle = true): Root => {
  const { x, z, yaw } = walkFacing(walk, t, FACING_THE_WALL, settle);
  return { x, z, yaw, y: stepLift(z, ...ONTO_THE_STEP) };
};

export const shuffle = (t: number, span: readonly [number, number], from: Stand, to: Stand): Root => {
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

export type ShuffleTiming = { readonly every: number; readonly takes: number; readonly way: readonly number[] };

export const SHUFFLE: ShuffleTiming = { every: 0.18, takes: 0.14, way: [0.35, 1, 1] };

export const shuffleSpan = (start: number, timing = SHUFFLE): readonly [number, number] => [
  start,
  round6(start + (timing.way.length - 1) * timing.every + timing.takes),
];

export const shuffleSteps = (start: number, from: Stand, to: Stand, first: Side, facing = FACING_THE_WALL, timing = SHUFFLE): Step[] =>
  timing.way.map((k, i) => {
    const lift = start + i * timing.every;
    const stand = { x: from.x + (to.x - from.x) * k, z: from.z + (to.z - from.z) * k };
    return squareAt(stand, facing)({ side: i % 2 === 0 ? first : opposite(first), lift, land: lift + timing.takes });
  });

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
  const KEY_OUT: readonly [number, number] = [BACK_STEP[1], BACK_STEP[1] + 0.15];
  const SECOND_STEP: readonly [number, number] = [KEY_OUT[0], round6(KEY_OUT[0] + SECOND_STEP_TAKES)];
  const ROUND_THE_LEAF: readonly [number, number] = [Math.max(IN[0] + 0.5, SECOND_STEP[1]), IN[0] + 1.9];
  const IN_WALK: readonly [number, number] = [ROUND_THE_LEAF[1], IN[0] + 4.4];
  const INDOORS: readonly [number, number] = [BACK_STEP[1] + 1.2, BACK_STEP[1] + 2.0];

  const walkIn: Walk = {
    from: IN_WALK[0],
    to: IN_WALK[1] - 0.3,
    via: [
      [BEFORE_THE_DOORWAY.x, BEFORE_THE_DOORWAY.z],
      [BEFORE_THE_DOORWAY.x, INNER_FACE - STRAIGHT_IN],
      [AT_THE_STAIRS.x, AT_THE_STAIRS.z + INTO_THE_LANE],
      [AT_THE_STAIRS.x, AT_THE_STAIRS.z],
    ],
  };

  const pastTheReveal = (() => {
    let [lo, hi] = IN_WALK;
    while (hi - lo > 1e-4) {
      const mid = (lo + hi) / 2;
      if (walkLeg(walkIn, mid, false).z <= INNER_FACE - SIDLE.clear) hi = mid;
      else lo = mid;
    }
    return hi;
  })();
  const SIDLING = [ROUND_THE_LEAF[0] + 0.5, pastTheReveal] as const;
  const WALKING_IN: readonly [number, number] = [ROUND_THE_LEAF[0], pastTheReveal + HANDS_TO_REST];

  const rootAt = (t: number): Root | null => {
    if (t >= IN_WALK[0]) {
      const leg = walkLeg(walkIn, t, false);
      const off = Math.atan2(Math.sin(leg.yaw - FACING_THE_WALL), Math.cos(leg.yaw - FACING_THE_WALL));
      return { ...leg, yaw: FACING_THE_WALL + off * TOWARD_THE_STAIRS };
    }
    if (t >= ROUND_THE_LEAF[0]) return shuffle(t, ROUND_THE_LEAF, FURTHER_BACK, BEFORE_THE_DOORWAY);
    if (t >= SECOND_STEP[0]) return shuffle(t, SECOND_STEP, BACK_STAND, FURTHER_BACK);
    if (t >= BACK_STEP[0]) return shuffle(t, BACK_STEP, DOOR_STAND, BACK_STAND);
    return null;
  };

  const twoStepsTo = ([from, to]: readonly [number, number], stand: Stand, first: Side): Step[] => {
    const half = (from + to) / 2;
    return [
      { side: first, lift: from, land: half },
      { side: opposite(first), lift: half, land: to },
    ].map(squareAt(stand));
  };

  const steps = (first: Side, cadence: (t: number) => number): Step[] => {
    const firstBack = twoStepsTo(BACK_STEP, BACK_STAND, first);
    const back = [...firstBack, ...twoStepsTo(SECOND_STEP, FURTHER_BACK, opposite(firstBack[1].side))];
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
    rootAt,
    steps,
    haustuerAt,
    houseKeyInLock,
    hold,
    keysInLock: [UNLOCK[0], KEY_OUT[1]] as const,
    sounds: { keyIn: INSERTED, unlocked: TURN[1], opens: BACK_STEP[0], keyOut: KEY_OUT[0], shut: DOOR_SHUT },
    doorShut: DOOR_SHUT,
    leanAt: (t: number) => AT_THE_LOCK.lean * kf(t, [hold.reach, UNLOCK[0], KEY_OUT[1], KEY_OUT[1] + AT_THE_LOCK.rise], [0, 1, 1, 0]),
    flexAt: (t: number) => AT_THE_LOCK.flex * kf(t, [hold.reach, UNLOCK[0], KEY_OUT[1], KEY_OUT[1] + AT_THE_LOCK.rise], [0, 1, 1, 0]),
    sidling: SIDLING,
    sidleAt: sidleThrough(SIDLING, 1),
    indoors: INDOORS,
    indoorsAt: (t: number) => inWindow(t, INDOORS),
  };
};

export type Entry = ReturnType<typeof enterHouse>;
