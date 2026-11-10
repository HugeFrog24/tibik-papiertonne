import { expect, test } from "vitest";
import { DECAL } from "../toon/primitives";
import { FACADE_Z, KERB_DEPTH, KERB_Z, acrossZ } from "../street/building";
import { treePit } from "../street/layout";
import { MORE_TREES, TREE_POSITION } from "../street/trees";
import { RAIN_RIBBONS } from "./Rain";
import { PUDDLES, WEATHER } from "./overcast";
import { rainGroundY } from "./rainDrops";
import { DRY_PITS, WATER_F0, WET_FILM, WET_LAYERS, WET_SURFACES, reflectance, waterFresnel, wetness } from "./wetGround";

test("water reflects 2 % of the light seen from straight above and all of it at a grazing angle, more the flatter you look", () => {
  expect(waterFresnel(1)).toBeCloseTo(WATER_F0, 12);
  expect(WATER_F0).toBe(0.02);
  expect(waterFresnel(0)).toBe(1);
  for (let c = 0; c < 1; c += 0.05) expect(waterFresnel(c)).toBeGreaterThanOrEqual(waterFresnel(c + 0.05));
});

test("dry ground mirrors nothing; wet ground mirrors little from above and much at a flat angle, and a puddle more than wet ground", () => {
  for (const c of [0, 0.3, 1]) {
    expect(reflectance(0, 0, c)).toBe(0);
    expect(reflectance(0, 1, c)).toBe(0);
    expect(reflectance(1, 1, c)).toBeGreaterThan(reflectance(1, 0, c));
  }
  expect(reflectance(1, 0, 1)).toBeLessThan(0.12);
  expect(reflectance(1, 0, 0.1)).toBeGreaterThan(0.4);
  expect(reflectance(1, 1, 1)).toBeGreaterThan(0.3);
});

test("the ground is wet as the weather is: dry in the sun, at dusk and at night before the rain, soaked on the rainy day", () => {
  expect(wetness(WEATHER.sunny)).toBe(0);
  expect(wetness(WEATHER.dusk)).toBe(0);
  expect(wetness(WEATHER.night)).toBe(0);
  expect(wetness(WEATHER.rain)).toBe(1);
});

test("the wet film covers the pavements and the road from facade to facade, each at the height of the ground it lies on", () => {
  expect(WET_SURFACES.map((s) => s.z)).toEqual([
    [FACADE_Z, KERB_Z - KERB_DEPTH / 2],
    [KERB_Z + KERB_DEPTH / 2, acrossZ(KERB_Z) - KERB_DEPTH / 2],
    [acrossZ(KERB_Z) + KERB_DEPTH / 2, acrossZ(FACADE_Z)],
  ]);
  for (const s of WET_SURFACES)
    for (const k of [0.01, 0.5, 0.99]) {
      const z = s.z[0] + k * (s.z[1] - s.z[0]);
      expect(rainGroundY(0, z), `${s.name} at z ${z.toFixed(2)}`).toBe(s.y);
    }
});

test("the soil in every tree pit stays matt, on both sides of the street, and no puddle lies in one", () => {
  const near = [TREE_POSITION[0], ...MORE_TREES].map(treePit);
  expect(DRY_PITS.length).toBe(near.length + MORE_TREES.length);
  for (const pit of near) expect(DRY_PITS).toContainEqual(pit);
  for (const p of PUDDLES)
    for (const pit of DRY_PITS) {
      const inside = p.x > pit.x[0] && p.x < pit.x[1] && p.z > pit.z[0] && p.z < pit.z[1];
      expect(inside, `puddle at ${p.x}`).toBe(false);
    }
});

test("the wet ground is drawn in layers: the ground darkened first, the puddles on it, the mirror over them and the rain over all, each over the ground's markings", () => {
  expect(WET_FILM.polygonOffsetFactor).toBeLessThan(DECAL.polygonOffsetFactor);
  expect(WET_LAYERS.shade).toBeLessThan(WET_LAYERS.puddles);
  expect(WET_LAYERS.puddles).toBeLessThan(WET_LAYERS.mirror);
  expect(WET_FILM.renderOrder).toBe(WET_LAYERS.mirror);
  expect(WET_LAYERS.mirror).toBeLessThan(RAIN_RIBBONS.renderOrder);
});
