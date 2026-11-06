import { clamp, smoothstep } from "../characters/scalar";
import { LAMP_POOL, STREET_LAMPS, lampLightAt } from "../street/lamps";
import type { Vec3 } from "../toon/primitives";
import { daylightOf, type WeatherLook } from "./overcast";

export type RainLight = { readonly level: number; readonly warmth: number };

const SOURCES = STREET_LAMPS.map(lampLightAt);
const INNER = LAMP_POOL.angle * (1 - LAMP_POOL.penumbra);

const inCone = ([x, y, z]: Vec3, [sx, sy, sz]: Vec3) => {
  const dx = x - sx;
  const dy = y - sy;
  const dz = z - sz;
  const d = Math.hypot(dx, dy, dz);
  if (d === 0 || d > LAMP_POOL.reach) return 0;
  const angle = Math.acos(clamp(-dy / d, -1, 1));
  return 1 - smoothstep(clamp((angle - INNER) / (LAMP_POOL.angle - INNER), 0, 1));
};

export const rainLight = (look: WeatherLook, lampsOn: boolean) => {
  const day = daylightOf(look);
  return (point: Vec3): RainLight => {
    const lamp = lampsOn ? Math.max(0, ...SOURCES.map((source) => inCone(point, source))) : 0;
    const level = Math.min(1, day + lamp);
    return { level, warmth: level === 0 ? 0 : lamp / (day + lamp) };
  };
};

