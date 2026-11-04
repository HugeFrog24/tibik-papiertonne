import { Easing, interpolate } from "remotion";
import type { ArmPose } from "./skeleton";

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

export const blinkAt = (t: number, times: number[]) =>
  Math.max(0, ...times.map((b) => kf(t, [b, b + 0.08, b + 0.22], [0, 1, 0])));
