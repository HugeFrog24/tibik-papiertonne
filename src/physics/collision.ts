import { Euler, Matrix4, Quaternion, Vector3 } from "three";

export type Sphere = {
  readonly kind: "sphere";
  readonly name: string;
  readonly center: Vector3;
  readonly radius: number;
};

export type Obb = {
  readonly kind: "obb";
  readonly name: string;
  readonly center: Vector3;
  readonly axes: readonly [Vector3, Vector3, Vector3];
  readonly half: readonly [number, number, number];
};

export type HalfSpace = {
  readonly kind: "half";
  readonly name: string;
  readonly normal: Vector3;
  readonly offset: number;
};

export type Solid = Obb | HalfSpace | Sphere;

export type Contact = {
  readonly a: string;
  readonly b: string;
  readonly depth: number;
  readonly normal: Vector3;
};

export const sphere = (name: string, center: Vector3, radius: number): Sphere => ({
  kind: "sphere",
  name,
  center,
  radius,
});

export const capsule = (name: string, a: Vector3, b: Vector3, radius: number): Sphere[] => {
  const count = Math.max(2, Math.ceil(a.distanceTo(b) / (radius * 0.5)) + 1);
  return Array.from({ length: count }, (_, i) =>
    sphere(name, a.clone().lerp(b, i / (count - 1)), radius),
  );
};

export const obb = (
  name: string,
  matrix: Matrix4,
  size: readonly [number, number, number],
  localCenter: readonly [number, number, number] = [0, 0, 0],
): Obb => {
  const position = new Vector3();
  const rotation = new Quaternion();
  const scale = new Vector3();
  matrix.decompose(position, rotation, scale);
  return {
    kind: "obb",
    name,
    center: new Vector3(...localCenter).applyMatrix4(matrix),
    axes: [
      new Vector3(1, 0, 0).applyQuaternion(rotation),
      new Vector3(0, 1, 0).applyQuaternion(rotation),
      new Vector3(0, 0, 1).applyQuaternion(rotation),
    ],
    half: [size[0] / 2, size[1] / 2, size[2] / 2],
  };
};

export const halfSpace = (name: string, normal: Vector3, offset: number): HalfSpace => ({
  kind: "half",
  name,
  normal: normal.clone().normalize(),
  offset,
});

export const frame = (
  parent: Matrix4,
  position: readonly [number, number, number],
  rotation?: Euler,
) =>
  parent
    .clone()
    .multiply(
      new Matrix4().compose(
        new Vector3(...position),
        new Quaternion().setFromEuler(rotation ?? new Euler()),
        new Vector3(1, 1, 1),
      ),
    );

export const origin = (m: Matrix4) => new Vector3().setFromMatrixPosition(m);

export const pointIn = (m: Matrix4, p: readonly [number, number, number]) =>
  new Vector3(...p).applyMatrix4(m);

const sphereVsObb = (s: Sphere, o: Obb): Contact | null => {
  const d = s.center.clone().sub(o.center);
  const local = o.axes.map((axis) => d.dot(axis));
  const clamped = local.map((v, i) => Math.max(-o.half[i], Math.min(o.half[i], v)));
  const offset = local.map((v, i) => v - clamped[i]);
  const distance = Math.hypot(...offset);

  if (distance > 0) {
    const depth = s.radius - distance;
    if (depth <= 0) {
      return null;
    }
    const normal = new Vector3();
    offset.forEach((v, i) => normal.addScaledVector(o.axes[i], v / distance));
    return { a: s.name, b: o.name, depth, normal };
  }

  let best = 0;
  for (let i = 1; i < 3; i++) {
    if (o.half[i] - Math.abs(local[i]) < o.half[best] - Math.abs(local[best])) {
      best = i;
    }
  }
  return {
    a: s.name,
    b: o.name,
    depth: s.radius + o.half[best] - Math.abs(local[best]),
    normal: o.axes[best].clone().multiplyScalar(Math.sign(local[best]) || 1),
  };
};

const sphereVsHalf = (s: Sphere, h: HalfSpace): Contact | null => {
  const depth = h.offset - (s.center.dot(h.normal) - s.radius);
  return depth > 0 ? { a: s.name, b: h.name, depth, normal: h.normal.clone() } : null;
};

const projectedRadius = (o: Obb, axis: Vector3) =>
  o.half[0] * Math.abs(o.axes[0].dot(axis)) +
  o.half[1] * Math.abs(o.axes[1].dot(axis)) +
  o.half[2] * Math.abs(o.axes[2].dot(axis));

const obbVsObb = (a: Obb, b: Obb): Contact | null => {
  const axes: Vector3[] = [...a.axes, ...b.axes];
  for (const u of a.axes) {
    for (const v of b.axes) {
      const cross = u.clone().cross(v);
      if (cross.lengthSq() > 1e-8) {
        axes.push(cross.normalize());
      }
    }
  }
  const between = b.center.clone().sub(a.center);
  let best: Contact | null = null;
  for (const axis of axes) {
    const distance = between.dot(axis);
    const overlap = projectedRadius(a, axis) + projectedRadius(b, axis) - Math.abs(distance);
    if (overlap <= 0) {
      return null;
    }
    if (best === null || overlap < best.depth) {
      best = {
        a: a.name,
        b: b.name,
        depth: overlap,
        normal: axis.clone().multiplyScalar(distance > 0 ? -1 : 1),
      };
    }
  }
  return best;
};

const obbVsHalf = (o: Obb, h: HalfSpace): Contact | null => {
  const lowest = o.center.dot(h.normal) - projectedRadius(o, h.normal);
  const depth = h.offset - lowest;
  return depth > 0 ? { a: o.name, b: h.name, depth, normal: h.normal.clone() } : null;
};

const sphereVsSphere = (a: Sphere, b: Sphere): Contact | null => {
  const between = a.center.clone().sub(b.center);
  const distance = between.length();
  const depth = a.radius + b.radius - distance;
  if (depth <= 0) {
    return null;
  }
  const normal = distance > 0 ? between.divideScalar(distance) : new Vector3(0, 1, 0);
  return { a: a.name, b: b.name, depth, normal };
};

const flipped = (c: Contact | null): Contact | null =>
  c ? { a: c.b, b: c.a, depth: c.depth, normal: c.normal.clone().negate() } : null;

export const collide = (a: Sphere | Obb, b: Solid): Contact | null => {
  if (a.kind === "sphere") {
    if (b.kind === "half") return sphereVsHalf(a, b);
    if (b.kind === "sphere") return sphereVsSphere(a, b);
    return sphereVsObb(a, b);
  }
  if (b.kind === "half") return obbVsHalf(a, b);
  if (b.kind === "sphere") return flipped(sphereVsObb(b, a));
  return obbVsObb(a, b);
};

export const contacts = (
  shapes: readonly (Sphere | Obb)[],
  solids: readonly Solid[],
): Contact[] => {
  const found: Contact[] = [];
  for (const shape of shapes) {
    for (const solid of solids) {
      const contact = collide(shape, solid);
      if (contact) {
        found.push(contact);
      }
    }
  }
  return found;
};

export const deepest = (found: readonly Contact[]) =>
  found.reduce((max, c) => Math.max(max, c.depth), 0);

export const smallestClearing = (
  penetration: (amount: number) => number,
  max: number,
  scanStep = 0.05,
) => {
  if (penetration(0) <= 0) {
    return 0;
  }
  let low = 0;
  for (let high = scanStep; high <= max + 1e-9; high += scanStep) {
    if (penetration(high) <= 0) {
      for (let i = 0; i < 12; i++) {
        const mid = (low + high) / 2;
        if (penetration(mid) <= 0) {
          high = mid;
        } else {
          low = mid;
        }
      }
      return high;
    }
    low = high;
  }
  return max;
};

export const nearby = (solids: readonly Solid[], point: Vector3, reach: number): Solid[] =>
  solids.filter((s) => {
    if (s.kind === "half") {
      return true;
    }
    const extent = s.kind === "sphere" ? s.radius : Math.hypot(...s.half);
    return s.center.distanceTo(point) <= reach + extent;
  });

export const sphereObbGap = (s: Sphere, o: Obb) => {
  const d = s.center.clone().sub(o.center);
  const outside = o.axes.map((axis, i) => Math.max(0, Math.abs(d.dot(axis)) - o.half[i]));
  const distance = Math.hypot(...outside);
  return distance > 0 ? distance - s.radius : -(collide(s, o)?.depth ?? 0);
};

export const boxGap = (a: Obb, b: Solid): number => {
  if (b.kind === "half") {
    return a.center.dot(b.normal) - projectedRadius(a, b.normal) - b.offset;
  }
  if (b.kind === "sphere") {
    return sphereObbGap(b, a);
  }
  const axes: Vector3[] = [...a.axes, ...b.axes];
  for (const u of a.axes) {
    for (const v of b.axes) {
      const cross = u.clone().cross(v);
      if (cross.lengthSq() > 1e-8) {
        axes.push(cross.normalize());
      }
    }
  }
  const between = b.center.clone().sub(a.center);
  let gap = -Infinity;
  for (const axis of axes) {
    const separation = Math.abs(between.dot(axis)) - projectedRadius(a, axis) - projectedRadius(b, axis);
    gap = Math.max(gap, separation);
  }
  return gap;
};
