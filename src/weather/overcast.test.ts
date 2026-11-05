import { Color } from "three";
import { expect, test } from "vitest";
import { SUN } from "../street/StreetSet";
import { footprint, overlap, partFootprint } from "../street/footprint";
import {
  BINS,
  FACADE_Z,
  KERB_DEPTH,
  KERB_Z,
  STREET_PARTS,
  STREET_TREE_XS,
  hydrantCap,
  treePit,
} from "../street/layout";
import { TONNE } from "../street/tonneShape";
import {
  GULLIES,
  MANHOLES,
  gullyFootprint,
  manholeFootprint,
} from "../street/drainShape";
import { PATCHES, jointFootprint } from "../street/roadShape";
import { HAZE, PUDDLES, RAIN_VISIBILITY, SIGN_LIGHT, WEATHER, facadeLight, hazeAt, hazeOf, mixLooks, signLightOf } from "./overcast";
import { luminance } from "../toon/colourChecks";

const hsl = (hex: string) => {
  const out = { h: 0, s: 0, l: 0 };
  new Color(hex).getHSL(out);
  return out;
};

test("sunny is today's street, value for value", () => {
  expect(WEATHER.sunny.sky).toEqual(["#8ecdf0", "#cfeaf7"]);
  expect(WEATHER.sunny.hemisphere).toEqual({
    sky: "#ffffff",
    ground: "#b5ad9c",
    intensity: 1.7,
  });
  expect(WEATHER.sunny.sun.intensity).toBe(2.0);
  expect(SUN.intensity).toBe(WEATHER.sunny.sun.intensity);
  expect(WEATHER.sunny.sun.shadows).toBe(true);
  expect(WEATHER.sunny.wetTint).toBeNull();
});

test("the rainy day is overcast: grey sky, weak sun, sky light dominant", () => {
  for (const colour of WEATHER.rain.sky)
    expect(hsl(colour).s).toBeLessThan(0.15);
  expect(WEATHER.rain.sun.intensity).toBeLessThanOrEqual(
    0.3 * WEATHER.sunny.sun.intensity,
  );
  expect(WEATHER.rain.hemisphere.intensity).toBeGreaterThanOrEqual(
    WEATHER.sunny.hemisphere.intensity,
  );
});

test("wet ground is darker", () => {
  expect(WEATHER.rain.wetTint).not.toBeNull();
  expect(luminance(WEATHER.rain.wetTint!)).toBeLessThan(0.7);
});

test("puddles lie on open pavement or the road, never on anything standing there, in a tree pit, on a bin, over the hydrant cap or another decal on the ground", () => {
  expect(PUDDLES.length).toBeGreaterThanOrEqual(4);
  const onGround = STREET_PARTS.filter(
    (p) => p.center[1] - p.size[1] / 2 <= 0.05,
  ).map(partFootprint);
  const pits = STREET_TREE_XS.map(treePit);
  const bins = BINS.map((b) =>
    footprint(b.position[0], b.position[2], TONNE.width, TONNE.depth),
  );
  const cap = hydrantCap();
  const capPrint = footprint(cap.x, cap.z, 0.5, 0.4);
  const decals = [
    ...GULLIES.map(gullyFootprint),
    ...MANHOLES.map(manholeFootprint),
    ...PATCHES,
    jointFootprint,
  ];
  const kerbFace = [KERB_Z - KERB_DEPTH / 2, KERB_Z + KERB_DEPTH / 2];
  for (const p of PUDDLES) {
    const print = footprint(p.x, p.z, 2 * p.rx, 2 * p.rz);
    const pavement = p.z - p.rz > FACADE_Z && p.z + p.rz < kerbFace[0];
    const road = p.z - p.rz > kerbFace[1];
    expect(pavement || road, `${p.x}, ${p.z}`).toBe(true);
    for (const other of [...onGround, ...pits, ...bins, capPrint, ...decals])
      expect(overlap(print, other), `${p.x}, ${p.z}`).toBe(false);
  }
});

test("in the rain the weak sun still casts shadows, faint because the sky light dominates", () => {
  const { sun, hemisphere } = WEATHER.rain;
  expect(sun.shadows).toBe(true);
  expect(sun.intensity / hemisphere.intensity).toBeLessThan(0.25);
});

test("printed signs and plates are lit like the wall they hang on: full in the sun, as dim as a lit white facade under the grey sky", () => {
  expect(SIGN_LIGHT.sunny).toBe(1);
  expect(SIGN_LIGHT.rain).toBeCloseTo(facadeLight(WEATHER.rain) / facadeLight(WEATHER.sunny), 12);
  expect(SIGN_LIGHT.rain).toBeGreaterThan(0.3);
  expect(SIGN_LIGHT.rain).toBeLessThan(0.6);
});

test("in the rain the distance hazes towards the horizon like air with 3 km visibility; the sun leaves it clear", () => {
  const koschmieder = (d: number) => 1 - Math.exp((-Math.log(50) * d) / RAIN_VISIBILITY);
  const rain = HAZE.rain!;
  expect(HAZE.sunny).toBeNull();
  expect(RAIN_VISIBILITY).toBe(3000);
  expect(rain.colour).toBe(WEATHER.rain.sky[1]);
  expect(hazeAt(150, rain.density)).toBeCloseTo(koschmieder(150), 12);
  expect(hazeAt(0, rain.density)).toBe(0);
  expect(hazeAt(20, rain.density)).toBeLessThan(0.01);
  expect(hazeAt(100, rain.density)).toBeGreaterThan(0.05);
  expect(hazeAt(100, rain.density)).toBeLessThan(0.15);
});

test("dusk and night have no sun, and night is darker than dusk, dusk darker than the rainy day", () => {
  expect(WEATHER.dusk.sun.intensity).toBe(0);
  expect(WEATHER.night.sun.intensity).toBe(0);
  expect(facadeLight(WEATHER.night)).toBeLessThan(facadeLight(WEATHER.dusk));
  expect(facadeLight(WEATHER.dusk)).toBeLessThan(facadeLight(WEATHER.rain));
});

test("mixing two looks starts at one and ends at the other", () => {
  for (const [a, b] of [[WEATHER.night, WEATHER.rain], [WEATHER.dusk, WEATHER.night]] as const) {
    expect(mixLooks(a, b, 0)).toEqual(a);
    expect(mixLooks(a, b, 1)).toEqual(b);
    expect(mixLooks(a, b, 0.5).hemisphere.intensity).toBeCloseTo((a.hemisphere.intensity + b.hemisphere.intensity) / 2, 12);
  }
});

test("the haze grows with the dawn into the rain", () => {
  expect(hazeOf(mixLooks(WEATHER.night, WEATHER.rain, 0))).toBeNull();
  let last = 0;
  for (let k = 0.1; k <= 1.0001; k += 0.1) {
    const density = hazeOf(mixLooks(WEATHER.night, WEATHER.rain, Math.min(1, k)))!.density;
    expect(density).toBeGreaterThan(last);
    last = density;
  }
  expect(last).toBeCloseTo(HAZE.rain!.density, 12);
});

test("signs dim with the light", () => {
  expect(signLightOf(WEATHER.night)).toBeLessThan(signLightOf(WEATHER.dusk));
  expect(signLightOf(WEATHER.dusk)).toBeLessThan(SIGN_LIGHT.rain);
  expect(SIGN_LIGHT.rain).toBeLessThan(SIGN_LIGHT.sunny);
  expect(SIGN_LIGHT.sunny).toBe(1);
});
