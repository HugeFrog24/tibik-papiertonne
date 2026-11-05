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
