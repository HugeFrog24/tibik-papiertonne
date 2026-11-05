import { Vector3 } from "three";
import { random } from "remotion";
import type { Obb, Solid, Sphere } from "../physics/collision";
import { STREET_SOLIDS } from "../street/layout";
import { WIND } from "../physics/wind";
import {
  BUILDING_HEIGHT,
  FACADE_Z,
  KERB_DEPTH,
  KERB_Z,
  ROAD_Y,
  acrossZ,
} from "../street/building";
import type { Vec3 } from "../toon/primitives";
import { frameHeightAt } from "../toon/frameHeight";
import { STREAK_LENGTH } from "./rainStreaks";

export const RAIN = {
  perSquareMetre: 10,
  speed: 7,
  streak: 0.24,
  slant: 0.12,
  nearCamera: 0.4,
  splash: 0.12,
};

export const RAIN_DIR = new Vector3(
  WIND.direction.x * RAIN.slant,
  -1,
  WIND.direction.z * RAIN.slant,
).normalize();

const TOP = BUILDING_HEIGHT + 1;
const ABOVE_ROOF_DRIFT = ((TOP - BUILDING_HEIGHT) * -RAIN_DIR.z) / -RAIN_DIR.y;

export const RAIN_AREA = {
  x: [-16, 16] as const,
  z: [FACADE_Z + ABOVE_ROOF_DRIFT + 0.01, acrossZ(FACADE_Z)] as const,
  top: TOP,
};

export type Drop = {
  readonly id: number;
  readonly head: Vec3;
  readonly tail: Vec3;
  readonly splash: { readonly at: Vec3; readonly age: number } | null;
  readonly fade?: number;
};

const FADE = { from: 2.5, nearest: 0.3 };

export const lensFade = (distance: number) => {
  const k = Math.min(1, Math.max(0, (distance - RAIN.nearCamera) / (FADE.from - RAIN.nearCamera)));
  return FADE.nearest + (1 - FADE.nearest) * k;
};

const lensDistance = (eye: Vector3, drop: Pick<Drop, "head" | "tail">) => {
  const head = new Vector3(...drop.head);
  const tail = new Vector3(...drop.tail);
  const along = head.clone().sub(tail);
  const length = along.lengthSq();
  const k = length === 0 ? 0 : Math.min(1, Math.max(0, eye.clone().sub(tail).dot(along) / length));
  return eye.distanceTo(tail.addScaledVector(along, k));
};

export const clearOfLens = (eye: Vector3, drop: Pick<Drop, "head" | "tail">) =>
  lensDistance(eye, drop) >= RAIN.nearCamera;

export const rainGroundY = (_x: number, z: number) =>
  z > KERB_Z + KERB_DEPTH / 2 && z < acrossZ(KERB_Z) - KERB_DEPTH / 2
    ? ROAD_Y
    : 0;

const rayObb = (origin: Vector3, dir: Vector3, box: Obb) => {
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

const raySphere = (origin: Vector3, dir: Vector3, s: Sphere) => {
  const offset = origin.clone().sub(s.center);
  const b = offset.dot(dir);
  const c = offset.lengthSq() - s.radius * s.radius;
  const disc = b * b - c;
  if (disc < 0) return Infinity;
  if (c <= 0) return 0;
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : Infinity;
};

const KERB_FACES = [KERB_Z + KERB_DEPTH / 2, acrossZ(KERB_Z) - KERB_DEPTH / 2];

const rayGround = (origin: Vector3, dir: Vector3) => {
  const at = (t: number) => origin.clone().addScaledVector(dir, t);
  const top = (0 - origin.y) / dir.y;
  const onTop = at(top);
  if (rainGroundY(onTop.x, onTop.z) === 0) return { t: top, open: true };
  const road = (ROAD_Y - origin.y) / dir.y;
  const onRoad = at(road);
  if (rainGroundY(onRoad.x, onRoad.z) === ROAD_Y)
    return { t: road, open: true };
  const face = KERB_FACES.map((z) => (z - origin.z) / dir.z).find(
    (t) => t >= top && t <= road,
  );
  return { t: face ?? top, open: false };
};

type Hit = { readonly distance: number; readonly open: boolean };

const facadeStop = (origin: Vector3, dir: Vector3) => {
  if (dir.z >= 0) return Infinity;
  const t = (FACADE_Z - origin.z) / dir.z;
  return t >= 0 && origin.y + dir.y * t <= BUILDING_HEIGHT ? t : Infinity;
};

export const firstHit = (
  origin: Vector3,
  dir: Vector3,
  solids: readonly Solid[],
  bodies: readonly Sphere[],
  from?: Hit,
) => {
  const ground = from ?? rayGround(origin, dir);
  let distance = "t" in ground ? ground.t : ground.distance;
  let open = ground.open;
  if (!from) {
    const facade = facadeStop(origin, dir);
    if (facade < distance) {
      distance = facade;
      open = false;
    }
  }
  for (const s of solids) {
    if (s.kind === "half") continue;
    const t =
      s.kind === "obb" ? rayObb(origin, dir, s) : raySphere(origin, dir, s);
    if (t < distance) {
      distance = t;
      open = false;
    }
  }
  for (const b of bodies) {
    const t = raySphere(origin, dir, b);
    if (t < distance) {
      distance = t;
      open = false;
    }
  }
  return {
    distance,
    open,
    point: origin.clone().addScaledVector(dir, distance),
  };
};

let columns: { id: number; x: number; z: number; phase: number; onset: number }[] | null =
  null;

export const rainColumns = () => {
  if (columns) return columns;
  const [x0, x1] = RAIN_AREA.x;
  const [z0, z1] = RAIN_AREA.z;
  const count = Math.round(RAIN.perSquareMetre * (x1 - x0) * (z1 - z0));
  columns = Array.from({ length: count }, (_, id) => ({
    id,
    x: x0 + (x1 - x0) * random(`rain-x-${id}`),
    z: z0 + (z1 - z0) * random(`rain-z-${id}`),
    phase: random(`rain-phase-${id}`),
    onset: random(`rain-onset-${id}`),
  }));
  return columns;
};

const toVec3 = (v: Vector3): Vec3 => [v.x, v.y, v.z];

const FIXED = new Set<Solid>(STREET_SOLIDS);
let fixedHits: ReturnType<typeof firstHit>[] | null = null;

const fixedHitOf = (id: number, origin: Vector3) => {
  if (!fixedHits) fixedHits = [];
  fixedHits[id] ??= firstHit(origin, RAIN_DIR, STREET_SOLIDS, []);
  return fixedHits[id];
};

const reachOf = (s: Solid | Sphere) =>
  s.kind === "sphere" ? s.radius : s.kind === "obb" ? s.bound : Infinity;

const nearPath = (
  origin: Vector3,
  end: Vector3,
  s: Solid | Sphere,
): boolean => {
  if (s.kind === "half") return false;
  const [ax, az, bx, bz] = [origin.x, origin.z, end.x, end.z];
  const [px, pz] = [s.center.x, s.center.z];
  const [dx, dz] = [bx - ax, bz - az];
  const length = dx * dx + dz * dz;
  const k =
    length === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / length));
  return (
    Math.hypot(ax + k * dx - px, az + k * dz - pz) <= reachOf(s) + RAIN.streak
  );
};

const movingOf = (solids: readonly Solid[]) => {
  const given = new Set(solids);
  if (!STREET_SOLIDS.every((s) => given.has(s)))
    throw new Error("rain needs the street's solids (worldSolids)");
  return solids.filter((s) => s.kind !== "half" && !FIXED.has(s));
};

const hitOfColumn = (
  id: number,
  moving: readonly Solid[],
  bodies: readonly Sphere[],
) => {
  const column = rainColumns()[id];
  const origin = new Vector3(column.x, RAIN_AREA.top, column.z);
  const fixed = fixedHitOf(id, origin);
  const near = [...moving, ...bodies].filter((s) =>
    nearPath(origin, fixed.point, s),
  );
  const hit = near.length
    ? firstHit(
        origin,
        RAIN_DIR,
        near.filter((s): s is Solid => s.kind !== "sphere"),
        near.filter((s): s is Sphere => s.kind === "sphere"),
        fixed,
      )
    : fixed;
  return { origin, fixed, hit };
};

export const columnHit = (
  id: number,
  solids: readonly Solid[],
  bodies: readonly Sphere[],
) => hitOfColumn(id, movingOf(solids), bodies).hit;

export const rainAt = (
  t: number,
  camera: Vec3,
  solids: readonly Solid[],
  bodies: readonly Sphere[],
  { share = 1, fov }: { readonly share?: number; readonly fov?: number } = {},
): Drop[] => {
  const eye = new Vector3(...camera);
  const stretchAt = (head: Vector3) =>
    fov === undefined ? 1 : Math.max(1, (STREAK_LENGTH.leastOfFrame * frameHeightAt(eye.distanceTo(head), fov)) / RAIN.streak);
  const moving = movingOf(solids);
  const drops: Drop[] = [];
  for (const column of rainColumns()) {
    if (column.onset >= share) continue;
    const { origin, fixed, hit } = hitOfColumn(column.id, moving, bodies);
    const cycle = fixed.distance / RAIN.speed + RAIN.splash;
    const u = (((t / cycle + column.phase) % 1) + 1) % 1;
    const travelled = RAIN.speed * u * cycle;
    const stop = hit.distance;
    const at = (d: number) => origin.clone().addScaledVector(RAIN_DIR, d);
    let drop: Drop | null = null;
    if (travelled - RAIN.streak < stop) {
      const reached = Math.min(travelled, stop);
      const head = at(reached);
      const real = reached - Math.max(0, travelled - RAIN.streak);
      const tail = at(Math.max(0, reached - real * stretchAt(head)));
      drop = {
        id: column.id,
        head: toVec3(head),
        tail: toVec3(tail),
        splash: null,
      };
    } else if (hit.open) {
      const age = (travelled - stop) / RAIN.speed;
      if (age <= RAIN.splash) {
        const point = toVec3(hit.point);
        drop = {
          id: column.id,
          head: point,
          tail: point,
          splash: { at: point, age },
        };
      }
    }
    if (drop && clearOfLens(eye, drop))
      drops.push({ ...drop, fade: lensFade(lensDistance(eye, drop)) });
  }
  return drops;
};
