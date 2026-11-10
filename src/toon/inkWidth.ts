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

export const LINE_CAP = { pixels: 24, perShorterSide: 1080 };

export const widestLine = (width: number, height: number) => (LINE_CAP.pixels * Math.min(width, height)) / LINE_CAP.perShorterSide;

const RING_STEP = { ratio: 1.35, pixels: 2 };

const ringReaches = () => {
  const reaches = [1];
  while (reaches[reaches.length - 1] < LINE_CAP.pixels) {
    const last = reaches[reaches.length - 1];
    reaches.push(Math.min(LINE_CAP.pixels, last * RING_STEP.ratio, last + RING_STEP.pixels));
  }
  return reaches;
};

export const INK_PASS = {
  maxRadius: LINE_CAP.pixels,
  jump: 0.002,
  rings: ringReaches().map((reach) => reach / LINE_CAP.pixels),
  turns: 16,
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

const isUnit = (o: Object3D) => Boolean(o.userData["inkGroup"]);

export const inkIdsOf = (mesh: Object3D) => {
  const unit = ancestorWith(mesh, isUnit);
  const reach: unknown = mesh.userData["inkJoin"];
  const outer = unit && typeof reach === "number" ? ancestorWith(unit.parent, isUnit) : null;
  return {
    id: unit?.id ?? mesh.id,
    join: outer ? { id: outer.id, reach: reach as number } : null,
  };
};

export const inkOf = (object: Object3D) => {
  const set = ancestorWith(object, (o) => o.userData["inkBlocker"] === true || typeof o.userData["ink"] === "number");
  if (!set) return 0;
  return set.userData["inkBlocker"] === true ? -1 : (set.userData["ink"] as number);
};

export const skipsInkIds = (object: Object3D) =>
  object.userData["noInk"] === true ||
  object instanceof Line ||
  object instanceof Points ||
  (object instanceof Mesh &&
    !Array.isArray(object.material) &&
    (object.material as Material).side === BackSide);
