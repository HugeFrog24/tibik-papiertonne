import { Matrix4, Quaternion, Vector3 } from "three";
import { expect, test } from "vitest";
import { TIMELINE_FPS } from "../frameRate";
import { betweenTicks, blend } from "./betweenTicks";

const onTheGrid = (t: number) => Math.abs(t * TIMELINE_FPS - Math.round(t * TIMELINE_FPS)) < 1e-9;

test("on a tick the scene shows exactly what was solved for that tick, asked at exactly that tick, so a 30 fps render is untouched", () => {
  const asked: number[] = [];
  const solved = new Map<number, { readonly at: number }>();
  const solve = (t: number) => {
    asked.push(t);
    if (!solved.has(t)) solved.set(t, { at: t });
    return solved.get(t)!;
  };
  const at = betweenTicks(solve);
  for (const frame of [0, 1, 29, 30, 1234, 6457]) {
    const tick = frame / TIMELINE_FPS;
    const shown = at(tick);
    expect(shown).toBe(solved.get(tick));
    expect(at((2 * frame) / 60)).toBe(shown);
    expect(at((3 * frame) / 90)).toBe(shown);
    expect(at((4 * frame) / 120)).toBe(shown);
  }
  expect(asked.every((t) => t === Math.round(t * TIMELINE_FPS) / TIMELINE_FPS)).toBe(true);
});

test("between two ticks the scene is never solved anew: it is drawn from the two ticks around it", () => {
  const asked = new Set<number>();
  const at = betweenTicks((t: number) => {
    asked.add(t);
    return { x: t };
  });
  for (let frame = 0; frame < 480; frame++) at(frame / 120);
  expect([...asked].filter((t) => !onTheGrid(t))).toEqual([]);
  expect(at(7 / 30 + 1 / 120).x).toBeCloseTo(7 / 30 + 1 / 120, 12);
  expect(at(7 / 30 + 1 / 60).x).toBeCloseTo(7 / 30 + 1 / 60, 12);
  expect(at(7 / 30 + 1 / 90).x).toBeCloseTo(7 / 30 + 1 / 90, 12);
});

type State = {
  readonly n: number;
  readonly v: readonly number[];
  readonly pose: { readonly arm: { readonly raise: number } };
  readonly lit: boolean;
  readonly colour: string;
  readonly light: () => number;
  readonly prop: { readonly x: number } | null;
  readonly keys: Matrix4;
};

const placed = (angle: number, x: number) => new Matrix4().compose(new Vector3(x, 0, 0), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), angle), new Vector3(1, 1, 1));

test("between ticks numbers, tuples and nested poses go part of the way, a moved and turned thing goes part of the way along and around, and a switch, a colour, a light function or a prop that comes or goes stays as on the tick before", () => {
  const [dark, bright] = [() => 0, () => 1];
  const a: State = { n: 0, v: [0, 2, 4], pose: { arm: { raise: 1 } }, lit: false, colour: "#000000", light: dark, prop: null, keys: placed(0, 0) };
  const b: State = { n: 10, v: [1, 4, 8], pose: { arm: { raise: 2 } }, lit: true, colour: "#ffffff", light: bright, prop: { x: 1 }, keys: placed(Math.PI / 2, 2) };
  const m = blend(a, b, 0.25);
  expect([m.n, m.v, m.pose.arm.raise]).toEqual([2.5, [0.25, 2.5, 5], 1.25]);
  expect([m.lit, m.colour, m.light, m.prop]).toEqual([false, "#000000", dark, null]);
  expect(m.keys).toBeInstanceOf(Matrix4);
  const [p, q, s] = [new Vector3(), new Quaternion(), new Vector3()];
  m.keys.decompose(p, q, s);
  expect(p.distanceTo(new Vector3(0.5, 0, 0))).toBeLessThan(1e-9);
  expect(q.angleTo(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 8))).toBeLessThan(1e-9);
  expect(s.distanceTo(new Vector3(1, 1, 1))).toBeLessThan(1e-9);
  expect(blend(a, b, 0)).toEqual(a);
});

test("someone turning through facing straight back turns the short way round between two ticks, never spinning the long way", () => {
  const [a, b] = [{ rotationY: 3.12, position: [0, 0, 0] }, { rotationY: -3.14, position: [1, 0, 0] }];
  const m = blend(a, b, 0.5);
  expect(m.rotationY).toBeCloseTo(3.12 + (2 * Math.PI - 6.26) / 2, 12);
  expect(m.position).toEqual([0.5, 0, 0]);
});

test("where the story jumps at a cut, the frames between the last tick before the cut and the cut hold that tick, never blending into the moment after the jump", () => {
  const at = betweenTicks((t: number) => ({ x: t < 1 ? t : t + 100 }), [1]);
  expect(at(29.5 / 30)).toEqual({ x: 29 / 30 });
  expect(at(29.75 / 30)).toEqual({ x: 29 / 30 });
  expect(at(30.5 / 30).x).toBeCloseTo(30.5 / 30 + 100, 12);
  expect(at(28.5 / 30).x).toBeCloseTo(28.5 / 30, 12);
});
