import type { Vector3 } from "three";

import type { Point2 } from "../characters/scalar";

export type { Point2 };

const awayFrom = (edge: Point2, other: Point2): [number, number] => {
  const length = Math.hypot(edge[0], edge[1]);
  const n: [number, number] = [-edge[1] / length, edge[0] / length];
  return n[0] * other[0] + n[1] * other[1] > 0 ? [-n[0], -n[1]] : n;
};

export const aroundCorner = (
  start: Point2,
  corner: Point2,
  end: Point2,
  gap: number,
) => {
  const first: Point2 = [corner[0] - start[0], corner[1] - start[1]];
  const second: Point2 = [end[0] - corner[0], end[1] - corner[1]];
  const n1 = awayFrom(first, second);
  const n2 = awayFrom(second, [start[0] - corner[0], start[1] - corner[1]]);
  const from = Math.atan2(n1[1], n1[0]);
  const sweep =
    ((Math.atan2(n2[1], n2[0]) - from + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const along = Math.hypot(...first);
  const turn = Math.abs(sweep) * gap;
  const total = along + turn + Math.hypot(...second);
  return (u: number): [number, number] => {
    let s = Math.min(1, Math.max(0, u)) * total;
    if (s <= along) {
      const k = s / along;
      return [start[0] + first[0] * k + n1[0] * gap, start[1] + first[1] * k + n1[1] * gap];
    }
    s -= along;
    if (s <= turn) {
      const a = from + (sweep * s) / turn;
      return [corner[0] + gap * Math.cos(a), corner[1] + gap * Math.sin(a)];
    }
    const k = (s - turn) / (total - along - turn);
    return [corner[0] + second[0] * k + n2[0] * gap, corner[1] + second[1] * k + n2[1] * gap];
  };
};

const TURN = 2 * Math.PI;

export const spiralAround = (corner: Point2, from: Point2, to: Point2, blocked: Point2) => {
  const away = Math.atan2(blocked[1], blocked[0]);
  const polar = ([x, z]: Point2) => {
    const a = Math.atan2(z - corner[1], x - corner[0]) - away;
    return [Math.hypot(x - corner[0], z - corner[1]), ((a % TURN) + TURN) % TURN] as const;
  };
  const [r0, a0] = polar(from);
  const [r1, a1] = polar(to);
  return (u: number): [number, number] => {
    const r = r0 + (r1 - r0) * u;
    const a = away + a0 + (a1 - a0) * u;
    return [corner[0] + r * Math.cos(a), corner[1] + r * Math.sin(a)];
  };
};

const SAMPLES = 32;

const evenly = (piece: (u: number) => Vector3) => {
  const along = [0];
  for (let i = 1; i <= SAMPLES; i++) along.push(along[i - 1] + piece(i / SAMPLES).distanceTo(piece((i - 1) / SAMPLES)));
  const length = along[SAMPLES];
  const at = (s: number) => {
    const i = Math.max(1, along.findIndex((a) => a >= s));
    const span = along[i] - along[i - 1];
    return piece((i - 1 + (span > 0 ? (s - along[i - 1]) / span : 1)) / SAMPLES);
  };
  return { length, at };
};

export const joined = (...pieces: readonly ((u: number) => Vector3)[]) => {
  const even = pieces.map(evenly);
  const total = even.reduce((sum, piece) => sum + piece.length, 0);
  return (u: number): Vector3 => {
    let s = Math.min(1, Math.max(0, u)) * total;
    for (let i = 0; i < even.length - 1; i++) {
      if (s <= even[i].length) return even[i].at(s);
      s -= even[i].length;
    }
    return even[even.length - 1].at(Math.min(s, even[even.length - 1].length));
  };
};
