import { inWindow } from "./scalar";

export type Point = readonly [number, number];

export type Walk = {
  readonly from: number;
  readonly to: number;
  readonly via: readonly [Point, Point, Point, Point];
  readonly endSpeed?: number;
  readonly ramps?: readonly [number, number];
  readonly startSpeed?: number;
};

const bezier = (via: Walk["via"], u: number): Point => {
  const w = [(1 - u) ** 3, 3 * u * (1 - u) ** 2, 3 * u ** 2 * (1 - u), u ** 3];
  return [0, 1].map((k) => via.reduce((sum, p, i) => sum + w[i] * p[k], 0)) as unknown as Point;
};

const tangent = (via: Walk["via"], u: number): Point => {
  const w = [(1 - u) ** 2, 2 * u * (1 - u), u ** 2];
  return [0, 1].map((k) => w.reduce((sum, wi, i) => sum + 3 * wi * (via[i + 1][k] - via[i][k]), 0)) as unknown as Point;
};

const SAMPLES = 64;
const arcLengths = new Map<Walk, number[]>();
const lengthsOf = (walk: Walk) => {
  let table = arcLengths.get(walk);
  if (!table) {
    const points = Array.from({ length: SAMPLES + 1 }, (_, i) => bezier(walk.via, i / SAMPLES));
    table = points.reduce<number[]>((acc, p, i) => [...acc, i === 0 ? 0 : acc[i - 1] + Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1])], []);
    arcLengths.set(walk, table);
  }
  return table;
};

export const pathLength = (walk: Walk) => lengthsOf(walk)[SAMPLES];

const parameterAt = (walk: Walk, fraction: number) => {
  const table = lengthsOf(walk);
  const wanted = fraction * table[SAMPLES];
  const i = Math.max(0, Math.min(SAMPLES - 1, table.findIndex((l) => l >= wanted) - 1));
  const span = table[i + 1] - table[i];
  return (i + (span > 0 ? (wanted - table[i]) / span : 0)) / SAMPLES;
};

const RAMP = 0.25;
const cruise = (s: number, [into, outOf]: readonly [number, number]) => {
  const top = 1 / (1 - (into + outOf) / 2);
  if (s <= into) return (top * s * s) / (2 * into);
  if (s >= 1 - outOf) return 1 - (top * (1 - s) ** 2) / (2 * outOf);
  return top * (s - into / 2);
};

const speedUp = (s: number, top: number) => {
  const ramp = 2 * (1 - 1 / top);
  if (ramp <= 0 || ramp > 1) throw new Error(`a walk can't start from rest and end at ${top.toFixed(2)}x its average speed`);
  return s <= ramp ? (top * s * s) / (2 * ramp) : top * (s - ramp / 2);
};

const between = (s: number, start: number, end: number) =>
  (s ** 3 - 2 * s ** 2 + s) * start + (3 * s ** 2 - 2 * s ** 3) + (s ** 3 - s ** 2) * end;

export const headingAt = (walk: Walk, u: number) => {
  const [dx, dz] = tangent(walk.via, u);
  return Math.atan2(dx, dz);
};

export const walkAt = (walk: Walk, t: number) => {
  const s = Math.min(1, Math.max(0, (t - walk.from) / (walk.to - walk.from)));
  const fraction =
    walk.endSpeed === undefined
      ? cruise(s, walk.ramps ?? [RAMP, RAMP])
      : walk.startSpeed !== undefined
        ? between(s, (walk.startSpeed * (walk.to - walk.from)) / pathLength(walk), (walk.endSpeed * (walk.to - walk.from)) / pathLength(walk))
        : speedUp(s, (walk.endSpeed * (walk.to - walk.from)) / pathLength(walk));
  const u = parameterAt(walk, fraction);
  const [x, z] = bezier(walk.via, u);
  return { x, z, heading: headingAt(walk, u) };
};

export const SETTLE = 0.45;

export const TURN_RATE = 3.5;
export const FASTEST_TURN = 5;

const SMOOTHSTEP_PEAK = 1.5;

const nearest = (angle: number, to: number) => angle + 2 * Math.PI * Math.round((to - angle) / (2 * Math.PI));

export const walkFacing = (walk: Walk, t: number, facing: number, settle = true, start = facing) => {
  const { x, z, heading } = walkAt(walk, t);
  const span = (u: number, from: number) => Math.max(SETTLE, (SMOOTHSTEP_PEAK * Math.abs(nearest(headingAt(walk, u), from) - from)) / TURN_RATE);
  const setOff = inWindow(t, [walk.from, walk.from + span(0, start)]);
  const away = setOff * (settle ? 1 - inWindow(t, [walk.to - span(1, facing), walk.to]) : 1);
  const turned = start === facing ? 0 : (nearest(start, facing) - facing) * (1 - setOff);
  return { x, z, yaw: facing + (nearest(heading, facing) - facing) * away + turned };
};
