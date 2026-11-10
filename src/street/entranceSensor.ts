import { FPS } from "../frameRate";
import type { Vec3 } from "../toon/primitives";
import { ENTRANCE_LAMP } from "./layout";

export const SENSOR = { range: 2.5, horizon: 120 };

type RootAt = (t: number) => Vec3;

const switchedOn = new WeakMap<RootAt, Map<string, number>>();

export const sensorSwitchesOn = (rootAt: RootAt, range: number, until = SENSOR.horizon) => {
  const key = `${range}/${until}`;
  const known = switchedOn.get(rootAt) ?? new Map<string, number>();
  switchedOn.set(rootAt, known);
  const cached = known.get(key);
  if (cached !== undefined) return cached;
  const [lx, , lz] = ENTRANCE_LAMP.center;
  let at = Infinity;
  for (let f = 0; f <= until * FPS; f++) {
    const [x, , z] = rootAt(f / FPS);
    if (Math.hypot(x - lx, z - lz) <= range) {
      at = f / FPS;
      break;
    }
  }
  known.set(key, at);
  return at;
};

export const sensorLampOn = (rootAt: RootAt, range: number, t: number) => t >= sensorSwitchesOn(rootAt, range);
