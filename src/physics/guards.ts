import { Vector3 } from "three";
import { ARM_KEYS, armDistance, clampArm, offsetArm, pushClear, trackArm } from "./armDescent";
import {
  armColliders,
  armIntoTorso,
  allColliders,
  bodyColliders,
  boxIntoTorso,
  carriedBox,
  type ArmName,
  type ArmPose,
  type Placement,
  type Pose,
  type Skeleton,
} from "../characters/skeleton";
import type { Vec3 } from "../toon/primitives";
import {
  contacts,
  deepest,
  nearby,
  smallestClearing,
  type Contact,
  type Solid,
} from "./collision";

export type Character = { readonly skeleton: Skeleton } & Placement;

const withPose = <C extends Character>(c: C, pose: Pose): C => ({ ...c, pose });

export const withArm = <C extends Character>(c: C, which: ArmName, arm: ArmPose): C => withPose(c, { ...c.pose, [which]: arm });

const GROUND_PASSES = 8;
const UPWARD = 0.7;

const liftOut = (found: readonly Contact[]) =>
  found.reduce((lift, c) => (c.normal.y > UPWARD ? Math.max(lift, c.depth / c.normal.y) : lift), 0);

export const guardGround = <C extends Character>(c: C, ground: Solid | readonly Solid[]): C => {
  const solids = Array.isArray(ground) ? ground : [ground as Solid];
  if (!c.tilt) {
    const sink = deepest(contacts(bodyColliders(c.skeleton, c).legs, solids));
    return sink > 0 ? withPose(c, { ...c.pose, bob: c.pose.bob + sink }) : c;
  }
  let current = c;
  for (let pass = 0; pass < GROUND_PASSES; pass++) {
    const lift = liftOut(contacts(allColliders(current.skeleton, current), solids));
    if (lift <= 0) return current;
    current = withPose(current, { ...current.pose, bob: current.pose.bob + lift });
  }
  return current;
};

export const GUARD_REACH = 0.1;

export const guardBody = <C extends Character>(
  c: C,
  solids: readonly Solid[],
): C => {
  let current = c;
  const [x0, , z0] = c.position;
  for (let i = 0; i < 8; i++) {
    const body = bodyColliders(current.skeleton, current);
    const found = contacts([...body.legs, ...body.lowerTorso], solids);
    if (found.length === 0) {
      return current;
    }
    const push = new Vector3();
    for (const contact of found) {
      push.addScaledVector(contact.normal, contact.depth);
    }
    const [x, y, z] = current.position;
    const [nx, nz] = [x + push.x, z + push.z];
    const moved = Math.hypot(nx - x0, nz - z0);
    if (moved > GUARD_REACH) {
      const k = GUARD_REACH / moved;
      return { ...current, position: [x0 + (nx - x0) * k, y, z0 + (nz - z0) * k] };
    }
    current = { ...current, position: [nx, y, nz] };
  }
  return current;
};

export const guardLean = <C extends Character>(
  c: C,
  solids: readonly Solid[],
): C => {
  const scaled = (amount: number): Pose => ({
    ...c.pose,
    lean: c.pose.lean * (1 - amount),
    headPitch: c.pose.headPitch * (1 - amount),
  });
  const hits = (amount: number) => {
    const body = bodyColliders(c.skeleton, withPose(c, scaled(amount)));
    return deepest(contacts([...body.upperTorso, ...body.head], solids));
  };
  return withPose(c, scaled(smallestClearing(hits, 1)));
};

const ARM_ESCAPES: ((arm: ArmPose, amount: number) => ArmPose)[] = [
  (arm, amount) => ({ ...arm, raise: arm.raise + amount }),
  (arm, amount) => ({ ...arm, out: arm.out + amount }),
  (arm, amount) => ({
    ...arm,
    out: arm.out + amount * 0.6,
    inward: arm.inward - amount * 0.8,
  }),
  (arm, amount) => {
    const tuck = Math.min(amount, arm.out + 0.1);
    return { ...arm, out: arm.out - tuck, raise: arm.raise + (amount - tuck) };
  },
  (arm, amount) => ({
    ...arm,
    elbow: arm.elbow + amount,
    raise: arm.raise + amount * 0.5,
  }),
];

const armDepths = (c: Character, solids: readonly Solid[], which: ArmName) => {
  const reachable = nearby(
    solids,
    new Vector3(
      c.position[0],
      c.position[1] + c.skeleton.hipHeight,
      c.position[2],
    ),
    1.2,
  );
  return (moved: ArmPose) => {
    const placed = withArm(c, which, moved);
    const spheres = armColliders(c.skeleton, placed, which);
    return [armIntoTorso(c.skeleton, placed.pose, which), ...reachable.map((solid) => deepest(contacts(spheres, [solid])))];
  };
};


const armHits = (c: Character, solids: readonly Solid[], which: ArmName) => {
  const depths = armDepths(c, solids, which);
  return (moved: ArmPose) => Math.max(...depths(moved));
};

export const guardArm = <C extends Character>(
  c: C,
  solids: readonly Solid[],
  which: ArmName,
  lastFrame?: ArmPose,
): C => {
  const arm = c.pose[which];
  const hits = armHits(c, solids, which);
  if (hits(arm) <= 0) {
    return c;
  }
  const options = ARM_ESCAPES.map((escape) => {
    const amount = smallestClearing((a) => hits(escape(arm, a)), 1.5);
    const moved = escape(arm, amount);
    return { moved, amount, remaining: hits(moved) };
  });
  const away = (o: { readonly moved: ArmPose; readonly amount: number }) => (lastFrame ? armDistance(o.moved, lastFrame) : o.amount);
  options.sort((a, b) => a.remaining - b.remaining || away(a) - away(b));
  return withArm(c, which, options[0].moved);
};

export const SETTLE = { hit: 100, keep: 0.8 };

export const settleArm = <C extends Character>(
  c: C,
  solids: readonly Solid[],
  which: ArmName,
  lastFrame?: ArmPose,
  authoredBefore?: ArmPose,
): C => {
  const authored = c.pose[which];
  const wanted = clampArm(lastFrame && authoredBefore ? offsetArm(authored, authoredBefore, lastFrame, SETTLE.keep) : authored);
  const depths = armDepths(c, solids, which);
  const hits = (arm: ArmPose) => Math.max(...depths(arm));
  const placed = (arm: ArmPose) => withArm(c, which, arm);
  if (hits(wanted) <= 0) return placed(wanted);
  if (!lastFrame) return guardArm(c, solids, which);
  const settled = trackArm(lastFrame, (arm) => [...depths(arm).map((d) => SETTLE.hit * d), ...ARM_KEYS.map((key) => arm[key] - wanted[key])]);
  const pushed = pushClear(settled, depths);
  if (hits(pushed) <= 0) return placed(pushed);
  const nudged = pushClear(lastFrame, depths);
  if (hits(nudged) <= 0) return placed(nudged);
  return guardArm(placed(pushed), solids, which, lastFrame);
};

export type Carried = { readonly position: Vec3; readonly rotation: Vec3 };
export type Bounds = { readonly size: Vec3; readonly center: Vec3 };

export const guardCarried = <T extends Carried>(
  c: Character,
  item: T,
  boundsOf: (item: T) => Bounds,
  solids: readonly Solid[],
): T => {
  const head = bodyColliders(c.skeleton, c).head;
  const moved = (t: T, dz: number, dy: number): T => ({
    ...t,
    position: [t.position[0], t.position[1] + dy, t.position[2] + dz],
  });
  const collider = (t: T) => {
    const b = boundsOf(t);
    return carriedBox(c.skeleton, c, t.position, t.rotation, b.size, b.center);
  };
  const intoBody = (t: T) => {
    const box = collider(t);
    return Math.max(
      deepest(contacts(head, [box])),
      boxIntoTorso(c.skeleton, c, box),
    );
  };
  const intoWorld = (t: T) => deepest(contacts([collider(t)], solids));

  let current = item;
  for (let i = 0; i < 4 && intoBody(current) + intoWorld(current) > 0; i++) {
    current = moved(
      current,
      smallestClearing((dz) => intoBody(moved(current, dz, 0)), 0.5, 0.02),
      0,
    );
    current = moved(
      current,
      0,
      smallestClearing((dy) => intoWorld(moved(current, 0, dy)), 0.8, 0.02),
    );
  }
  return current;
};

export const characterViolations = (
  c: Character,
  solids: readonly Solid[],
): Contact[] => {
  const found = contacts(allColliders(c.skeleton, c), solids);
  for (const which of ["leftArm", "rightArm"] as const) {
    const depth = armIntoTorso(c.skeleton, c.pose, which);
    if (depth > 0) {
      found.push({
        a: which === "leftArm" ? "left arm" : "right arm",
        b: "own body",
        depth,
        normal: new Vector3(),
      });
    }
  }
  return found;
};
