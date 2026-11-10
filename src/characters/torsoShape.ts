import { LatheGeometry, type Vector2 } from "three";
import { bustPush, type Skeleton } from "./skeleton";

const LATHE_SEGMENTS = 64;

export const torsoLathe = (points: readonly Vector2[], skeleton: Skeleton) => {
  const geometry = new LatheGeometry([...points], LATHE_SEGMENTS);
  if (!skeleton.torso.bulges?.length) return geometry;
  const position = geometry.attributes["position"];
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const radius = Math.hypot(x, z);
    if (radius === 0) continue;
    position.setZ(i, z + bustPush(skeleton, x, position.getY(i), z / radius) / skeleton.torso.depthScale);
  }
  geometry.computeVertexNormals();
  return geometry;
};
