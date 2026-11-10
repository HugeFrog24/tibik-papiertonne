import type { Vector3 } from "three";
import type { Obb, Sphere } from "./collision";

export const rayObb = (origin: Vector3, dir: Vector3, box: Obb) => {
  const offset = origin.clone().sub(box.center);
  let near = -Infinity;
  let far = Infinity;
  for (let i = 0; i < 3; i++) {
    const o = offset.dot(box.axes[i]);
    const d = dir.dot(box.axes[i]);
    const h = box.half[i];
    if (Math.abs(d) < 1e-12) {
      if (Math.abs(o) > h) return Infinity;
      continue;
    }
    const a = (-h - o) / d;
    const b = (h - o) / d;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return Infinity;
  }
  return far < 0 ? Infinity : Math.max(0, near);
};

export const raySphere = (origin: Vector3, dir: Vector3, s: Sphere) => {
  const offset = origin.clone().sub(s.center);
  const b = offset.dot(dir);
  const c = offset.lengthSq() - s.radius * s.radius;
  const disc = b * b - c;
  if (disc < 0) return Infinity;
  if (c <= 0) return 0;
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : Infinity;
};

export type Sight = { readonly eye: Vector3; readonly dir: Vector3; readonly distance: number };

export const sightLine = (eye: Vector3, point: Vector3): Sight => {
  const along = point.clone().sub(eye);
  const distance = along.length();
  return { eye, dir: along.divideScalar(distance), distance };
};

export const boxInTheWay = ({ eye, dir, distance }: Sight, box: Obb, margin = 0) => rayObb(eye, dir, box) < distance - margin;

export const ballInTheWay = ({ eye, dir, distance }: Sight, centre: Vector3, radius: number, margin = 0) => {
  const along = centre.clone().sub(eye).dot(dir);
  return along > 0 && along < distance - margin && centre.distanceTo(eye.clone().addScaledVector(dir, along)) < radius;
};
