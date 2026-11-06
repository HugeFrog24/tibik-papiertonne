import { Euler, Matrix4, Vector3 } from "three";
import { expect, test } from "vitest";
import { FLAME, LIGHTER, SPARKS, flameAt, flameTip, lighterObb, sparksAt, wheelTop } from "./lighterShape";

test("a plain disposable lighter: about 80 x 25 x 12 mm, red plastic, a metal hood, a 3 mm ink line", () => {
  expect(LIGHTER.body[1] + LIGHTER.hood[1]).toBeCloseTo(0.08, 9);
  expect(LIGHTER.body[0]).toBeCloseTo(0.025, 9);
  expect(LIGHTER.body[2]).toBeCloseTo(0.012, 9);
  expect(LIGHTER.ink).toBeCloseTo(0.003, 9);
  expect(LIGHTER.plastic).toBe("#c8202a");
  expect(LIGHTER.metal).toBe("#b9bcc0");
});

test("the flame is 25 mm and flickers within 10 % and 0.08 rad, the same at the same time", () => {
  const heights: number[] = [];
  for (let t = 0; t < 10; t += 0.01) {
    const { height, lean } = flameAt(t);
    expect(height).toBeGreaterThanOrEqual(0.025 * 0.9 - 1e-12);
    expect(height).toBeLessThanOrEqual(0.025 * 1.1 + 1e-12);
    expect(Math.abs(lean)).toBeLessThanOrEqual(0.08 + 1e-12);
    heights.push(height);
  }
  expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.002);
  expect(flameAt(1.234)).toEqual(flameAt(1.234));
  expect(FLAME.height).toBeCloseTo(0.025, 9);
  const tip = flameTip(new Matrix4(), 0);
  expect(tip.y).toBeGreaterThan(0.08 + 0.02);
});

test("the flame's light reaches 1.2 m", () => {
  expect(FLAME.light.distance).toBeCloseTo(1.2, 9);
});

test("the flame rises towards world up however the lighter is tilted", () => {
  const tilted = new Matrix4().makeRotationFromEuler(new Euler(0.5, 0.3, -0.6)).setPosition(1, 2, 3);
  const nozzle = new Vector3(...LIGHTER.nozzle).applyMatrix4(tilted);
  for (const t of [0, 0.37, 1.9]) {
    const up = flameTip(tilted, t).sub(nozzle).normalize();
    expect(up.y, `t ${t}`).toBeGreaterThanOrEqual(Math.cos(FLAME.lean) - 1e-9);
  }
});

test("a butane flame in still air is steady: its flicker is slow and smooth at 30 fps", () => {
  let turns = 0;
  let last = 0;
  for (let f = 1; f <= 300; f++) {
    const step = flameAt(f / 30).height - flameAt((f - 1) / 30).height;
    expect(Math.abs(step), `frame ${f}`).toBeLessThanOrEqual(0.07 * FLAME.height);
    if (last !== 0 && Math.sign(step) !== Math.sign(last)) turns++;
    last = step;
  }
  expect(turns).toBeLessThan(0.3 * 300);
});

test("a flame dies down rather than vanishing: its size follows how far the gas is open", () => {
  expect(flameAt(1.2, 0.5).height).toBeCloseTo(0.5 * flameAt(1.2).height, 12);
  expect(flameAt(1.2, 0).height).toBe(0);
});

test("the flame lights her face 15 cm away with half to all the light a ceiling lamp gives the landing", () => {
  const lamp = 3.5 / 1.2 ** 2;
  const face = FLAME.light.intensity / 0.15 ** 2;
  expect(face).toBeGreaterThanOrEqual(0.5 * lamp);
  expect(face).toBeLessThanOrEqual(lamp);
});

test("the lighter's box covers its wheel, and the gas lever sits under the wheel", () => {
  const box = lighterObb(new Matrix4());
  const wheelTop = LIGHTER.body[1] + LIGHTER.hood[1] + 1.4 * LIGHTER.wheel.radius;
  expect(box.center.y + box.half[1]).toBeGreaterThanOrEqual(wheelTop - 1e-9);
  expect(LIGHTER.lever.center[1] + LIGHTER.lever.size[1] / 2).toBeLessThanOrEqual(wheelTop);
});

test("the flint wheel throws a few tiny sparks for a frame or two as it is struck, flying out from the wheel", () => {
  const frame = 1 / 30;
  expect(sparksAt(-0.001)).toEqual([]);
  expect(sparksAt(SPARKS.last)).toEqual([]);
  expect(SPARKS.last).toBeLessThanOrEqual(2 * frame + 1e-9);
  const first = sparksAt(0);
  expect(first.length).toBeGreaterThanOrEqual(3);
  expect(first.length).toBeLessThanOrEqual(6);
  const later = sparksAt(frame);
  expect(later).toHaveLength(first.length);
  later.forEach((spark, i) => {
    expect(first[i].distanceTo(wheelTop())).toBeLessThan(0.006);
    expect(spark.distanceTo(wheelTop())).toBeGreaterThan(first[i].distanceTo(wheelTop()));
    expect(spark.distanceTo(wheelTop())).toBeLessThan(0.02);
  });
  expect(SPARKS.radius).toBeLessThanOrEqual(0.001);
});
