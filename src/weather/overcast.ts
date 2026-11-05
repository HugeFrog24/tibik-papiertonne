import { Color } from "three";

export type Weather = "sunny" | "rain";

export type WeatherLook = {
  readonly sky: readonly [string, string];
  readonly hemisphere: {
    readonly sky: string;
    readonly ground: string;
    readonly intensity: number;
  };
  readonly sun: { readonly intensity: number; readonly shadows: boolean };
  readonly wetTint: string | null;
};

export const WEATHER: Readonly<Record<Weather, WeatherLook>> = {
  sunny: {
    sky: ["#8ecdf0", "#cfeaf7"],
    hemisphere: { sky: "#ffffff", ground: "#b5ad9c", intensity: 1.7 },
    sun: { intensity: 2.0, shadows: true },
    wetTint: null,
  },
  rain: {
    sky: ["#8d949b", "#b9bfc4"],
    hemisphere: { sky: "#d9dde0", ground: "#6f7377", intensity: 2.1 },
    sun: { intensity: 0.45, shadows: true },
    wetTint: "#9a9fa3",
  },
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
