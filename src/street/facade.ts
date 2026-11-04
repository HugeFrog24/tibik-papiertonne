import { Easing } from "remotion";
import { kf } from "../characters/animate";
import { Path, Shape, Vector3 } from "three";
import { doorFrame, doorSolids, leverGrip, type Door } from "../building/doors";
import type { Obb } from "../physics/collision";
import {
  BUILDING_HEIGHT,
  ENTRANCE_X,
  FACADE_Z,
  OPENINGS,
  STAIR_WINDOW,
  type Part,
} from "./building";

export type Rect = {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
};

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

export const DOORWAY: Rect = {
  x0: ENTRANCE_X - 0.575,
  x1: ENTRANCE_X + 0.575,
  y0: 0.15,
  y1: 2.45,
};

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
  const inside = openings.filter(
    (o) => o.x1 > area.x0 && o.x0 < area.x1 && o.y1 > area.y0 && o.y0 < area.y1,
  );
  const cuts = (values: number[], from: number, to: number) =>
    [...new Set([from, to, ...values.filter((v) => v > from && v < to)])].sort(
      (a, b) => a - b,
    );
  const xs = cuts(
    inside.flatMap((o) => [o.x0, o.x1]),
    area.x0,
    area.x1,
  );
  const cells: Rect[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const column = inside.filter((o) => o.x0 < xs[i + 1] && o.x1 > xs[i]);
    const ys = cuts(
      column.flatMap((o) => [o.y0, o.y1]),
      area.y0,
      area.y1,
    );
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
  tileAround(WALL, facadeOpenings()).map((r) =>
    wallPart("facade", r, FACADE_Z - FACADE_THICKNESS, FACADE_Z),
  );

export const aroundOpenings = (part: Part): Part[] => {
  const [cx, cy, cz] = part.center;
  const [sx, sy, sz] = part.size;
  const area = {
    x0: cx - sx / 2,
    x1: cx + sx / 2,
    y0: cy - sy / 2,
    y1: cy + sy / 2,
  };
  const crossing = facadeOpenings()
    .filter((o) => o.y1 > area.y0 && o.y0 < area.y1)
    .map((o) => ({
      ...o,
      y0: Math.min(o.y0, area.y0),
      y1: Math.max(o.y1, area.y1),
    }));
  return tileAround(area, crossing).map((r) =>
    wallPart(part.name, r, cz - sz / 2, cz + sz / 2),
  );
};

const FRAME = {
  outer: { x0: ENTRANCE_X - 0.675, x1: ENTRANCE_X + 0.675, y0: 0.15, y1: 2.61 },
  depth: 0.08,
};
export const ENTRANCE_PARTS: readonly Part[] = [
  wallPart(
    "door jamb",
    { ...FRAME.outer, x1: DOORWAY.x0 },
    FACADE_Z,
    FACADE_Z + FRAME.depth,
  ),
  wallPart(
    "door jamb",
    { ...FRAME.outer, x0: DOORWAY.x1 },
    FACADE_Z,
    FACADE_Z + FRAME.depth,
  ),
  wallPart(
    "door head",
    { ...FRAME.outer, y0: DOORWAY.y1 },
    FACADE_Z,
    FACADE_Z + FRAME.depth,
  ),
];

export const HAUSTUER: Door = {
  name: "Haustür",
  hinge: [ENTRANCE_X - 0.55, 0.17, FACADE_Z - 0.06],
  width: 1.1,
  height: 2.26,
  thickness: 0.05,
  closedYaw: 0,
  swing: 1,
  grips: [
    leverGrip(0.98, 1.08, -0.025),
    {
      side: "outer",
      shape: "bar",
      center: [0.905, 1.08, 0.075],
      size: [0.04, 0.5, 0.04],
    },
  ],
};

export const haustuerSolids = (angle: number, lever = 0): Obb[] =>
  doorSolids(HAUSTUER, angle, lever);

const INSIDE_FACE = FACADE_Z - FACADE_THICKNESS;
export const CLOSER_TIME = 2.2;

export const closerSwing = (
  t: number,
  release: number,
  held: number,
  time = CLOSER_TIME,
) => {
  const k = time / CLOSER_TIME;
  return kf(
    t,
    [release, release + 0.3 * k, release + 1.9 * k, release + time],
    [held, held - 0.1, 0.26, 0],
    Easing.linear,
  );
};

export const HAUSTUER_CLOSER = {
  body: {
    center: [
      HAUSTUER.hinge[0] + 0.22,
      DOORWAY.y1 + 0.075,
      INSIDE_FACE - 0.035,
    ] as [number, number, number],
    size: [0.3, 0.07, 0.07] as [number, number, number],
  },
  spindle: [
    HAUSTUER.hinge[0] + 0.1,
    DOORWAY.y1 - 0.01,
    INSIDE_FACE - 0.035,
  ] as [number, number, number],
  armLength: 0.4,
  rail: {
    from: 0.25,
    to: 0.85,
    y: HAUSTUER.height - 0.035,
    depth: -(HAUSTUER.thickness / 2 + 0.015),
    size: 0.025,
  },
};

export const closerArm = (angle: number) => {
  const { spindle: s, armLength, rail } = HAUSTUER_CLOSER;
  const spindle = new Vector3(...s);
  const frame = doorFrame(HAUSTUER, angle);
  const start = new Vector3(0, rail.y, rail.depth).applyMatrix4(frame);
  const along = new Vector3(1, rail.y, rail.depth)
    .applyMatrix4(frame)
    .sub(start);
  const d = start.clone().sub(spindle);
  const ad = along.dot(d);
  const reach =
    -ad +
    Math.sqrt(Math.max(0, ad * ad - d.lengthSq() + armLength * armLength));
  return { spindle, slider: start.addScaledVector(along, reach), along: reach };
};
