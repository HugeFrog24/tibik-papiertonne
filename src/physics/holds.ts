import { smoothstep } from "../characters/scalar";
import { handPosition, type ArmName, type ArmPose } from "../characters/skeleton";
import { Matrix4, type Vector3 } from "three";
import type { Obb, Solid } from "./collision";
import { blendArm } from "./armDescent";
import { AUTHORED_ARM, FINAL_ARM, type ArmHistory } from "./armHistory";
import { reachArm, type Aim, type Goal } from "./grip";
import { settleArm, withArm, type Character } from "./guards";

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
  readonly approach?: (u: number) => number;
  readonly starts?: readonly ArmPose[];
  readonly path?: "hand";
};

export const followTheHand = (frame: Matrix4, hand: Vector3, near: Vector3, weight: number) => {
  if (weight <= 0) return frame;
  const miss = hand.clone().sub(near).multiplyScalar(weight);
  return new Matrix4().makeTranslation(miss.x, miss.y, miss.z).multiply(frame);
};

export const holdWindow = ([reach, grip, release, done]: readonly [number, number, number, number]) => ({ reach, grip, release, done });

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

const startsOf = (...holds: readonly Hold[]): ArmPose[] => [...HOLD_STARTS, ...holds.flatMap((h) => h.starts ?? [])];

const holdWeight = (hold: Hold, t: number) => {
  if (t < hold.grip)
    return (hold.approach ?? smoothstep)((t - hold.reach) / (hold.grip - hold.reach));
  if (t <= hold.release) return 1;
  return 1 - smoothstep((t - hold.release) / (hold.done - hold.release));
};

const goalOf = (hold: Hold, t: number): Goal => {
  const target = hold.target(Math.min(t, hold.release));
  const near = hold.near ? hold.near(t) : target.center;
  return hold.exact ? near : { touch: target, near };
};


const straightBetween = (hold: Hold, next: Hold) =>
  hold.exact === true && next.exact === true && hold.near !== undefined && next.near !== undefined && hold.pose === undefined && next.pose === undefined;

const poseAt = (hold: Hold, t: number) => (typeof hold.pose === "function" ? hold.pose(t) : hold.pose);

const LET_GO_FROM = "let go from: ";

const reachFor = <C extends Character>(c: C, which: ArmName, t: number, solids: readonly Solid[], hold: Hold, history?: ArmHistory, at = t): ArmPose => {
  const pose = poseAt(hold, t);
  if (pose) return reachArm(withArm(c, which, pose), which, goalOf(hold, t), solids, null, { authoredOnly: true }).pose[which];
  const lastFrame = history?.before(at, which, hold.name, at - t + hold.reach) ?? history?.before(at, which, FINAL_ARM, -Infinity);
  const reached = reachArm(c, which, goalOf(hold, t), solids, null, { starts: startsOf(hold), lastFrame }).pose[which];
  history?.remember(at, which, hold.name, reached);
  return reached;
};

export const workArm = <C extends Character>(
  c: C,
  which: ArmName,
  t: number,
  solids: readonly Solid[],
  holds: readonly Hold[],
  history?: ArmHistory,
  at = t,
): C => {
  const lastFrame = history?.before(at, which, FINAL_ARM, -Infinity);
  const authoredBefore = history?.before(at, which, AUTHORED_ARM, -Infinity);
  const kept = (wanted: ArmPose, out: C) => {
    history?.remember(at, which, FINAL_ARM, out.pose[which]);
    history?.remember(at, which, AUTHORED_ARM, wanted);
    return out;
  };
  const settled = (wanted: ArmPose) => kept(wanted, settleArm(withArm(c, which, wanted), solids, which, lastFrame, authoredBefore));
  const placed = (arm: ArmPose) => kept(arm, withArm(c, which, arm));
  const tracked = (reference: ArmPose, aims: readonly Aim[], starts: readonly ArmPose[]) =>
    placed(reachArm(withArm(c, which, reference), which, aims.filter((aim) => aim.weight > 0), solids, null, { starts, lastFrame }).pose[which]);
  const [hold, next] = holds
    .filter((h) => h.arm === which && t > h.reach && t < h.done)
    .sort((a, b) => a.reach - b.reach);
  if (!hold) return settled(c.pose[which]);
  if (hold.path === "hand" && !(next && next.reach >= hold.release)) {
    const w = holdWeight(hold, t);
    const letGo = t > hold.release ? history?.before(at, which, LET_GO_FROM + hold.name, at - t + hold.release) ?? lastFrame : undefined;
    if (letGo) {
      history?.remember(at, which, LET_GO_FROM + hold.name, letGo);
      return settled(blendArm(c.pose[which], letGo, w));
    }
    const aims: Aim[] = [{ goal: handPosition(c.skeleton, c, which), weight: 1 - w }, { goal: goalOf(hold, t), weight: w }];
    return tracked(blendArm(c.pose[which], poseAt(hold, t) ?? c.pose[which], w), aims, startsOf(hold));
  }
  if (next && next.reach >= hold.release && (hold.path === "hand" || next.path === "hand")) {
    const w = holdWeight(next, t);
    const aims: Aim[] = [{ goal: goalOf(hold, t), weight: 1 - w }, { goal: goalOf(next, t), weight: w }];
    return tracked(blendArm(poseAt(hold, t) ?? c.pose[which], poseAt(next, t) ?? c.pose[which], w), aims, startsOf(hold, next));
  }
  if (next && next.reach >= hold.release && straightBetween(hold, next)) {
    const between = hold.near!(Math.min(t, hold.release)).clone().lerp(next.near!(t), holdWeight(next, t));
    return tracked(c.pose[which], [{ goal: between, weight: 1 }], startsOf(hold, next));
  }
  const reached = reachFor(c, which, t, solids, hold, history, at);
  if (next && next.reach >= hold.release) return settled(blendArm(reached, reachFor(c, which, t, solids, next, history, at), holdWeight(next, t)));
  const w = holdWeight(hold, t);
  if (w >= 1) return placed(reached);
  return settled(blendArm(c.pose[which], reached, w));
};
