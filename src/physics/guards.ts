import { Vector3 } from "three";
import {
  armColliders,
  armIntoTorso,
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
import { contacts, deepest, nearby, smallestClearing, type Contact, type Solid } from "./collision";

export type Character = { readonly skeleton: Skeleton } & Placement;

const withPose = <C extends Character>(c: C, pose: Pose): C => ({ ...c, pose });

export const guardGround = <C extends Character>(c: C, ground: Solid): C => {
  const sink = deepest(contacts(bodyColliders(c.skeleton, c).legs, [ground]));
  return sink > 0 ? withPose(c, { ...c.pose, bob: c.pose.bob + sink }) : c;
};

export const guardBody = <C extends Character>(c: C, solids: readonly Solid[]): C => {
  let current = c;
  for (let i = 0; i < 8; i++) {
    const body = bodyColliders(current.skeleton, current);
    const lower = body.torso.slice(0, Math.ceil(body.torso.length / 2));
    const found = contacts([...body.legs, ...lower], solids);
    if (found.length === 0) {
      return current;
    }
    const push = new Vector3();
    for (const contact of found) {
      push.addScaledVector(contact.normal, contact.depth);
    }
    push.y = 0;
    const [x, y, z] = current.position;
    current = { ...current, position: [x + push.x, y, z + push.z] };
  }
  return current;
};

export const guardLean = <C extends Character>(c: C, solids: readonly Solid[]): C => {
  const scaled = (amount: number): Pose => ({
    ...c.pose,
    lean: c.pose.lean * (1 - amount),
    headPitch: c.pose.headPitch * (1 - amount),
  });
  const hits = (amount: number) => {
    const body = bodyColliders(c.skeleton, withPose(c, scaled(amount)));
    const upper = body.torso.slice(Math.ceil(body.torso.length / 2));
    return deepest(contacts([...upper, ...body.head], solids));
  };
  return withPose(c, scaled(smallestClearing(hits, 1)));
};

const ARM_ESCAPES: ((arm: ArmPose, amount: number) => ArmPose)[] = [
  (arm, amount) => ({ ...arm, raise: arm.raise + amount }),
  (arm, amount) => ({ ...arm, out: arm.out + amount }),
  (arm, amount) => ({ ...arm, out: arm.out + amount * 0.6, inward: arm.inward - amount * 0.8 }),
  (arm, amount) => {
    const tuck = Math.min(amount, arm.out + 0.1);
    return { ...arm, out: arm.out - tuck, raise: arm.raise + (amount - tuck) };
  },
  (arm, amount) => ({ ...arm, elbow: arm.elbow + amount, raise: arm.raise + amount * 0.5 }),
];

export const guardArm = <C extends Character>(c: C, solids: readonly Solid[], which: ArmName): C => {
  const arm = c.pose[which];
  const reachable = nearby(solids, new Vector3(c.position[0], c.position[1] + c.skeleton.hipHeight, c.position[2]), 1.2);
  const hits = (moved: ArmPose) => {
    const pose = { ...c.pose, [which]: moved };
    const intoWorld = deepest(contacts(armColliders(c.skeleton, withPose(c, pose), which), reachable));
    return Math.max(intoWorld, armIntoTorso(c.skeleton, pose, which));
  };
  if (hits(arm) <= 0) {
    return c;
  }
  const options = ARM_ESCAPES.map((escape) => {
    const amount = smallestClearing((a) => hits(escape(arm, a)), 1.5);
    const moved = escape(arm, amount);
    return { moved, amount, remaining: hits(moved) };
  });
  options.sort((a, b) => a.remaining - b.remaining || a.amount - b.amount);
  return withPose(c, { ...c.pose, [which]: options[0].moved });
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
    return Math.max(deepest(contacts(head, [box])), boxIntoTorso(c.skeleton, c, box));
  };
  const intoWorld = (t: T) => deepest(contacts([collider(t)], solids));

  let current = item;
  for (let i = 0; i < 4 && intoBody(current) + intoWorld(current) > 0; i++) {
    current = moved(current, smallestClearing((dz) => intoBody(moved(current, dz, 0)), 0.5, 0.02), 0);
    current = moved(current, 0, smallestClearing((dy) => intoWorld(moved(current, 0, dy)), 0.8, 0.02));
  }
  return current;
};

export const characterViolations = (c: Character, solids: readonly Solid[]): Contact[] => {
  const body = bodyColliders(c.skeleton, c);
  const found = contacts([...body.torso, ...body.head, ...body.legs, ...body.leftArm, ...body.rightArm], solids);
  for (const which of ["leftArm", "rightArm"] as const) {
    const depth = armIntoTorso(c.skeleton, c.pose, which);
    if (depth > 0) {
      found.push({ a: which === "leftArm" ? "left arm" : "right arm", b: "own body", depth, normal: new Vector3() });
    }
  }
  return found;
};
