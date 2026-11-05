import { Color } from "three";

export type Weather = "sunny" | "rain" | "dusk" | "night";

export type WeatherLook = {
  readonly sky: readonly [string, string];
  readonly hemisphere: {
    readonly sky: string;
    readonly ground: string;
    readonly intensity: number;
  };
  readonly sun: { readonly intensity: number; readonly shadows: boolean };
  readonly wetTint: string | null;
  readonly wet: number;
};

export const WEATHER: Readonly<Record<Weather, WeatherLook>> = {
  sunny: {
    sky: ["#8ecdf0", "#cfeaf7"],
    hemisphere: { sky: "#ffffff", ground: "#b5ad9c", intensity: 1.7 },
    sun: { intensity: 2.0, shadows: true },
    wetTint: null,
    wet: 0,
  },
  rain: {
    sky: ["#8d949b", "#b9bfc4"],
    hemisphere: { sky: "#d9dde0", ground: "#6f7377", intensity: 2.1 },
    sun: { intensity: 0.45, shadows: true },
    wetTint: "#9a9fa3",
    wet: 1,
  },
  dusk: {
    sky: ["#2b3b6b", "#e8a46a"],
    hemisphere: { sky: "#5a6c9a", ground: "#3a3530", intensity: 0.9 },
    sun: { intensity: 0, shadows: false },
    wetTint: null,
    wet: 0,
  },
  night: {
    sky: ["#0b1022", "#1b2440"],
    hemisphere: { sky: "#2a3550", ground: "#15151a", intensity: 0.25 },
    sun: { intensity: 0, shadows: false },
    wetTint: null,
    wet: 0,
  },
};

const mixColour = (a: string, b: string, k: number) => `#${new Color(a).lerp(new Color(b), k).getHexString()}`;
const mixNumber = (a: number, b: number, k: number) => a + (b - a) * k;

export const mixLooks = (a: WeatherLook, b: WeatherLook, k: number): WeatherLook =>
  k <= 0
    ? a
    : k >= 1
      ? b
      : {
          sky: [mixColour(a.sky[0], b.sky[0], k), mixColour(a.sky[1], b.sky[1], k)],
          hemisphere: {
            sky: mixColour(a.hemisphere.sky, b.hemisphere.sky, k),
            ground: mixColour(a.hemisphere.ground, b.hemisphere.ground, k),
            intensity: mixNumber(a.hemisphere.intensity, b.hemisphere.intensity, k),
          },
          sun: {
            intensity: mixNumber(a.sun.intensity, b.sun.intensity, k),
            shadows: k < 0.5 ? a.sun.shadows : b.sun.shadows,
          },
          wetTint: k < 0.5 ? a.wetTint : b.wetTint,
          wet: mixNumber(a.wet, b.wet, k),
        };

const luminance = (hex: string) => {
  const c = new Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
};

export const facadeLight = (look: WeatherLook) =>
  ((luminance(look.hemisphere.sky) + luminance(look.hemisphere.ground)) / 2) * look.hemisphere.intensity +
  look.sun.intensity;

export const SIGN_LIGHT = Object.fromEntries(
  (Object.keys(WEATHER) as Weather[]).map((w) => [w, facadeLight(WEATHER[w]) / facadeLight(WEATHER.sunny)]),
) as Readonly<Record<Weather, number>>;

export const RAIN_VISIBILITY = 3000;
const MATCHED_AT = 150;

export const hazeAt = (depth: number, density: number) => 1 - Math.exp(-((density * depth) ** 2));

export const HAZE: Readonly<Record<Weather, { readonly colour: string; readonly density: number } | null>> = {
  sunny: null,
  rain: { colour: WEATHER.rain.sky[1], density: Math.sqrt(Math.log(50) / (RAIN_VISIBILITY * MATCHED_AT)) },
  dusk: null,
  night: null,
};

export const hazeOf = (look: WeatherLook) =>
  look.wet > 0 ? { colour: HAZE.rain!.colour, density: HAZE.rain!.density * look.wet } : null;

export const signLightOf = (look: WeatherLook) => facadeLight(look) / facadeLight(WEATHER.sunny);

export const PUDDLES: readonly {
  readonly x: number;
  readonly z: number;
  readonly rx: number;
  readonly rz: number;
}[] = [
  { x: 4.5, z: 0.3, rx: 0.45, rz: 0.25 },
  { x: -10.5, z: 0.4, rx: 0.5, rz: 0.3 },
  { x: 3.0, z: 2.25, rx: 0.7, rz: 0.16 },
  { x: -0.6, z: 0.85, rx: 0.4, rz: 0.22 },
  { x: 11.5, z: -0.3, rx: 0.5, rz: 0.3 },
];
