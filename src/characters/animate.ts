import { Easing, interpolate } from "remotion";
import type { ArmPose } from "./skeleton";
import { throughArm } from "../physics/armDescent";

const smooth = Easing.bezier(0.45, 0, 0.55, 1);

export const kf = (
  t: number,
  times: readonly number[],
  values: readonly number[],
  easing: (n: number) => number = smooth,
) =>
  interpolate(t, times, values, {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const armKf = (t: number, times: readonly number[], poses: readonly ArmPose[]): ArmPose => ({
  raise: kf(t, times, poses.map((p) => p.raise)),
  out: kf(t, times, poses.map((p) => p.out)),
  elbow: kf(t, times, poses.map((p) => p.elbow)),
  inward: kf(t, times, poses.map((p) => p.inward)),
});

export const armAroundKf = (
  t: number,
  times: readonly number[],
  poses: readonly ArmPose[],
  around: (from: ArmPose, to: ArmPose) => ArmPose,
): ArmPose => {
  const next = times.findIndex((at) => at > t);
  if (next <= 0) return poses[next === 0 ? 0 : poses.length - 1];
  const [from, to] = [poses[next - 1], poses[next]];
  return throughArm(from, around(from, to), to, smooth((t - times[next - 1]) / (times[next] - times[next - 1])));
};

export const BLINK = { shut: 0.08, open: 0.22 } as const;

export const blinkAt = (t: number, times: number[]) =>
  Math.max(0, ...times.map((b) => kf(t, [b, b + BLINK.shut, b + BLINK.open], [0, 1, 0])));
