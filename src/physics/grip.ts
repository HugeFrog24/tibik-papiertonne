import { Euler, Vector3 } from "three";
import { ARM_KEYS, armDistance, descendArm, pushClear, trackArm } from "./armDescent";
import { FINAL_ARM, lastArm, type ArmClock } from "./armHistory";
import { relaxed, type Relaxing } from "./spring";
import { FPS } from "../frameRate";
import type { Vec3 } from "../toon/primitives";
import {
  armColliders,
  armIntoTorso,
  handPosition,
  handSphere,
  torsoMatrix,
  type ArmName,
  type ArmPose,
} from "../characters/skeleton";
import {
  frame,
  pointIn,
  contacts,
  deepest,
  nearby,
  sphereObbGap,
  type Contact,
  type Obb,
  type Solid,
  type Sphere,
} from "./collision";
import {
  guardCarried,
  heldBoxOf,
  shifted,
  guardLean,
  type Bounds,
  type Carried,
  type Character,
  withArm,
  worldToTorso,
} from "./guards";

export const OVERHEAD = Math.PI / 2 + 0.3;

const overheadDip = (arm: ArmPose, spheres: readonly Sphere[], up: Vector3) =>
  arm.raise > OVERHEAD
    ? Math.max(0, spheres[0].center.clone().sub(spheres[spheres.length - 1].center).dot(up))
    : 0;

export const armLimb = (spheres: readonly Sphere[]) => {
  const hand = spheres[spheres.length - 1];
  return spheres.filter(
    (s) => s !== hand && s.center.distanceTo(hand.center) > hand.radius + 0.05,
  );
};

export type Touch = { readonly touch: Obb; readonly near: Vector3 };

export type Goal = Vector3 | Touch;

export type Aim = { readonly goal: Goal; readonly weight: number };

const isAims = (target: Goal | readonly Aim[]): target is readonly Aim[] => Array.isArray(target);
const aimsOf = (target: Goal | readonly Aim[]): readonly Aim[] => (isAims(target) ? target : [{ goal: target, weight: 1 }]);

export const TRACKED = { hit: 40, drift: 0.02, steady: 0.05, settled: 0.005 };

export type ReachOptions = {
  readonly starts?: readonly ArmPose[];
  readonly authoredOnly?: boolean;
  readonly lastFrame?: ArmPose | undefined;
  readonly keepTracking?: boolean | undefined;
};

export const reachArm = <C extends Character>(
  c: C,
  which: ArmName,
  target: Goal | readonly Aim[],
  solids: readonly Solid[],
  held: Obb | null,
  { starts = [], authoredOnly = false, lastFrame, keepTracking = false }: ReachOptions = {},
): C => {
  const { upperArm, forearm, hand } = c.skeleton;
  const shoulder = armColliders(c.skeleton, c, which)[0].center;
  const length =
    upperArm.length +
    Math.max(forearm.length, hand.offset) +
    Math.max(upperArm.radius, forearm.radius, ...hand.size);
  const reachable = nearby(solids, shoulder, length);
  const authored = c.pose[which];
  const up = new Vector3(0, 1, 0).transformDirection(torsoMatrix(c.skeleton, c));
  const aims = aimsOf(target);
  const placedArm = (arm: ArmPose) => {
    const placed = withArm(c, which, arm);
    const spheres = armColliders(c.skeleton, placed, which);
    const depths = [
      ...reachable.map((solid) => deepest(contacts(spheres, [solid]))),
      held ? deepest(contacts(armLimb(spheres), [held])) : 0,
      armIntoTorso(c.skeleton, placed.pose, which),
      overheadDip(arm, spheres, up),
    ];
    return { hand: spheres[spheres.length - 1], depths, hit: Math.max(...depths) };
  };
  const missAt = (hand: Sphere) => {
    const missOf = (goal: Goal) =>
      goal instanceof Vector3
        ? hand.center.distanceTo(goal)
        : Math.abs(sphereObbGap(hand, goal.touch)) + 0.1 * hand.center.distanceTo(goal.near);
    return Math.sqrt(aims.reduce((sum, { goal, weight }) => sum + weight * missOf(goal) ** 2, 0));
  };
  const cost = (arm: ArmPose) => {
    const { hand, hit } = placedArm(arm);
    return missAt(hand) + 40 * hit + 0.002 * armDistance(arm, authored);
  };
  const residuals = (
    arm: ArmPose,
    { steadyFrom, steady = TRACKED.steady, drift = TRACKED.drift }: { readonly steadyFrom?: ArmPose; readonly steady?: number; readonly drift?: number } = {},
  ) => {
    const { hand, depths } = placedArm(arm);
    const missOf = (goal: Goal) =>
      goal instanceof Vector3
        ? hand.center.clone().sub(goal).toArray()
        : [sphereObbGap(hand, goal.touch), ...hand.center.clone().sub(goal.near).multiplyScalar(0.1).toArray()];
    return [
      ...aims.flatMap(({ goal, weight }) => missOf(goal).map((v) => Math.sqrt(weight) * v)),
      ...depths.map((d) => TRACKED.hit * d),
      ...ARM_KEYS.map((key) => drift * (arm[key] - authored[key])),
      ...(steadyFrom ? ARM_KEYS.map((key) => steady * (arm[key] - steadyFrom[key])) : []),
    ];
  };
  let tracked: { readonly arm: ArmPose; readonly miss: number } | undefined;
  if (lastFrame) {
    const steadied = trackArm(lastFrame, (arm) => residuals(arm, { steadyFrom: lastFrame }));
    const arm = pushClear(trackArm(steadied, (arm) => residuals(arm, { steadyFrom: steadied, steady: TRACKED.settled, drift: 0 })), (a) => placedArm(a).depths);
    const p = placedArm(arm);
    const before = placedArm(lastFrame);
    const stuck = before.hit <= 0 && missAt(before.hand) > REACHED && missAt(p.hand) >= missAt(before.hand) - AS_GOOD / 2;
    if (stuck) tracked = { arm: lastFrame, miss: missAt(before.hand) };
    else if (p.hit <= 0) tracked = { arm, miss: missAt(p.hand) };
    if (tracked && (tracked.miss < REACHED || keepTracking)) return withArm(c, which, tracked.arm);
  }

  const descend = (start: ArmPose) => descendArm(start, cost);
  const fromAuthored = descend(authored);
  const results = authoredOnly || fromAuthored.best < REACHED ? [fromAuthored] : [fromAuthored, ...[...REACH_STARTS, ...starts].map(descend)];
  const best = results.reduce((a, b) => (b.best < a.best ? b : a));
  const cold = pushClear(trackArm(best.arm, (arm) => residuals(arm)), (a) => placedArm(a).depths);
  const coldMiss = missAt(placedArm(cold).hand);
  return withArm(c, which, tracked && !worthSwitching(tracked.miss, coldMiss) ? tracked.arm : cold);
};

const REACHED = 0.004;
const AS_GOOD = 0.001;
const ON_TARGET = 0.01;

const worthSwitching = (tracked: number, cold: number) => cold < tracked - AS_GOOD && (cold <= ON_TARGET || cold < tracked / 2);

const REACH_STARTS: ArmPose[] = [
  { raise: 1.5, out: 0.1, elbow: 0.3, inward: 0.2 },
  { raise: 1.1, out: 0.2, elbow: 0.6, inward: 0.4 },
  { raise: 1.9, out: 0.1, elbow: 0.9, inward: 0.3 },
];

const HOLDING_ARMS: ArmName[] = ["leftArm", "rightArm"];


const gripTargets = (
  c: Character,
  item: Carried,
  bounds: Bounds,
  sideGrip: number,
) => {
  const box = frame(
    torsoMatrix(c.skeleton, c),
    item.position,
    new Euler(...item.rotation),
  );
  const r = Math.max(...c.skeleton.hand.size) * 0.8;
  const [cx, cy, cz] = bounds.center;
  const [sx, sy] = bounds.size;
  const at = (side: 1 | -1) =>
    pointIn(box, [
      cx + side * (sx / 2 - r + 2 * r * sideGrip),
      cy + (sy / 2 + r * 0.5) * (1 - sideGrip),
      cz,
    ]);
  return { leftArm: at(1), rightArm: at(-1) };
};

export type HoldOptions = {
  readonly sideGrip: number;
  readonly movable: boolean;
  readonly carrying?: boolean;
  readonly clock?: ArmClock | undefined;
};

export const CARRY_HALF_LIFE = 0.1;
const CARRIED_OFFSET = "carried item offset";
const CARRIED_ON: ArmName = "leftArm";
const STILL: Relaxing = { offset: [0, 0, 0], speed: [0, 0, 0] };


const reachHands = <C extends Character>(
  c: C,
  item: Carried,
  bounds: Bounds,
  solids: readonly Solid[],
  sideGrip: number,
  lastFrame: Partial<Record<ArmName, ArmPose>> = {},
) => {
  const held = heldBoxOf(c, item, bounds);
  const targets = gripTargets(c, item, bounds, sideGrip);
  let character = c;
  for (const which of HOLDING_ARMS) {
    character = reachArm(character, which, targets[which], solids, held, { lastFrame: lastFrame[which], keepTracking: true });
  }
  return { character, targets };
};

export const holdCarried = <C extends Character, T extends Carried>(
  c: C,
  item: T,
  boundsOf: (item: T) => Bounds,
  solids: readonly Solid[],
  { sideGrip, movable, carrying = false, clock }: HoldOptions,
): { readonly character: C; readonly item: T } => {
  const lastFrame = Object.fromEntries(HOLDING_ARMS.map((which) => [which, lastArm(clock, which)]));
  const before = clock?.history?.before(clock.at, CARRIED_ON, CARRIED_OFFSET, -Infinity) as Relaxing | undefined;
  const eased = before ? relaxed(before, 1 / FPS, CARRY_HALF_LIFE) : STILL;
  let current = movable ? shifted(item, eased.offset) : item;
  let character = c;
  let settled = false;
  for (let pass = 0; pass < 3; pass++) {
    if (movable) {
      current = guardCarried(character, current, boundsOf, solids);
    }
    const reached = reachHands(
      character,
      current,
      boundsOf(current),
      solids,
      sideGrip,
      lastFrame,
    );
    character = reached.character;
    const targets = reached.targets;
    const miss = new Vector3();
    for (const which of HOLDING_ARMS) {
      miss.add(handPosition(c.skeleton, character, which).sub(targets[which]));
    }
    miss.divideScalar(HOLDING_ARMS.length);
    if (!movable || miss.length() < 0.005) {
      settled = true;
      break;
    }
    const local = worldToTorso(character, miss);
    current = {
      ...current,
      position: [
        current.position[0] + local.x,
        current.position[1] + local.y,
        current.position[2] + local.z,
      ],
    };
  }
  if (!settled) {
    current = guardCarried(character, current, boundsOf, solids);
    character = reachHands(
      character,
      current,
      boundsOf(current),
      solids,
      sideGrip,
      lastFrame,
    ).character;
  }
  for (const which of HOLDING_ARMS) clock?.history?.remember(clock.at, which, FINAL_ARM, character.pose[which]);
  if (movable) {
    const offset = current.position.map((v, i) => v - item.position[i]) as unknown as Vec3;
    clock?.history?.remember(clock.at, CARRIED_ON, CARRIED_OFFSET, carrying ? { offset, speed: eased.speed } : eased);
  }
  const held = heldBoxOf(character, current, boundsOf(current));
  return { character: guardLean(character, [held]), item: current };
};

export const gripGapViolations = (
  c: Character,
  item: Carried,
  bounds: Bounds,
): Contact[] =>
  gripGaps(c, item, bounds)
    .filter(({ gap }) => gap > 0)
    .map(({ which, gap }) => ({
      a: "carried box",
      b: `${which === "leftArm" ? "left" : "right"} hand (not touching it)`,
      depth: gap,
      normal: new Vector3(),
    }));

export const gripGaps = (
  c: Character,
  item: Carried,
  bounds: Bounds,
) => {
  const held = heldBoxOf(c, item, bounds);
  return HOLDING_ARMS.map((which) => {
    return { which, gap: sphereObbGap(handSphere(c.skeleton, c, which), held) };
  });
};
