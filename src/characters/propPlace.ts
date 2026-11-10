import { Euler, Matrix4 } from "three";
import { frame } from "../physics/collision";
import type { Vec3 } from "../toon/primitives";
import { lerpVec3, smoothstep } from "./scalar";

export type PropPlace = {
  readonly position: Vec3;
  readonly rotation: Vec3;
};

export type PlaceStop = { readonly at: number; readonly place: PropPlace };

type Stop<T> = { readonly at: number; readonly value: T };

export const stopsAt = <T>(
  stops: readonly Stop<T>[],
  t: number,
): { readonly a: Stop<T>; readonly b: Stop<T>; readonly w: number } => {
  const next = stops.findIndex((p) => p.at > t);
  if (next <= 0) {
    const only = next === 0 ? stops[0] : stops[stops.length - 1];
    return { a: only, b: only, w: 0 };
  }
  const a = stops[next - 1];
  const b = stops[next];
  return { a, b, w: smoothstep((t - a.at) / (b.at - a.at)) };
};

export const placesAt = (stops: readonly PlaceStop[]) => {
  const values = stops.map((s) => ({ at: s.at, value: s.place }));
  return (t: number): PropPlace => {
    const { a, b, w } = stopsAt(values, t);
    return {
      position: lerpVec3(a.value.position, b.value.position, w),
      rotation: lerpVec3(a.value.rotation, b.value.rotation, w),
    };
  };
};

export const placeFrame = (base: Matrix4, place: PropPlace): Matrix4 =>
  frame(base, place.position, new Euler(...place.rotation));
