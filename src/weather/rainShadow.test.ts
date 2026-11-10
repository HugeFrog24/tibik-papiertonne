import { Color } from "three";
import { expect, test } from "vitest";
import { BALCONIES, BALCONY, FACADE_Z, KERB_Z, acrossZ } from "../street/building";
import { CAR, PARKED_CARS, carZ } from "../street/carShape";
import { BINS, worldSolids } from "../street/layout";
import { WEATHER, PUDDLES, mixLooks } from "./overcast";
import { RAIN_DIR, rainAt } from "./rainDrops";
import { LEE_STRIP, RAIN_SHADOW, openSkyAt, shelteredAt, wetShade } from "./rainShadow";

test("the ground stays dry in the lee strip at No. 13's foot, as wide as the rain's slant and the roofline make it", () => {
  expect(LEE_STRIP).toBeCloseTo(19 * (-RAIN_DIR.z / -RAIN_DIR.y), 1);
  expect(LEE_STRIP).toBeGreaterThan(0.4);
  expect(LEE_STRIP).toBeLessThan(0.7);
  for (const x of [-27, -8.5, 0.4, 9.5, 24.5]) {
    expect(shelteredAt(x, acrossZ(FACADE_Z) - 0.05), `x ${x}`).toBe(true);
    expect(shelteredAt(x, acrossZ(FACADE_Z) - LEE_STRIP + 0.05), `x ${x}`).toBe(true);
    expect(shelteredAt(x, acrossZ(FACADE_Z) - 3.5), `x ${x}`).toBe(false);
  }
});

test("on a parked car's lee end and under No. 12's lowest balconies the ground stays dry, the open pavement and road get wet", () => {
  for (const car of PARKED_CARS.filter((c) => Math.abs(c.x) < 30)) {
    const leeEnd = car.x + CAR.size[0] / 2;
    expect(shelteredAt(leeEnd + 0.05, carZ(car)), `car at ${car.x}`).toBe(true);
    expect(shelteredAt(leeEnd + 0.4, carZ(car)), `car at ${car.x}`).toBe(false);
  }
  const lowest = Math.min(...BALCONIES.map((b) => b.y));
  for (const b of BALCONIES.filter((b) => b.y === lowest)) expect(shelteredAt(b.x + 0.3, FACADE_Z + BALCONY.slab[2] / 2), `balcony at ${b.x}`).toBe(true);
  expect(shelteredAt(1.5, KERB_Z - 0.6)).toBe(false);
  expect(shelteredAt(1.5, (KERB_Z + acrossZ(KERB_Z)) / 2)).toBe(false);
});

test("the dry ground agrees with the rain: every drop that splashes lands where the ground gets wet", () => {
  const solids = worldSolids(BINS.map(() => 0));
  let splashes = 0;
  for (const t of [0.5, 3.25, 7.25, 12.5])
    for (const d of rainAt(t, [0, 14, 6], solids, []))
      if (d.splash && Math.abs(d.splash.at[0]) < RAIN_SHADOW.x[1] - 1) {
        splashes++;
        expect(openSkyAt(d.splash.at[0], d.splash.at[2]), `${d.id} at ${d.splash.at.map((v) => v.toFixed(2)).join(",")}`).toBeGreaterThan(0.2);
      }
  expect(splashes).toBeGreaterThan(200);
});

test("no puddle lies on sheltered ground", () => {
  for (const p of PUDDLES)
    for (const [dx, dz] of [
      [0, 0],
      [p.rx, 0],
      [-p.rx, 0],
      [0, p.rz],
      [0, -p.rz],
    ])
      expect(shelteredAt(p.x + dx, p.z + dz), `puddle at ${p.x}`).toBe(false);
});

test("the ground darkens as far as it is wet: not at all when dry or sheltered, by the look's wet tint when soaked", () => {
  const tint = new Color(WEATHER.rain.wetTint!);
  expect(wetShade(WEATHER.sunny, 1)).toEqual([1, 1, 1]);
  expect(wetShade(WEATHER.rain, 0)).toEqual([1, 1, 1]);
  const soaked = wetShade(WEATHER.rain, 1);
  expect(soaked[0]).toBeCloseTo(tint.r, 9);
  expect(soaked[1]).toBeCloseTo(tint.g, 9);
  expect(soaked[2]).toBeCloseTo(tint.b, 9);
  const dawn = wetShade(mixLooks(WEATHER.night, WEATHER.rain, 0.3), 1);
  expect(dawn[0]).toBeGreaterThan(tint.r);
  expect(dawn[0]).toBeLessThan(1);
});
