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

export const INK_BLOCKER = { inkBlocker: true } as const;

export const inkJoin = (reach: number) => ({ inkJoin: reach });

const ancestorWith = (object: Object3D | null, test: (o: Object3D) => boolean) => {
  for (let o = object; o; o = o.parent) if (test(o)) return o;
  return null;
};

const isUnit = (o: Object3D) => Boolean(o.userData.inkGroup);

export const inkIdsOf = (mesh: Object3D) => {
  const unit = ancestorWith(mesh, isUnit);
  const reach = mesh.userData.inkJoin;
  const outer = unit && typeof reach === "number" ? ancestorWith(unit.parent, isUnit) : null;
  return {
    id: unit?.id ?? mesh.id,
    join: outer ? { id: outer.id, reach: reach as number } : null,
  };
};

export const inkOf = (object: Object3D) => {
  const set = ancestorWith(object, (o) => o.userData.inkBlocker === true || typeof o.userData.ink === "number");
  if (!set) return 0;
  return set.userData.inkBlocker === true ? -1 : (set.userData.ink as number);
};

export const skipsInkIds = (object: Object3D) =>
  object.userData.noInk === true ||
  object instanceof Line ||
  object instanceof Points ||
  (object instanceof Mesh &&
    !Array.isArray(object.material) &&
    (object.material as Material).side === BackSide);
