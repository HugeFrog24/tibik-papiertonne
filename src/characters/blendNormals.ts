import { Vector3 } from "three";
import { easeUnit } from "./scalar";
import { torsoRadiusAt, type Skeleton } from "./skeleton";

export const BLEND_REACH = 0.06;
export const ROOT_REACH = [0.1, 0.2] as const;

export const torsoNormalAt = (skeleton: Skeleton, p: Vector3) => {
  const { radius, slope } = torsoRadiusAt(skeleton, p.y);
  const depth = skeleton.torso.depthScale;
  return new Vector3(p.x, -radius * slope, p.z / (depth * depth)).normalize();
};

const nearTheRoot = (p: Vector3, joint?: Vector3) =>
  joint ? 1 - easeUnit((p.distanceTo(joint) - ROOT_REACH[0]) / (ROOT_REACH[1] - ROOT_REACH[0])) : 1;

export const blendedNormal = (skeleton: Skeleton, p: Vector3, own: Vector3, joint?: Vector3) => {
  const mine = own.clone().normalize();
  const { radius } = torsoRadiusAt(skeleton, p.y);
  if (!(radius > 0)) return mine;
  const gap = Math.hypot(p.x, p.z / skeleton.torso.depthScale) - radius;
  return mine.lerp(torsoNormalAt(skeleton, p), (1 - easeUnit(gap / BLEND_REACH)) * nearTheRoot(p, joint)).normalize();
};
