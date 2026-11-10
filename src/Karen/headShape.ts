import { Quaternion, Vector3 } from "three";
import { ellipsoidFace } from "../characters/ellipsoidFace";
import type { Vec3 } from "../toon/primitives";

export const HEAD_SIZE: Vec3 = [0.155, 0.175, 0.15];

const FACE = ellipsoidFace(HEAD_SIZE);

export const faceDepth = FACE.depth;
export const faceNormal = FACE.normal;
export const facePoint = FACE.point;

export const faceAlign = (x: number, y: number) =>
  new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), faceNormal(x, y));

export const headHull = (ink: number): { center: Vec3; size: Vec3 } => {
  const [a, b, c] = HEAD_SIZE;
  return { center: [0, ink / 2, 0], size: [a + ink, b + ink / 2, c + ink] };
};
