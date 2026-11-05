import { Color, Vector3 } from "three";
import type { Solid } from "../physics/collision";
import { BUILDING_HEIGHT, FACADE_Z, acrossZ } from "../street/building";
import { BINS, worldSolids } from "../street/layout";
import { RAIN_SOLIDS } from "../street/rainSolids";
import { PARAPET } from "../street/townShape";
import type { WeatherLook } from "./overcast";
import { rayObb, raySphere } from "../physics/rays";
import { RAIN_DIR, RAIN_TOP, rainGroundY } from "./rainDrops";

export const RAIN_SHADOW = { x: [-48, 48] as const, z: [FACADE_Z, acrossZ(FACADE_Z)] as const, step: 0.1 };

const UP_THE_RAIN = RAIN_DIR.clone().negate();
const ROOFLINE = BUILDING_HEIGHT + PARAPET.height;

export const LEE_STRIP = ROOFLINE * (UP_THE_RAIN.z / UP_THE_RAIN.y);

const CELL = 2;
const cellOf = (v: number) => Math.floor(v / CELL);

let index: Map<string, Solid[]> | null = null;

const solidsNear = () => {
  if (index) return index;
  const map = new Map<string, Solid[]>();
  const all = [...new Set([...RAIN_SOLIDS, ...worldSolids(BINS.map(() => 0))])];
  for (const s of all) {
    if (s.kind === "half") continue;
    const reach = s.kind === "sphere" ? s.radius : s.bound;
    for (let i = cellOf(s.center.x - reach); i <= cellOf(s.center.x + reach); i++)
      for (let k = cellOf(s.center.z - reach); k <= cellOf(s.center.z + reach); k++) {
        const key = `${i},${k}`;
        map.set(key, [...(map.get(key) ?? []), s]);
      }
  }
  index = map;
  return map;
};

const insideAHouse = (y: number, z: number) => (z < FACADE_Z || z > acrossZ(FACADE_Z)) && y < ROOFLINE;

export const shelteredAt = (x: number, z: number) => {
  const origin = new Vector3(x, rainGroundY(x, z) + 0.01, z);
  const reach = (RAIN_TOP - origin.y) / UP_THE_RAIN.y;
  const toTheFacade = UP_THE_RAIN.z > 0 ? (acrossZ(FACADE_Z) - z) / UP_THE_RAIN.z : (FACADE_Z - z) / UP_THE_RAIN.z;
  if (toTheFacade >= 0 && toTheFacade < reach && insideAHouse(origin.y + toTheFacade * UP_THE_RAIN.y, z + toTheFacade * UP_THE_RAIN.z + Math.sign(UP_THE_RAIN.z) * 1e-6))
    return true;
  const end = origin.clone().addScaledVector(UP_THE_RAIN, reach);
  const near = solidsNear();
  const seen = new Set<Solid>();
  for (let i = cellOf(Math.min(origin.x, end.x)); i <= cellOf(Math.max(origin.x, end.x)); i++)
    for (let k = cellOf(Math.min(origin.z, end.z)); k <= cellOf(Math.max(origin.z, end.z)); k++)
      for (const s of near.get(`${i},${k}`) ?? []) {
        if (seen.has(s)) continue;
        seen.add(s);
        const t = s.kind === "obb" ? rayObb(origin, UP_THE_RAIN, s) : s.kind === "sphere" ? raySphere(origin, UP_THE_RAIN, s) : Infinity;
        if (t > 1e-6 && t < reach) return true;
      }
  return false;
};

let mask: { readonly width: number; readonly height: number; readonly data: Uint8Array } | null = null;

export const rainShadowMask = () => {
  if (mask) return mask;
  const width = Math.round((RAIN_SHADOW.x[1] - RAIN_SHADOW.x[0]) / RAIN_SHADOW.step) + 1;
  const height = Math.round((RAIN_SHADOW.z[1] - RAIN_SHADOW.z[0]) / RAIN_SHADOW.step) + 1;
  const data = new Uint8Array(width * height);
  for (let j = 0; j < height; j++)
    for (let i = 0; i < width; i++)
      data[j * width + i] = shelteredAt(RAIN_SHADOW.x[0] + i * RAIN_SHADOW.step, RAIN_SHADOW.z[0] + j * RAIN_SHADOW.step) ? 0 : 255;
  mask = { width, height, data };
  return mask;
};

export const openSkyAt = (x: number, z: number) => {
  const { width, height, data } = rainShadowMask();
  const u = (x - RAIN_SHADOW.x[0]) / RAIN_SHADOW.step;
  const v = (z - RAIN_SHADOW.z[0]) / RAIN_SHADOW.step;
  if (u < 0 || v < 0 || u > width - 1 || v > height - 1) return 1;
  const i = Math.min(Math.floor(u), width - 2);
  const j = Math.min(Math.floor(v), height - 2);
  const a = u - i;
  const b = v - j;
  const at = (di: number, dj: number) => data[(j + dj) * width + i + di] / 255;
  return (at(0, 0) * (1 - a) + at(1, 0) * a) * (1 - b) + (at(0, 1) * (1 - a) + at(1, 1) * a) * b;
};

export const wetShade = (look: WeatherLook, open: number): [number, number, number] => {
  if (!look.wetTint) return [1, 1, 1];
  const tint = new Color(look.wetTint);
  return [1 + (tint.r - 1) * open, 1 + (tint.g - 1) * open, 1 + (tint.b - 1) * open];
};
