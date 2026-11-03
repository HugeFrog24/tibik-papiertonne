import { Euler, Quaternion, Vector3 } from "three";
import {
  armColliders,
  armIntoTorso,
  carriedBox,
  handPosition,
  torsoMatrix,
  type ArmName,
  type ArmPose,
} from "../characters/skeleton";
import { frame, pointIn, contacts, deepest, nearby, sphereObbGap, type Obb, type Solid, type Sphere } from "./collision";
import { guardCarried, guardLean, type Bounds, type Carried, type Character } from "./guards";

const ARM_LIMITS: Record<keyof ArmPose, [number, number]> = {
  raise: [-0.6, 3.0],
  out: [-0.3, 1.6],
  elbow: [0, 2.4],
  inward: [-0.5, 1.6],
};

export const armLimb = (spheres: readonly Sphere[]) => {
  const hand = spheres[spheres.length - 1];
  return spheres.filter((s) => s !== hand && s.center.distanceTo(hand.center) > hand.radius + 0.05);
};

const withArm = <C extends Character>(c: C, which: ArmName, arm: ArmPose): C => ({
  ...c,
  pose: { ...c.pose, [which]: arm },
});

export type Touch = { readonly touch: Obb; readonly near: Vector3 };

export const reachArm = <C extends Character>(
  c: C,
  which: ArmName,
  target: Vector3 | Touch,
  solids: readonly Solid[],
  held: Obb | null,
  extraStarts: readonly ArmPose[] = [],
): C => {
  const { upperArm, forearm, hand } = c.skeleton;
  const shoulder = armColliders(c.skeleton, c, which)[0].center;
  const length = upperArm.length + Math.max(forearm.length, hand.offset) + Math.max(upperArm.radius, forearm.radius, ...hand.size);
  const reachable = nearby(solids, shoulder, length);
  const authored = c.pose[which];
  const keys = Object.keys(ARM_LIMITS) as (keyof ArmPose)[];
  const cost = (arm: ArmPose) => {
    const placed = withArm(c, which, arm);
    const spheres = armColliders(c.skeleton, placed, which);
    const limb = armLimb(spheres);
    const hit = Math.max(
      deepest(contacts(spheres, reachable)),
      held ? deepest(contacts(limb, [held])) : 0,
      armIntoTorso(c.skeleton, placed.pose, which),
    );
    const drift = keys.reduce((sum, key) => sum + Math.abs(arm[key] - authored[key]), 0);
    const hand = spheres[spheres.length - 1];
    const miss =
      target instanceof Vector3
        ? hand.center.distanceTo(target)
        : Math.abs(sphereObbGap(hand, target.touch)) + 0.1 * hand.center.distanceTo(target.near);
    return miss + 40 * hit + 0.002 * drift;
  };

  const descend = (start: ArmPose) => {
    let arm = start;
    let best = cost(arm);
    for (let step = 0.3; step > 0.003; step /= 2) {
      for (let improved = true, rounds = 0; improved && rounds < 12; rounds++) {
        improved = false;
        for (const key of keys) {
          for (const dir of [1, -1]) {
            const [min, max] = ARM_LIMITS[key];
            const value = Math.min(max, Math.max(min, arm[key] + dir * step));
            const candidate = { ...arm, [key]: value };
            const score = cost(candidate);
            if (score < best - 1e-6) {
              arm = candidate;
              best = score;
              improved = true;
            }
          }
        }
      }
    }
    return { arm, best };
  };

  const fromAuthored = descend(authored);
  if (fromAuthored.best < 0.004) {
    return withArm(c, which, fromAuthored.arm);
  }
  const results = [fromAuthored, ...[...REACH_STARTS, ...extraStarts].map(descend)];
  results.sort((a, b) => a.best - b.best);
  return withArm(c, which, results[0].arm);
};

const REACH_STARTS: ArmPose[] = [
  { raise: 1.5, out: 0.1, elbow: 0.3, inward: 0.2 },
  { raise: 1.1, out: 0.2, elbow: 0.6, inward: 0.4 },
  { raise: 1.9, out: 0.1, elbow: 0.9, inward: 0.3 },
];

const HOLDING_ARMS: ArmName[] = ["leftArm", "rightArm"];

const gripTargets = <T extends Carried>(c: Character, item: T, bounds: Bounds, sideGrip: number) => {
  const box = frame(torsoMatrix(c.skeleton, c), item.position, new Euler(...item.rotation));
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
};

const worldToTorso = (c: Character, delta: Vector3) => {
  const rotation = new Quaternion();
  torsoMatrix(c.skeleton, c).decompose(new Vector3(), rotation, new Vector3());
  return delta.clone().applyQuaternion(rotation.invert());
};

export const holdCarried = <C extends Character, T extends Carried>(
  c: C,
  item: T,
  boundsOf: (item: T) => Bounds,
  solids: readonly Solid[],
  { sideGrip, movable }: HoldOptions,
): { readonly character: C; readonly item: T } => {
  let current = item;
  let character = c;
  for (let pass = 0; pass < 3; pass++) {
    if (movable) {
      current = guardCarried(character, current, boundsOf, solids);
    }
    const bounds = boundsOf(current);
    const held = carriedBox(c.skeleton, character, current.position, current.rotation, bounds.size, bounds.center);
    const targets = gripTargets(character, current, bounds, sideGrip);
    for (const which of HOLDING_ARMS) {
      character = reachArm(character, which, targets[which], solids, held);
    }
    const miss = new Vector3();
    for (const which of HOLDING_ARMS) {
      miss.add(handPosition(c.skeleton, character, which).sub(targets[which]));
    }
    miss.divideScalar(HOLDING_ARMS.length);
    if (!movable || miss.length() < 0.005) {
      break;
    }
    const local = worldToTorso(character, miss);
    current = {
      ...current,
      position: [current.position[0] + local.x, current.position[1] + local.y, current.position[2] + local.z],
    };
  }
  const bounds = boundsOf(current);
  const held = carriedBox(c.skeleton, character, current.position, current.rotation, bounds.size, bounds.center);
  return { character: guardLean(character, [held]), item: current };
};

export const gripGaps = <T extends Carried>(c: Character, item: T, bounds: Bounds) => {
  const held = carriedBox(c.skeleton, c, item.position, item.rotation, bounds.size, bounds.center);
  return HOLDING_ARMS.map((which) => {
    const spheres = armColliders(c.skeleton, c, which);
    return { which, gap: sphereObbGap(spheres[spheres.length - 1], held) };
  });
};

