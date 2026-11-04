import type { Vector3 } from "three";
import {
  collide,
  sphere,
  type Contact,
  type Solid,
  type Sphere,
} from "../physics/collision";

export const TOLERANCE = 0.005;

export const mm = (metres: number, digits = 1) =>
  `${(metres * 1000).toFixed(digits)} mm`;

export const penetrations = <T>(
  times: readonly T[],
  violationsAt: (t: T) => readonly Contact[],
  label: (t: T) => string,
): string[] =>
  times.flatMap((t) =>
    violationsAt(t)
      .filter((c) => c.depth > TOLERANCE)
      .map((c) => `${label(t)}: ${c.a} is ${mm(c.depth, 0)} inside ${c.b}`),
  );

export const seconds = (t: number) => `${t.toFixed(2)} s`;
export const frameLabel = (frame: number) => `frame ${frame}`;
export const framesOf = (duration: number, fps: number, step = 1) =>
  Array.from(
    { length: Math.ceil((duration * fps) / step) },
    (_, i) => i * step,
  );

export const lensProblems = (
  t: number,
  lens: Vector3,
  radius: number,
  solids: readonly Solid[],
  bodies: readonly Sphere[] = [],
  keepOff = radius,
): string[] => {
  const probe = sphere("camera", lens, radius);
  return [
    ...solids
      .filter((s) => collide(probe, s))
      .map((s) => `${seconds(t)}: camera against ${s.name}`),
    ...bodies
      .map((s) => ({ s, clear: lens.distanceTo(s.center) - s.radius }))
      .filter(({ clear }) => clear < keepOff)
      .map(({ s, clear }) => `${seconds(t)}: camera ${mm(clear, 0)} from ${s.name}`),
  ];
};
