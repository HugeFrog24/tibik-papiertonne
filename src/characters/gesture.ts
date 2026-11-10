import { ARM_KEYS, blendArm, throughArm } from "../physics/armDescent";
import { armIntoTorso, type ArmName, type ArmPose, type Pose, type Skeleton } from "./skeleton";

export const RESTING_AGAINST = 0.002;
const SAMPLES = 64;

type JointLean = readonly [keyof ArmPose, "up" | "down"];
export type Bends = { readonly leans: readonly (readonly JointLean[])[]; readonly bulges: readonly number[] };

const SINGLE: readonly JointLean[] = ARM_KEYS.flatMap((key): JointLean[] => [
  [key, "up"],
  [key, "down"],
]);

const ROUND_THE_BODY: Bends = {
  leans: [[["raise", "up"]], [["out", "up"]]],
  bulges: [0.25, 0.5, 0.75, 1],
};

export const ROUND_ANYTHING: Bends = {
  leans: [
    ...SINGLE.map((lean) => [lean]),
    ...SINGLE.flatMap((a, i) => SINGLE.slice(i + 1).filter((b) => b[0] !== a[0]).map((b) => [a, b])),
  ],
  bulges: [0.25, 0.5, 0.75, 1, 1.5, 2],
};

const leaning = (from: ArmPose, to: ArmPose, leans: readonly JointLean[], bulge: number): ArmPose => {
  const mid = blendArm(from, to, 0.5);
  return leans.reduce((via, [key, way]) => {
    const toward = way === "up" ? Math.max(from[key], to[key]) : Math.min(from[key], to[key]);
    return { ...via, [key]: mid[key] + bulge * (toward - mid[key]) };
  }, mid);
};

export const clearVia = (into: (arm: ArmPose) => number, from: ArmPose, to: ArmPose, { leans, bulges }: Bends): ArmPose => {
  const allowed = Math.max(RESTING_AGAINST, into(from));
  const clear = (via: ArmPose) =>
    Array.from({ length: SAMPLES - 1 }, (_, i) => (i + 1) / SAMPLES).every((w) => into(throughArm(from, via, to, w)) <= allowed);
  const straight = blendArm(from, to, 0.5);
  if (clear(straight)) return straight;
  return bulges.flatMap((bulge) => leans.map((lean) => leaning(from, to, lean, bulge))).find(clear) ?? straight;
};

export const bendAround = (skeleton: Skeleton, rest: Pose, which: ArmName) => {
  const into = (arm: ArmPose) => armIntoTorso(skeleton, { ...rest, [which]: arm }, which);
  const chosen = new Map<string, ArmPose>();
  return (from: ArmPose, to: ArmPose): ArmPose => {
    const key = JSON.stringify([from, to]);
    const known = chosen.get(key) ?? clearVia(into, from, to, ROUND_THE_BODY);
    chosen.set(key, known);
    return known;
  };
};
