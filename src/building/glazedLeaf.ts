import type { Door } from "./doors";

export const GLASS_PANE = 0.008;

export type Glazing = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

type Part = { readonly center: readonly [number, number, number]; readonly size: readonly [number, number, number] };

const part = (x0: number, x1: number, y0: number, y1: number, thickness: number): Part => ({
  center: [(x0 + x1) / 2, (y0 + y1) / 2, 0],
  size: [x1 - x0, y1 - y0, thickness],
});

export const leafAround = (door: Door, glass: Glazing): Part[] => {
  const [left, right] = [glass.x - glass.w / 2, glass.x + glass.w / 2];
  const [bottom, top] = [glass.y - glass.h / 2, glass.y + glass.h / 2];
  const t = door.thickness;
  return [
    part(0, left, 0, door.height, t),
    part(right, door.width, 0, door.height, t),
    part(left, right, 0, bottom, t),
    part(left, right, top, door.height, t),
  ];
};
