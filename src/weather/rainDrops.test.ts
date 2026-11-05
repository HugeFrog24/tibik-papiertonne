import { Vector3 } from "three";
import { expect, test } from "vitest";
import { bodyColliders } from "../characters/skeleton";
import { collide, nearby, sphere, type Solid } from "../physics/collision";
import {
  BINS,
  BUILDING_HEIGHT,
  FACADE_Z,
  acrossZ,
  GROUND,
  STREET_PARTS,
  worldSolids,
} from "../street/layout";
import { RIG, TIBIK_REST } from "../Tibik/rig";
import type { Vec3 } from "../toon/primitives";
import {
  RAIN,
  RAIN_AREA,
  RAIN_DIR,
  columnHit,
  firstHit,
  rainAt,
  rainColumns,
  rainGroundY,
  type Drop,
  clearOfLens,
  lensFade,
} from "./rainDrops";
import { STREAK_LENGTH } from "./rainStreaks";
import { frameHeightAt } from "../toon/frameHeight";

const SOLIDS = worldSolids(BINS.map(() => 0));
const TIBIK = bodyColliders(RIG, {
  position: [-2.6, 0, -0.9],
  rotationY: 0,
  pose: TIBIK_REST,
});
const BODIES = [
  ...TIBIK.torso,
  ...TIBIK.head,
  ...TIBIK.leftArm,
  ...TIBIK.rightArm,
  ...TIBIK.legs,
];
const CAMERA: Vec3 = [-1.0, 1.4, 4.0];
const TIMES = [0.5, 7.25, 20];

const points = (d: Drop) =>
  Array.from({ length: 8 }, (_, k) =>
    new Vector3(...d.tail).lerp(new Vector3(...d.head), k / 7),
  );

const inside = (p: Vector3, s: Solid) =>
  (collide(sphere("rain", p, 1e-4), s)?.depth ?? 0) > 1e-3;

test("every streak lies outside every solid and Tibik, and never below the ground it falls on", () => {
  const others = SOLIDS.filter((s) => s !== GROUND);
  for (const t of TIMES)
    for (const d of rainAt(t, CAMERA, SOLIDS, BODIES)) {
      const mid = new Vector3(...d.head).lerp(new Vector3(...d.tail), 0.5);
      const near = nearby([...others, ...BODIES], mid, RAIN.streak);
      for (const p of points(d)) {
        expect(p.y).toBeGreaterThanOrEqual(rainGroundY(p.x, p.z) - 1e-9);
        for (const s of near)
          expect(inside(p, s), `${d.id} in ${s.name}`).toBe(false);
      }
    }
});

const segmentHitsBox = (
  a: Vector3,
  b: Vector3,
  lo: readonly number[],
  hi: readonly number[],
) => {
  let enter = 0;
  let leave = 1;
  const d = b.clone().sub(a);
  for (const [k, axis] of (["x", "y", "z"] as const).entries()) {
    if (Math.abs(d[axis]) < 1e-12) {
      if (a[axis] < lo[k] || a[axis] > hi[k]) return false;
      continue;
    }
    const t0 = (lo[k] - a[axis]) / d[axis];
    const t1 = (hi[k] - a[axis]) / d[axis];
    enter = Math.max(enter, Math.min(t0, t1));
    leave = Math.min(leave, Math.max(t0, t1));
    if (enter > leave) return false;
  }
  return true;
};

test(
  "under a balcony it stays dry: no drop's path ever crosses the sheltered space below a slab",
  { timeout: 60_000 },
  () => {
    const slabs = STREET_PARTS.filter((p) => p.name === "balcony");
    expect(slabs.length).toBeGreaterThan(0);
    const sheltered = slabs.map(
      ({ center: [cx, cy, cz], size: [sx, sy, sz] }) => ({
        lo: [cx - sx / 2 + 0.3, cy - sy / 2 - 1.5, FACADE_Z],
        hi: [cx + sx / 2 - 0.3, cy - sy / 2 - 1e-6, cz + sz / 2 - 0.1],
      }),
    );
    for (const c of rainColumns()) {
      const origin = new Vector3(c.x, RAIN_AREA.top, c.z);
      const stop = columnHit(c.id, SOLIDS, BODIES);
      const end = origin.clone().addScaledVector(RAIN_DIR, stop.distance);
      for (const box of sheltered)
        expect(segmentHitsBox(origin, end, box.lo, box.hi), `${c.id}`).toBe(
          false,
        );
    }
  },
);

test("rain never falls inside the house or the neighbours' houses: nothing behind the facade line", () => {
  for (const t of TIMES)
    for (const d of rainAt(t, CAMERA, SOLIDS, BODIES))
      for (const p of [d.head, d.tail])
        expect(p[2]).toBeGreaterThanOrEqual(FACADE_Z - 1e-9);
});

test("no drop right in front of the lens", () => {
  const eye = new Vector3(...CAMERA);
  for (const t of TIMES)
    for (const d of rainAt(t, CAMERA, SOLIDS, BODIES))
      for (const p of [d.head, d.tail])
        expect(eye.distanceTo(new Vector3(...p))).toBeGreaterThanOrEqual(
          RAIN.nearCamera,
        );
});

test("Tibik keeps the ground under him dry: drops falling onto him stop on him", () => {
  const head = TIBIK.head[0].center;
  const lift = (RAIN_AREA.top - head.y) / -RAIN_DIR.y;
  const origin = head.clone().addScaledVector(RAIN_DIR, -lift);
  const hit = firstHit(origin, RAIN_DIR, SOLIDS, BODIES);
  expect(hit.open).toBe(false);
  expect(hit.point.y).toBeGreaterThan(1);
  for (const t of TIMES)
    for (const d of rainAt(t, CAMERA, SOLIDS, BODIES))
      if (d.splash)
        expect(
          Math.hypot(d.splash.at[0] + 2.6, d.splash.at[2] + 0.9),
        ).toBeGreaterThan(0.2);
});

test("a splash only where a drop meets open ground, and only briefly", () => {
  let splashes = 0;
  for (const t of TIMES)
    for (const d of rainAt(t, CAMERA, SOLIDS, BODIES))
      if (d.splash) {
        splashes++;
        const [x, y, z] = d.splash.at;
        expect(y).toBeCloseTo(rainGroundY(x, z), 9);
        expect(d.splash.age).toBeGreaterThanOrEqual(0);
        expect(d.splash.age).toBeLessThanOrEqual(RAIN.splash);
      }
  expect(splashes).toBeGreaterThan(0);
});

test("the same instant is the same rain, in any order", () => {
  const first = rainAt(7.25, CAMERA, SOLIDS, BODIES);
  rainAt(20, CAMERA, SOLIDS, BODIES);
  rainAt(0.5, CAMERA, SOLIDS, BODIES);
  expect(rainAt(7.25, CAMERA, SOLIDS, BODIES)).toEqual(first);
});

test("every drop starts above the house, in open air", () => {
  for (const c of rainColumns()) {
    const o = new Vector3(c.x, RAIN_AREA.top, c.z);
    for (const s of nearby(SOLIDS, o, 0.01))
      expect(inside(o, s), `${c.id} starts in ${s.name}`).toBe(false);
  }
});

test("steady summer rain: one drop per column, columns spread evenly over the street", () => {
  const columns = rainColumns();
  const area =
    (RAIN_AREA.x[1] - RAIN_AREA.x[0]) * (RAIN_AREA.z[1] - RAIN_AREA.z[0]);
  expect(columns).toHaveLength(Math.round(RAIN.perSquareMetre * area));
  const [mx, mz] = [
    (RAIN_AREA.x[0] + RAIN_AREA.x[1]) / 2,
    (RAIN_AREA.z[0] + RAIN_AREA.z[1]) / 2,
  ];
  for (const [sx, sz] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]) {
    const share =
      columns.filter(
        (c) => Math.sign(c.x - mx) === sx && Math.sign(c.z - mz) === sz,
      ).length / columns.length;
    expect(share).toBeGreaterThan(0.17);
    expect(share).toBeLessThan(0.33);
  }
  const ids = new Set<number>();
  for (const d of rainAt(7.25, CAMERA, SOLIDS, BODIES)) {
    expect(ids.has(d.id)).toBe(false);
    ids.add(d.id);
  }
  expect(ids.size).toBeGreaterThan(0.7 * columns.length);
});

test("no drop stops in mid-air: every stop is on open ground, on a solid, or on the facade line below the roof", () => {
  const others = SOLIDS.filter((s) => s !== GROUND);
  for (const c of rainColumns()) {
    const origin = new Vector3(c.x, RAIN_AREA.top, c.z);
    const hit = firstHit(origin, RAIN_DIR, SOLIDS, []);
    if (hit.open) continue;
    const onSolid = nearby(others, hit.point, 0.01).some(
      (s) => collide(sphere("stop", hit.point, 1e-4), s) !== null,
    );
    const onFacade =
      Math.abs(hit.point.z - FACADE_Z) < 1e-9 && hit.point.y <= BUILDING_HEIGHT;
    const onKerb = hit.point.y <= 0.2;
    expect(
      onSolid || onFacade || onKerb,
      `${c.id} at ${hit.point.toArray()}`,
    ).toBe(true);
  }
});

test("the cached and pruned hit is the brute-force hit for every column, lids open or shut, Tibik there or not", () => {
  for (const [lids, bodies] of [
    [0, []],
    [1.2, BODIES],
  ] as const) {
    const solids = worldSolids(
      BINS.map(() => lids),
      lids,
    );
    for (const c of rainColumns()) {
      const origin = new Vector3(c.x, RAIN_AREA.top, c.z);
      const brute = firstHit(origin, RAIN_DIR, solids, bodies);
      const pruned = columnHit(c.id, solids, bodies);
      expect(pruned.distance, `${c.id}`).toBeCloseTo(brute.distance, 9);
      expect(pruned.open).toBe(brute.open);
    }
  }
}, 60_000);

test("rain reaches across to the far facade", () => {
  expect(RAIN_AREA.z[1]).toBe(acrossZ(FACADE_Z));
});

test("a ray starting inside Tibik stops at once", () => {
  const inside = TIBIK.torso[0].center.clone();
  expect(firstHit(inside, RAIN_DIR, [], BODIES).distance).toBe(0);
});

test("rain needs the street's solids to stop on", () => {
  expect(() => rainAt(0, CAMERA, [], [])).toThrow();
});

test("no streak passes within RAIN.nearCamera of the lens, not even its middle", () => {
  const eye = new Vector3(0, 1.4, 0);
  const across = RAIN.nearCamera - 0.015;
  const half = RAIN.streak / 2;
  const grazing = { id: 0, head: [across, 1.4 - half, 0] as Vec3, tail: [across, 1.4 + half, 0] as Vec3, splash: null };
  expect(eye.distanceTo(new Vector3(...grazing.head))).toBeGreaterThan(RAIN.nearCamera);
  expect(clearOfLens(eye, grazing)).toBe(false);
  const clear = { ...grazing, head: [RAIN.nearCamera + 0.01, 1.3, 0] as Vec3, tail: [RAIN.nearCamera + 0.01, 1.5, 0] as Vec3 };
  expect(clearOfLens(eye, clear)).toBe(true);
});

test("drops near the camera are drawn fainter, those further off at full strength", () => {
  expect(lensFade(RAIN.nearCamera)).toBeLessThan(0.4);
  expect(lensFade(1)).toBeGreaterThan(lensFade(RAIN.nearCamera));
  expect(lensFade(1)).toBeLessThan(1);
  expect(lensFade(5)).toBe(1);
  for (let d = RAIN.nearCamera; d < 5; d += 0.1) expect(lensFade(d + 0.1)).toBeGreaterThanOrEqual(lensFade(d));
});

test("rain sets in: a share of the columns falls, and as the share grows more join, the earlier ones falling on", () => {
  const all = rainAt(7.25, CAMERA, SOLIDS, BODIES);
  const ids = (share: number) => new Set(rainAt(7.25, CAMERA, SOLIDS, BODIES, { share }).map((d) => d.id));
  expect(ids(0).size).toBe(0);
  expect(ids(1).size).toBe(all.length);
  const few = ids(0.25);
  const more = ids(0.6);
  expect(few.size / all.length).toBeGreaterThan(0.15);
  expect(few.size / all.length).toBeLessThan(0.35);
  for (const id of few) expect(more.has(id)).toBe(true);
  expect(rainAt(7.25, CAMERA, SOLIDS, BODIES, { share: 0.6 }).every((d) => all.some((a) => a.id === d.id && a.head.every((v, i) => v === d.head[i])))).toBe(true);
});

const FOV = 50;
const span = (a: Vec3, b: Vec3) => new Vector3(...a).distanceTo(new Vector3(...b));

test("far off a streak is drawn long enough to read as rain, at least 27 lines of a 1080-line frame, stretched back along its own fall and never above the sky it fell from", () => {
  const plain = new Map(rainAt(7.25, CAMERA, SOLIDS, BODIES).map((d) => [d.id, d]));
  let stretched = 0;
  for (const d of rainAt(7.25, CAMERA, SOLIDS, BODIES, { fov: FOV })) {
    const p = plain.get(d.id);
    if (!p || d.splash) continue;
    expect(d.head).toEqual(p.head);
    const k = Math.max(1, (STREAK_LENGTH.leastOfFrame * frameHeightAt(span(CAMERA, d.head), FOV)) / RAIN.streak);
    const fromTheSky = (RAIN_AREA.top - d.head[1]) / -RAIN_DIR.y;
    expect(span(d.head, d.tail)).toBeCloseTo(Math.min(span(p.head, p.tail) * k, fromTheSky), 6);
    const along = new Vector3(...d.head).sub(new Vector3(...d.tail));
    if (along.length() > 1e-6) expect(along.normalize().dot(RAIN_DIR)).toBeCloseTo(1, 9);
    if (k > 1.01) stretched++;
  }
  expect(stretched).toBeGreaterThan(100);
});

test("drawn long, every streak still lies outside every solid and Tibik", () => {
  const others = SOLIDS.filter((s) => s !== GROUND);
  for (const t of TIMES)
    for (const d of rainAt(t, CAMERA, SOLIDS, BODIES, { fov: FOV })) {
      const mid = new Vector3(...d.head).lerp(new Vector3(...d.tail), 0.5);
      const near = nearby([...others, ...BODIES], mid, span(d.head, d.tail));
      for (const p of points(d)) {
        expect(p.y).toBeGreaterThanOrEqual(rainGroundY(p.x, p.z) - 1e-9);
        for (const s of near) expect(inside(p, s), `${d.id} in ${s.name}`).toBe(false);
      }
    }
});
