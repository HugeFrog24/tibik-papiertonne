import { expect, test } from "vitest";
import { CAR, PARKED_CARS, carZ, tyreFootprints } from "./carShape";
import {
  GULLY,
  GULLIES,
  MANHOLE,
  MANHOLES,
  gullyFootprint,
  kerbFace,
} from "./drainShape";
import { overlap } from "./footprint";

const tyres = PARKED_CARS.flatMap(tyreFootprints);

test("gully tops are DIN 19594 300 × 500 grates in the gutter against each kerb", () => {
  expect(GULLY.along).toBeCloseTo(0.5, 9);
  expect(GULLY.across).toBeCloseTo(0.3, 9);
  for (const gully of GULLIES) {
    const face = kerbFace(gully.far);
    const fromKerb = Math.abs(gully.z - face) - GULLY.across / 2;
    expect(fromKerb).toBeGreaterThan(0);
    expect(fromKerb).toBeLessThan(0.03);
    expect(Math.sign(gully.z - face)).toBe(gully.far ? -1 : 1);
  }
});

test("no parked car stands with a tyre on a gully", () => {
  for (const gully of GULLIES) {
    for (const tyre of tyres)
      expect(overlap(gullyFootprint(gully), tyre)).toBe(false);
  }
});

test("each kerb drains every 20 m or so, end to end", () => {
  for (const far of [false, true]) {
    const xs = GULLIES.filter((g) => g.far === far)
      .map((g) => g.x)
      .sort((a, b) => a - b);
    expect(xs[0]).toBeLessThan(-100);
    expect(xs[xs.length - 1]).toBeGreaterThan(100);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i] - xs[i - 1]).toBeGreaterThan(10);
      expect(xs[i] - xs[i - 1]).toBeLessThanOrEqual(25);
    }
  }
});

test("manhole covers have a 625 mm opening and sit mid-carriageway, clear of every parked car", () => {
  expect(MANHOLE.opening).toBeCloseTo(0.625, 9);
  expect(MANHOLE.frame).toBeGreaterThan(MANHOLE.opening);
  const middle = (kerbFace(false) + kerbFace(true)) / 2;
  for (const manhole of MANHOLES) {
    expect(manhole.z).toBeCloseTo(middle, 9);
    for (const car of PARKED_CARS) {
      const gap = Math.max(
        Math.abs(manhole.x - car.x) - CAR.size[0] / 2,
        Math.abs(manhole.z - carZ(car)) - CAR.size[2] / 2,
      );
      expect(gap - MANHOLE.frame / 2).toBeGreaterThan(0.5);
    }
  }
});
