import { Path, Shape } from "three";
import { doorFrame, doorLeaf, type Door } from "../building/doors";
import { obb, type Obb } from "../physics/collision";
import { BUILDING_HEIGHT, ENTRANCE_X, FACADE_Z, OPENINGS, STAIR_WINDOW, type Part } from "./building";

export type Rect = { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number };

export const rectShape = (outer: Rect, holes: readonly Rect[]): Shape => {
  const outline = new Shape();
  outline.moveTo(outer.x0, outer.y0);
  outline.lineTo(outer.x1, outer.y0);
  outline.lineTo(outer.x1, outer.y1);
  outline.lineTo(outer.x0, outer.y1);
  outline.closePath();
  for (const o of holes) {
    const hole = new Path();
    hole.moveTo(o.x0, o.y0);
    hole.lineTo(o.x0, o.y1);
    hole.lineTo(o.x1, o.y1);
    hole.lineTo(o.x1, o.y0);
    hole.closePath();
    outline.holes.push(hole);
  }
  return outline;
};

export const FACADE_THICKNESS = 0.4;
const WALL = { x0: -15, x1: 15, y0: 0, y1: BUILDING_HEIGHT };

export const DOORWAY: Rect = { x0: ENTRANCE_X - 0.575, x1: ENTRANCE_X + 0.575, y0: 0.15, y1: 2.45 };

export const facadeOpenings = (): Rect[] => [
  DOORWAY,
  ...OPENINGS.filter((o) => o.kind === "stairs").map((o) => ({
    x0: o.x - STAIR_WINDOW.frame[0] / 2,
    x1: o.x + STAIR_WINDOW.frame[0] / 2,
    y0: o.y - STAIR_WINDOW.frame[1] / 2,
    y1: o.y + STAIR_WINDOW.frame[1] / 2,
  })),
];

const wallPart = (name: string, r: Rect, z0: number, z1: number): Part => ({
  name,
  center: [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, (z0 + z1) / 2],
  size: [r.x1 - r.x0, r.y1 - r.y0, z1 - z0],
});

export const tileAround = (area: Rect, openings: readonly Rect[]): Rect[] => {
  const inside = openings.filter((o) => o.x1 > area.x0 && o.x0 < area.x1 && o.y1 > area.y0 && o.y0 < area.y1);
  const cuts = (values: number[], from: number, to: number) =>
    [...new Set([from, to, ...values.filter((v) => v > from && v < to)])].sort((a, b) => a - b);
  const xs = cuts(inside.flatMap((o) => [o.x0, o.x1]), area.x0, area.x1);
  const cells: Rect[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const column = inside.filter((o) => o.x0 < xs[i + 1] && o.x1 > xs[i]);
    const ys = cuts(column.flatMap((o) => [o.y0, o.y1]), area.y0, area.y1);
    for (let j = 0; j < ys.length - 1; j++) {
      const cell = { x0: xs[i], x1: xs[i + 1], y0: ys[j], y1: ys[j + 1] };
      const midY = (cell.y0 + cell.y1) / 2;
      if (!column.some((o) => midY > o.y0 && midY < o.y1)) {
        cells.push(cell);
      }
    }
  }
  return cells;
};

export const facadePieces = (): Part[] =>
  tileAround(WALL, facadeOpenings()).map((r) => wallPart("facade", r, FACADE_Z - FACADE_THICKNESS, FACADE_Z));

export const aroundOpenings = (part: Part): Part[] => {
  const [cx, cy, cz] = part.center;
  const [sx, sy, sz] = part.size;
  const area = { x0: cx - sx / 2, x1: cx + sx / 2, y0: cy - sy / 2, y1: cy + sy / 2 };
  const crossing = facadeOpenings()
    .filter((o) => o.y1 > area.y0 && o.y0 < area.y1)
    .map((o) => ({ ...o, y0: Math.min(o.y0, area.y0), y1: Math.max(o.y1, area.y1) }));
  return tileAround(area, crossing).map((r) => wallPart(part.name, r, cz - sz / 2, cz + sz / 2));
};

const FRAME = { outer: { x0: ENTRANCE_X - 0.675, x1: ENTRANCE_X + 0.675, y0: 0.15, y1: 2.61 }, depth: 0.08 };
export const ENTRANCE_PARTS: readonly Part[] = [
  wallPart("door jamb", { ...FRAME.outer, x1: DOORWAY.x0 }, FACADE_Z, FACADE_Z + FRAME.depth),
  wallPart("door jamb", { ...FRAME.outer, x0: DOORWAY.x1 }, FACADE_Z, FACADE_Z + FRAME.depth),
  wallPart("door head", { ...FRAME.outer, y0: DOORWAY.y1 }, FACADE_Z, FACADE_Z + FRAME.depth),
];

export const HAUSTUER: Door = {
  name: "Haustür",
  hinge: [ENTRANCE_X - 0.55, 0.17, FACADE_Z - 0.06],
  width: 1.1,
  height: 2.26,
  thickness: 0.05,
  closedYaw: 0,
  swing: 1,
  handle: { x: 0.97, y: 1.08 },
};

export const HAUSTUER_BAR = { size: [0.04, 0.5, 0.04] as const, offset: 0.05 };

export const haustuerSolids = (angle: number): Obb[] => [
  doorLeaf(HAUSTUER, angle),
  obb("Haustür handle", doorFrame(HAUSTUER, angle), HAUSTUER_BAR.size, [
    HAUSTUER.handle.x,
    HAUSTUER.handle.y,
    HAUSTUER.thickness / 2 + HAUSTUER_BAR.offset,
  ]),
];
