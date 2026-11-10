import { Quaternion, Vector3 } from "three";

export type CatchlightSpec = {
  readonly toward: readonly [number, number, number];
  readonly size: number;
};

export const CATCHLIGHT_LIFT = 1.008;
export const CATCHLIGHT_SEGMENTS = [16, 4] as const;

export const catchlightCap = (sphere: number, { toward, size }: CatchlightSpec) => ({
  radius: sphere * CATCHLIGHT_LIFT,
  angle: Math.asin(Math.min(1, size)),
  quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(...toward).normalize()),
});
