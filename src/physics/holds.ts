import { inWindow, smoothstep } from "../characters/scalar";
import { handPosition, type ArmName, type ArmPose } from "../characters/skeleton";
import { ROUND_ANYTHING, clearVia } from "../characters/gesture";
import { Matrix4, type Vector3 } from "three";
import { obb, type Obb, type Solid } from "./collision";
import { blendArm, throughArm } from "./armDescent";
import { AUTHORED_ARM, FINAL_ARM, lastArm, type ArmClock } from "./armHistory";
import { reachArm, type Aim, type Goal } from "./grip";
import { armHits, settleArm, withArm, type Character } from "./guards";

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
  readonly withdraw?: (u: number) => number;
  readonly starts?: readonly ArmPose[];
  readonly path?: "hand";
  readonly continuous?: boolean;
  readonly letGoAround?: boolean;
  readonly reachAround?: boolean;
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

const WAYPOINT: readonly [number, number, number] = [0.01, 0.01, 0.01];

export const onFrame = (frame: Matrix4, world: Vector3) => world.clone().applyMatrix4(frame.clone().invert());

export const transitHold = ({
  name,
  arm,
  window,
  done,
  path,
  frame,
}: {
  readonly name: string;
  readonly arm: ArmName;
  readonly window: readonly [number, number];
  readonly done: number;
  readonly path: () => (u: number) => Vector3;
  readonly frame: (t: number) => Matrix4;
}): Hold => {
  const at = (t: number) => path()(inWindow(t, window)).clone().applyMatrix4(frame(t));
  return {
    name,
    arm,
    reach: window[0],
    grip: window[1],
    release: window[1],
    done,
    target: () => {
      const end = at(window[1]);
      return obb(name, new Matrix4().makeTranslation(end.x, end.y, end.z), WAYPOINT);
    },
    near: at,
    approach: () => 1,
    exact: true,
    continuous: true,
    path: "hand",
  };
};

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
  return 1 - (hold.withdraw ?? smoothstep)((t - hold.release) / (hold.done - hold.release));
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
const LET_GO_VIA = "let go via: ";
const REACH_FROM = "reach from: ";
const REACH_VIA = "reach via: ";


const reachFor = (c: Character, which: ArmName, t: number, solids: readonly Solid[], hold: Hold, clock?: ArmClock  ): ArmPose => {
  const pose = poseAt(hold, t);
  if (pose) return reachArm(withArm(c, which, pose), which, goalOf(hold, t), solids, null, { authoredOnly: true }).pose[which];
  const at = clock?.at ?? t;
  const lastFrame = (clock?.history?.before(at, which, hold.name, at - t + hold.reach) as ArmPose | undefined) ?? (hold.reachAround ? undefined : lastArm(clock, which));
  const reached = reachArm(c, which, goalOf(hold, t), solids, null, { starts: startsOf(hold), lastFrame, keepTracking: hold.continuous }).pose[which];
  clock?.history?.remember(at, which, hold.name, reached);
  return reached;
};

export const workArm = <C extends Character>(
  c: C,
  which: ArmName,
  t: number,
  solids: readonly Solid[],
  holds: readonly Hold[],
  clock?: ArmClock  ,
): C => {
  const history = clock?.history;
  const at = clock?.at ?? t;
  const lastFrame = lastArm(clock, which);
  const authoredBefore = lastArm(clock, which, AUTHORED_ARM);
  const kept = (wanted: ArmPose, out: C) => {
    history?.remember(at, which, FINAL_ARM, out.pose[which]);
    history?.remember(at, which, AUTHORED_ARM, wanted);
    return out;
  };
  const settled = (wanted: ArmPose, before = authoredBefore) => kept(wanted, settleArm(withArm(c, which, wanted), solids, which, lastFrame, before));
  const placed = (arm: ArmPose) => kept(arm, withArm(c, which, arm));
  const once = <V>(key: string, since: number, first: () => V): V => {
    const value = (history?.before(at, which, key, at - t + since) as V | undefined) ?? first();
    history?.remember(at, which, key, value);
    return value;
  };
  const routed = (key: string, since: number, from: ArmPose, to: ArmPose, u: number) =>
    throughArm(from, once(key, since, () => clearVia(armHits(c, solids, which), from, to, ROUND_ANYTHING)), to, u);
  const tracked = (reference: ArmPose, aims: readonly Aim[], starts: readonly ArmPose[], keepTracking = false) =>
    placed(reachArm(withArm(c, which, reference), which, aims.filter((aim) => aim.weight > 0), solids, null, { starts, lastFrame, keepTracking }).pose[which]);
  const active = holds
    .filter((h) => h.arm === which && t > h.reach && t < h.done)
    .sort((a, b) => a.reach - b.reach);
  const [hold, next] = [active.at(0), active.at(1)];
  if (!hold) return settled(c.pose[which]);
  const alone = !(next && next.reach >= hold.release);
  const letGo = alone && t > hold.release && (hold.path === "hand" || hold.letGoAround) ? once(LET_GO_FROM + hold.name, hold.release, () => lastFrame) : undefined;
  if (letGo) {
    const w = holdWeight(hold, t);
    if (!hold.letGoAround) return settled(blendArm(c.pose[which], letGo, w));
    return settled(routed(LET_GO_VIA + hold.name, hold.release, letGo, c.pose[which], 1 - w));
  }
  if (hold.path === "hand" && alone) {
    const w = holdWeight(hold, t);
    const aims: Aim[] = [{ goal: handPosition(c.skeleton, c, which), weight: 1 - w }, { goal: goalOf(hold, t), weight: w }];
    return tracked(blendArm(c.pose[which], poseAt(hold, t) ?? c.pose[which], w), aims, startsOf(hold), hold.continuous);
  }
  if (next && next.reach >= hold.release && (hold.path === "hand" || next.path === "hand")) {
    const w = holdWeight(next, t);
    const aims: Aim[] = [{ goal: goalOf(hold, t), weight: 1 - w }, { goal: goalOf(next, t), weight: w }];
    return tracked(blendArm(poseAt(hold, t) ?? c.pose[which], poseAt(next, t) ?? c.pose[which], w), aims, startsOf(hold, next), hold.continuous || next.continuous);
  }
  if (next && next.reach >= hold.release && straightBetween(hold, next)) {
    const between = hold.near!(Math.min(t, hold.release)).clone().lerp(next.near!(t), holdWeight(next, t));
    return tracked(c.pose[which], [{ goal: between, weight: 1 }], startsOf(hold, next));
  }
  const reached = reachFor(c, which, t, solids, hold, clock);
  if (next && next.reach >= hold.release) return settled(blendArm(reached, reachFor(c, which, t, solids, next, clock), holdWeight(next, t)));
  const w = holdWeight(hold, t);
  if (w >= 1) return placed(reached);
  if (hold.reachAround && t < hold.grip) {
    const started = history?.before(at, which, REACH_FROM + hold.name, at - t + hold.reach);
    const from = once(REACH_FROM + hold.name, hold.reach, () => lastFrame ?? c.pose[which]);
    return settled(routed(REACH_VIA + hold.name, hold.reach, from, reached, w), started ? authoredBefore : from);
  }
  return settled(blendArm(c.pose[which], reached, w));
};
