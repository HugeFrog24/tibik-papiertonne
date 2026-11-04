import { Vector3 } from "three";
import type { Vec3 } from "../toon/primitives";

export const ellipsoidFace = ([a, b, c]: Vec3) => {
  const depth = (x: number, y: number) =>
    c * Math.sqrt(Math.max(0, 1 - (x / a) ** 2 - (y / b) ** 2));
  const normal = (x: number, y: number) =>
    new Vector3(x / a ** 2, y / b ** 2, depth(x, y) / c ** 2).normalize();
  const point = (x: number, y: number, lift: number) =>
    new Vector3(x, y, depth(x, y)).addScaledVector(normal(x, y), lift);
  return { depth, normal, point };
};
