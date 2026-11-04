import type { Rect } from "./facade";
import { FACADE_Z, STREET_PARTS } from "./layout";

export const rectOf = (p: {
  center: readonly number[];
  size: readonly number[];
}): Rect => ({
  x0: p.center[0] - p.size[0] / 2,
  x1: p.center[0] + p.size[0] / 2,
  y0: p.center[1] - p.size[1] / 2,
  y1: p.center[1] + p.size[1] / 2,
});

export const overlap = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) *
  Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

export const facadeClashes = (part: {
  readonly center: readonly number[];
  readonly size: readonly number[];
}): string[] => {
  const r = rectOf(part);
  return STREET_PARTS.filter(
    (p) =>
      p !== part &&
      Math.abs(p.center[2] - FACADE_Z) < 0.5 &&
      overlap(r, rectOf(p)) > 0,
  ).map((p) => p.name);
};

export const WALK_X = [-1.85, 6.8] as const;
