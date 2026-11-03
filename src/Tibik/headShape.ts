import { Matrix4, Vector3 } from "three";
import { headRotation, torsoMatrix, type Placement } from "../characters/skeleton";
import { RIG } from "./rig";

export const headSurface = (placement: Placement, rings = 40, segments = 64): Vector3[] => {
  const head = torsoMatrix(RIG, placement)
    .clone()
    .multiply(new Matrix4().makeTranslation(0, RIG.neckHeight, 0))
    .multiply(new Matrix4().makeRotationFromEuler(headRotation(placement.pose)))
    .multiply(new Matrix4().makeTranslation(0, RIG.headCenterY, 0));
  const [sx, sy, sz] = RIG.headSize;
  const points: Vector3[] = [];
  for (let i = 0; i <= rings; i++) {
    const polar = (i / rings) * Math.PI;
    for (let j = 0; j < segments; j++) {
      const around = (j / segments) * Math.PI * 2;
      points.push(
        new Vector3(
          Math.sin(polar) * Math.cos(around) * sx,
          Math.cos(polar) * sy,
          Math.sin(polar) * Math.sin(around) * sz,
        ).applyMatrix4(head),
      );
    }
  }
  return points;
};
