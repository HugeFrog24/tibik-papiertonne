import { Euler, type Matrix4 } from "three";
import { frame, obb, type Obb } from "../physics/collision";
import type { Vec3 } from "../toon/primitives";

export const PANEL = 0.006;

export const FOUND_KARTON_SIZE: Vec3 = [0.26, 0.18, 0.2];

export const SHIPPING_LABELS = {
  along: 0.15,
  old: { size: [0.12, 0.08] as const, lift: 0.002 },
  fresh: { size: [0.148, 0.105] as const, lift: 0.0032 },
};

export type KartonPanel = {
  readonly center: Vec3;
  readonly angle: number;
  readonly length: number;
  readonly short: boolean;
};

const wallAngle = (open: number) => 0.04 + (Math.PI / 2 - 0.04) * open;

export const bottomFold = (open: number) =>
  Math.min(1, Math.max(0, (open - 0.55) / 0.45));

export const kartonPanels = (size: Vec3, open: number): KartonPanel[] => {
  const [w, , d] = size;
  const a = wallAngle(open);
  const side = [d * Math.cos(a), d * Math.sin(a)];
  const corners = [
    [0, 0],
    [w, 0],
    [w + side[0], side[1]],
    [side[0], side[1]],
  ];
  const cx = (w + side[0]) / 2;
  const cz = side[1] / 2;
  return corners.map(([x0, z0], i) => {
    const [x1, z1] = corners[(i + 1) % 4];
    return {
      center: [(x0 + x1) / 2 - cx, 0, (z0 + z1) / 2 - cz],
      angle: -Math.atan2(z1 - z0, x1 - x0),
      length: Math.hypot(x1 - x0, z1 - z0),
      short: i % 2 === 1,
    };
  });
};

export const flapSplay = (open: number) => 0.35 * open;

const FLAP_LIFT = 1.2 * PANEL;

const share = (x: number) => Math.min(1, Math.max(0, x));

export type FlapOrder = readonly (readonly [number, number])[];

export const ENDS_THEN_SIDES: FlapOrder = [
  [0.5, 1],
  [0, 0.5],
  [0.5, 1],
  [0, 0.5],
];

const folding = (
  splay: number,
  closed: number,
  short: boolean,
  [from, to]: readonly [number, number],
) => {
  const f = share((closed - from) / (to - from));
  return {
    fold: -splay + f * (Math.PI / 2 + splay),
    lift: short ? 0 : FLAP_LIFT * f,
  };
};

export const kartonFlaps = (
  size: Vec3,
  open: number,
  closed = 0,
  order: FlapOrder = ENDS_THEN_SIDES,
  splay = flapSplay(open),
) => {
  const [, h, d] = size;
  return kartonPanels(size, open).map((panel, i) => {
    const { fold, lift } = folding(splay, closed, panel.short, order[i]);
    return {
      wall: panel.center,
      angle: panel.angle,
      hinge: [0, h / 2 + lift, -PANEL / 2] as Vec3,
      fold,
      size: [panel.length * 0.98, d / 2, PANEL] as Vec3,
      center: [0, d / 4, 0] as Vec3,
    };
  });
};

export const kartonFlapSolids = (
  size: Vec3,
  open: number,
  closed: number,
  box: Matrix4,
  margin = 0,
  order: FlapOrder = ENDS_THEN_SIDES,
  splay = flapSplay(open),
): Obb[] =>
  kartonFlaps(size, open, closed, order, splay).map((flap, i) =>
    obb(
      `box flap ${i + 1}`,
      frame(
        frame(box, flap.wall, new Euler(0, flap.angle, 0)),
        flap.hinge,
        new Euler(flap.fold, 0, 0),
      ),
      [
        flap.size[0] + 2 * margin,
        flap.size[1] + 2 * margin,
        flap.size[2] + 2 * margin,
      ],
      flap.center,
    ),
  );

export const kartonBounds = (
  size: Vec3,
  open: number,
): { center: Vec3; size: Vec3 } => {
  const [w, h, d] = size;
  const a = wallAngle(open);
  const top = h / 2 + d / 2;
  const bottom = -h / 2 - (d / 2) * Math.cos((Math.PI / 2) * bottomFold(open));
  return {
    center: [0, (top + bottom) / 2, 0],
    size: [w + d * Math.cos(a), top - bottom, d * Math.sin(a) + PANEL * 2],
  };
};
