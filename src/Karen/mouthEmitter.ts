import { Matrix4, Vector3 } from "three";
import {
  headRotation,
  torsoMatrix,
  type Placement,
} from "../characters/skeleton";
import { mouthBottom, mouthTop } from "./face";
import { HEAD_SIZE, faceNormal, facePoint } from "./headShape";
import { KAREN_SKELETON as K } from "./rig";
import type { Emitter } from "./spray";

export const SPRAY_AHEAD = 0.012;

export const karenHeadMatrix = (karen: Placement) =>
  torsoMatrix(K, karen)
    .clone()
    .multiply(new Matrix4().makeTranslation(0, K.neckHeight, 0))
    .multiply(new Matrix4().makeRotationFromEuler(headRotation(karen.pose)))
    .multiply(new Matrix4().makeTranslation(...K.headCenter));

export const toKarenHead = (point: Vector3, karen: Placement) =>
  point.clone().applyMatrix4(karenHeadMatrix(karen).clone().invert());

export const insideKarenHead = (point: Vector3, karen: Placement) => {
  const p = toKarenHead(point, karen);
  const [a, b, c] = HEAD_SIZE;
  return (p.x / a) ** 2 + (p.y / b) ** 2 + (p.z / c) ** 2 <= 1;
};

export const karenMouthEmitter = (
  karen: Placement & { readonly mouthOpen: number },
): Emitter => {
  const head = karenHeadMatrix(karen);
  const open = karen.mouthOpen;
  const y = (mouthTop(0, open) + mouthBottom(0, open)) / 2;
  return {
    origin: facePoint(0, y, SPRAY_AHEAD).applyMatrix4(head),
    forward: faceNormal(0, y).transformDirection(head),
    up: new Vector3(0, 1, 0).transformDirection(head),
    open,
  };
};
