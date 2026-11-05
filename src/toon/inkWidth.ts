import {
  BackSide,
  Line,
  Mesh,
  Points,
  type Material,
  type Object3D,
} from "three";
import { frameHeightAt } from "./frameHeight";
import { INK } from "./primitives";

export const INK_PASS = {
  maxRadius: 14,
  jump: 0.002,
  rings: [0.08, 0.16, 0.28, 0.42, 0.6, 0.8, 1],
  turns: 12,
  ink: INK,
  fallbackFov: 50,
};

export const inkRadius = (
  outline: number,
  heightPx: number,
  fovDegrees: number,
  depth: number,
) =>
  (outline * heightPx) / frameHeightAt(depth, fovDegrees);

export const ONE_UNIT = { inkGroup: true } as const;

export const NO_INK = { noInk: true } as const;

export const skipsInkIds = (object: Object3D) =>
  object.userData.noInk === true ||
  object instanceof Line ||
  object instanceof Points ||
  (object instanceof Mesh &&
    !Array.isArray(object.material) &&
    (object.material as Material).side === BackSide);
