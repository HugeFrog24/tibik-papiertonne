import { smoothstep } from "../characters/scalar";
import type { ArmName, ArmPose } from "../characters/skeleton";
import type { Vector3 } from "three";
import type { Obb, Solid } from "./collision";
import { reachArm } from "./grip";
import { guardArm, type Character } from "./guards";

export type Hold = {
  readonly name: string;
  readonly arm: ArmName;
  readonly reach: number;
  readonly grip: number;
  readonly release: number;
  readonly done: number;
  readonly target: (t: number) => Obb;
  readonly pose?: ArmPose | ((t: number) => ArmPose);
  readonly near?: (t: number) => Vector3;
  readonly exact?: boolean;
};

export const handHold = ({
  window: [grip, release],
  lead = 0.3,
  tail = 0.4,
  ...hold
}: Omit<Hold, "reach" | "grip" | "release" | "done"> & {
  readonly window: readonly [number, number];
  readonly lead?: number;
  readonly tail?: number;
}): Hold => ({ ...hold, reach: grip - lead, grip, release, done: release + tail });

const HOLD_STARTS: ArmPose[] = [
  { raise: 0.4, out: 1.4, elbow: 0.3, inward: 0 },
  { raise: 1.0, out: 1.0, elbow: 0.4, inward: 0.2 },
  { raise: 1.4, out: 0.6, elbow: 0.5, inward: 0.4 },
  { raise: 0.8, out: 0.4, elbow: 0.2, inward: -0.3 },
];

const holdWeight = (hold: Hold, t: number) => {
  if (t < hold.grip)
    return smoothstep((t - hold.reach) / (hold.grip - hold.reach));
  if (t <= hold.release) return 1;
  return 1 - smoothstep((t - hold.release) / (hold.done - hold.release));
};

export const blendArm = (a: ArmPose, b: ArmPose, w: number): ArmPose => ({
  raise: a.raise + (b.raise - a.raise) * w,
  out: a.out + (b.out - a.out) * w,
  elbow: a.elbow + (b.elbow - a.elbow) * w,
  inward: a.inward + (b.inward - a.inward) * w,
});

const reachFor = <C extends Character>(
  c: C,
  which: ArmName,
  t: number,
  solids: readonly Solid[],
  hold: Hold,
): C => {
  const targetAt = () => hold.target(Math.min(t, hold.release));
  const pose = typeof hold.pose === "function" ? hold.pose(t) : hold.pose;
  const near = hold.near ? hold.near(t) : targetAt().center;
  const goal = hold.exact ? near : { touch: targetAt(), near };
  return pose
    ? reachArm(
        { ...c, pose: { ...c.pose, [which]: pose } },
        which,
        goal,
        solids,
        null,
        [],
        true,
      )
    : reachArm(c, which, goal, solids, null, HOLD_STARTS);
};

const withArmPose = <C extends Character>(c: C, which: ArmName, arm: ArmPose): C => ({
  ...c,
  pose: { ...c.pose, [which]: arm },
});

export const workArm = <C extends Character>(
  c: C,
  which: ArmName,
  t: number,
  solids: readonly Solid[],
  holds: readonly Hold[],
): C => {
  const [hold, next] = holds
    .filter((h) => h.arm === which && t > h.reach && t < h.done)
    .sort((a, b) => a.reach - b.reach);
  if (!hold) return guardArm(c, solids, which);
  const reached = reachFor(c, which, t, solids, hold);
  if (next && next.reach >= hold.release) {
    const onward = reachFor(c, which, t, solids, next);
    const handOver = blendArm(reached.pose[which], onward.pose[which], holdWeight(next, t));
    return guardArm(withArmPose(c, which, handOver), solids, which);
  }
  const w = holdWeight(hold, t);
  if (w >= 1) return reached;
  return guardArm(
    withArmPose(c, which, blendArm(c.pose[which], reached.pose[which], w)),
    solids,
    which,
  );
};
