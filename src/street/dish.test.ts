import { Vector3 } from "three";
import { expect, test } from "vitest";
import { BALCONIES, BALCONY, balconyDecor, balconyParts, railingHeightFor } from "./building";
import { ASTRA, DISH, dishParts, skyDirection } from "./dishShape";

const degrees = (radians: number) => (radians * 180) / Math.PI;
const azimuthOf = (v: Vector3) => (degrees(Math.atan2(v.x, -v.z)) + 360) % 360;
const elevationOf = (v: Vector3) => degrees(Math.asin(v.y / v.length()));

test("a dish hangs only where it can see Astra 19.2°E in the south: No. 12's balconies face south, No. 13's face north and carry none", () => {
  expect(BALCONIES.some((_, i) => balconyDecor(12, i).dish)).toBe(true);
  expect(BALCONIES.some((_, i) => balconyDecor(13, i).dish)).toBe(false);
});

test("the dish looks at Astra from central Germany: beam at azimuth 168°, elevation 30°; its offset face stands nearly upright and reflects the satellite into the LNB", () => {
  expect(ASTRA).toEqual({ azimuth: 168, elevation: 30 });
  const parts = dishParts(railingHeightFor(BALCONIES[4].y));
  expect(azimuthOf(parts.beam)).toBeCloseTo(168, 6);
  expect(elevationOf(parts.beam)).toBeCloseTo(30, 6);
  expect(azimuthOf(parts.face)).toBeCloseTo(168, 6);
  expect(elevationOf(parts.face)).toBeCloseTo(30 - DISH.offset, 6);
  const incoming = parts.beam.clone().negate();
  const reflected = incoming.clone().addScaledVector(parts.face, -2 * incoming.dot(parts.face));
  const toLnb = parts.lnb.clone().sub(parts.centre).normalize();
  expect(reflected.angleTo(toLnb)).toBeLessThan(1e-9);
  expect(skyDirection(168, 30).angleTo(parts.beam)).toBeLessThan(1e-9);
});

const insideBox = (p: Vector3, part: ReturnType<typeof balconyParts>[number], margin = 0) =>
  [p.x, p.y, p.z].every((v, i) => Math.abs(v - part.center[i]) < part.size[i] / 2 + margin);

test("the dish is held: a mast clamped inside the railing panel carries the reflector at its top, the LNB on an arm in front, and nothing passes through the balcony", () => {
  const { y } = BALCONIES[4];
  const h = railingHeightFor(y);
  const [, , d] = BALCONY.slab;
  const parts = dishParts(h);
  const front = balconyParts(y).find((p) => p.name === "front")!;
  const inner = d - BALCONY.bar;
  expect(inner - (parts.mast.from.z + DISH.mast)).toBeGreaterThan(0);
  expect(inner - (parts.mast.from.z + DISH.mast)).toBeLessThan(0.005);
  expect(parts.mast.from.y).toBeLessThan(h);
  expect(parts.mast.to.y).toBeGreaterThan(h);
  expect(parts.mast.to.distanceTo(parts.centre)).toBeLessThan(DISH.bracket + 1e-9);
  const rim = Array.from({ length: 24 }, (_, k) => parts.rimAt((2 * Math.PI * k) / 24));
  const arm = Array.from({ length: 11 }, (_, k) => parts.arm.from.clone().lerp(parts.arm.to, k / 10));
  const mast = Array.from({ length: 11 }, (_, k) => parts.mast.from.clone().lerp(parts.mast.to, k / 10));
  for (const part of balconyParts(y)) {
    for (const p of [...rim, ...arm, parts.centre, parts.lnb]) expect(insideBox(p, part, 0.01), part.name).toBe(false);
    for (const p of mast) expect(insideBox(p, part, DISH.mast - 1e-6), `mast in ${part.name}`).toBe(false);
  }
  expect(insideBox(parts.mast.from, front, DISH.mast + 0.005)).toBe(true);
});

test("the bracket and the LNB arm end at the reflector's back: their rounded ends touch it but never poke through its face", () => {
  const parts = dishParts(railingHeightFor(BALCONIES[4].y));
  const behind = (p: Vector3) => parts.centre.clone().sub(p).dot(parts.face);
  expect(behind(parts.bracket.to)).toBeGreaterThanOrEqual(DISH.arm + DISH.gap - 1e-9);
  expect(parts.bracket.from.distanceTo(parts.mast.to)).toBeLessThan(1e-9);
  const rimBottom = parts.rimAt(-Math.PI / 2);
  expect(rimBottom.clone().sub(parts.arm.from).dot(parts.face)).toBeGreaterThanOrEqual(DISH.arm - 1e-9);
});

test("a coax cable runs from the LNB under the arm, over the parapet and down the mast, clear of the balcony and the reflector", () => {
  const { y } = BALCONIES[4];
  const parts = dishParts(railingHeightFor(y));
  const cable = parts.cable;
  expect(cable[0].distanceTo(parts.lnb)).toBeLessThan(0.05);
  expect(cable[cable.length - 1].y).toBeLessThan(parts.mast.from.y + 0.05);
  const along = cable.slice(1).flatMap((to, k) =>
    Array.from({ length: 21 }, (_, j) => cable[k].clone().lerp(to, j / 20)),
  );
  for (const part of balconyParts(y))
    for (const p of along) expect(insideBox(p, part, DISH.cable - 1e-6), `cable in ${part.name}`).toBe(false);
  for (const p of along) {
    const offset = p.clone().sub(parts.centre);
    const a = offset.dot(parts.face);
    const r = offset.addScaledVector(parts.face, -a).length();
    expect(a > -DISH.cable && a < DISH.depth + DISH.cable && r < DISH.diameter / 2, "cable through the reflector").toBe(false);
  }
});
