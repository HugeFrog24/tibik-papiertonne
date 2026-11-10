import { clamp } from "../characters/scalar";
import { GLASS_PANE, type Glazing } from "../building/glazedLeaf";
import type { Vec3 } from "../toon/primitives";
import { FACADE_Z, FRAME_BORDER, OPENING_LAYERS, OPENINGS, openingFrame } from "./building";
import { DOORWAY, facadeOpenings, type Rect } from "./facade";

const GLASS_IOR = 1.5;

export const surfaceReflectance = (ior = GLASS_IOR) => ((ior - 1) / (ior + 1)) ** 2;

export const glazingReflectance = (sheets: number, ior = GLASS_IOR) => {
  const face = surfaceReflectance(ior);
  const sheet = (2 * face) / (1 + face);
  let total = 0;
  for (let i = 0; i < sheets; i++) total += ((1 - total) ** 2 * sheet) / (1 - total * sheet);
  return total;
};

export const GLASS_F0 = glazingReflectance(2);

export const glassFresnel = (cosView: number) => GLASS_F0 + (1 - GLASS_F0) * (1 - clamp(cosView, 0, 1)) ** 5;

export const dimmedBehind = (cosView: number) => glassFresnel(cosView) - GLASS_F0;

export const GLASS_REFLECTION = { resolution: 0.5, clearance: 0.002, blur: { clear: 1.5, patterned: 4 }, lift: 0.001 } as const;

export const FACADE_MIRROR_Z = FACADE_Z + OPENING_LAYERS.reflection;

export const distantGlass = (): Rect[] =>
  OPENINGS.filter((o) => o.shutter < 1).map((o) => {
    const [fw, fh] = openingFrame(o);
    const [w, h] = [fw - 2 * FRAME_BORDER, fh - 2 * FRAME_BORDER];
    return { x0: o.x - w / 2, x1: o.x + w / 2, y0: o.y - h / 2, y1: o.y + h / 2 - h * o.shutter };
  });

export const doorGlassFilm = (glass: Glazing) => ({
  position: [glass.x, glass.y, GLASS_PANE / 2 + GLASS_REFLECTION.lift] as Vec3,
  size: [glass.w, glass.h] as const,
});

export const SHUT_TOLERANCE = 1e-4;

export const ajar = (angle: number) => Math.abs(angle) >= SHUT_TOLERANCE;

export const clearViewsOut = (haustuerOpen: boolean): Rect[] => facadeOpenings(12).filter((hole) => haustuerOpen || hole !== DOORWAY);

export const seenFromInside = (eye: Vec3, corners: readonly Vec3[], views: readonly Rect[]) => {
  if (eye[2] >= FACADE_Z) return true;
  const onFacade = corners
    .filter((c) => c[2] > FACADE_Z)
    .map((c) => {
      const t = (FACADE_Z - eye[2]) / (c[2] - eye[2]);
      return [eye[0] + t * (c[0] - eye[0]), eye[1] + t * (c[1] - eye[1])] as const;
    });
  if (onFacade.length === 0) return false;
  const xs = onFacade.map(([x]) => x);
  const ys = onFacade.map(([, y]) => y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return views.some((v) => x0 < v.x1 && x1 > v.x0 && y0 < v.y1 && y1 > v.y0);
};
