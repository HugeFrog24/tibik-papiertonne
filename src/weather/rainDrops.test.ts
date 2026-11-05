import { Box3, Vector3 } from "three";
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
import { RAIN_SOLIDS } from "../street/rainSolids";
import { BUILDING_HEIGHT as ROOF_LEVEL } from "../street/building";
import { roofParts } from "../street/townShape";
import type { Vec3 } from "../toon/primitives";
import {
  RAIN,
  RAIN_REACH,
  RAIN_FIELD,
  RAIN_TOP,
  reachFade,
  viewFrustum,
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
const ALL = [...new Set([...SOLIDS, ...RAIN_SOLIDS])];
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

test("every streak lies outside every solid and Tibik, and never below the ground it falls on", { timeout: 120_000 }, () => {
  const others = ALL.filter((s) => s !== GROUND);
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
      const origin = new Vector3(c.x, RAIN_TOP, c.z);
      const stop = columnHit(c.id, SOLIDS, BODIES);
      const end = origin.clone().addScaledVector(RAIN_DIR, stop.distance);
      for (const box of sheltered)
        expect(segmentHitsBox(origin, end, box.lo, box.hi), `${c.id}`).toBe(
          false,
        );
    }
  },
);

test("rain never falls inside the houses: behind either row's facade line it stays above the roofs", () => {
  for (const t of TIMES)
    for (const d of rainAt(t, CAMERA, SOLIDS, BODIES))
      for (const p of [d.head, d.tail])
        if (p[2] < FACADE_Z - 1e-9 || p[2] > acrossZ(FACADE_Z) + 1e-9) expect(p[1], `${d.id}`).toBeGreaterThanOrEqual(ROOF_LEVEL - 1e-9);
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
  const lift = (RAIN_TOP - head.y) / -RAIN_DIR.y;
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
    const o = new Vector3(c.x, RAIN_TOP, c.z);
    for (const s of nearby(ALL, o, 0.01))
      expect(inside(o, s), `${c.id} starts in ${s.name}`).toBe(false);
  }
});

test("steady summer rain: one drop per column, the columns spread evenly over the street and both rows' roofs", () => {
  const columns = rainColumns();
  const area = (RAIN_FIELD.x[1] - RAIN_FIELD.x[0]) * (RAIN_FIELD.z[1] - RAIN_FIELD.z[0]);
  expect(columns).toHaveLength(Math.round(RAIN.perCubicMetre * area * RAIN_TOP));
  const [mx, mz] = [(RAIN_FIELD.x[0] + RAIN_FIELD.x[1]) / 2, (RAIN_FIELD.z[0] + RAIN_FIELD.z[1]) / 2];
  for (const [sx, sz] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]) {
    const share = columns.filter((c) => Math.sign(c.x - mx) === sx && Math.sign(c.z - mz) === sz).length / columns.length;
    expect(share).toBeGreaterThan(0.23);
    expect(share).toBeLessThan(0.27);
  }
  const ids = new Set<number>();
  for (const d of rainAt(7.25, CAMERA, SOLIDS, BODIES)) {
    expect(ids.has(d.id)).toBe(false);
    ids.add(d.id);
  }
  expect(ids.size).toBeGreaterThan(1000);
});

test("the air is as full of rain high up as down in the street", () => {
  const above: Vec3 = [0, 14, 6];
  const drops = rainAt(7.25, above, SOLIDS, []);
  const inBox = (y0: number, y1: number) =>
    drops.filter((d) => !d.splash && d.head[0] > -8 && d.head[0] < 8 && d.head[2] > 2 && d.head[2] < 10 && d.head[1] >= y0 && d.head[1] < y1).length;
  const low = inBox(3, 9);
  const high = inBox(19, 25);
  expect(low).toBeGreaterThan(100);
  expect(high / low).toBeGreaterThan(0.85);
  expect(high / low).toBeLessThan(1.15);
});

test("rain falls on No. 12's row of roofs and stops on the slab, a parapet, the smoke vent or a vent pipe", () => {
  const top = Math.max(...roofParts().map((p) => p.center[1] + p.size[1] / 2));
  const onTheRoof = rainColumns().filter((c) => c.z < FACADE_Z);
  expect(onTheRoof.length).toBeGreaterThan(1000);
  for (const c of onTheRoof) {
    const hit = columnHit(c.id, SOLIDS, []);
    expect(hit.point.y, `${c.id}`).toBeGreaterThanOrEqual(ROOF_LEVEL - 1e-9);
    expect(hit.point.y, `${c.id}`).toBeLessThanOrEqual(top + 1e-9);
  }
});

test("far off the rain fades, and none is drawn past its reach", () => {
  expect(reachFade(RAIN_REACH.full)).toBe(1);
  expect(reachFade(RAIN_REACH.none)).toBe(0);
  for (let d = RAIN_REACH.full; d < RAIN_REACH.none; d += 0.5) expect(reachFade(d + 0.5)).toBeLessThanOrEqual(reachFade(d));
  const eye = new Vector3(...CAMERA);
  for (const d of rainAt(7.25, CAMERA, SOLIDS, BODIES)) {
    const far = eye.distanceTo(new Vector3(...d.head));
    expect(far).toBeLessThan(RAIN_REACH.none);
    expect(d.fade).toBeLessThanOrEqual(reachFade(far) + 1e-12);
  }
});

test("given the lens's view, it makes just the drops that fall in view, the same drops as without it", () => {
  const view = { target: [-3, 1.1, -1.4] as Vec3, fov: 45, aspect: 16 / 9 };
  const inView = rainAt(7.25, CAMERA, SOLIDS, BODIES, { view });
  const all = new Map(rainAt(7.25, CAMERA, SOLIDS, BODIES, { fov: view.fov }).map((d) => [d.id, d]));
  const frustum = viewFrustum(CAMERA, view);
  const seen = [...all.values()].filter((d) => frustum.intersectsBox(new Box3().setFromPoints([new Vector3(...d.head), new Vector3(...d.tail)])));
  expect(inView.length).toBeGreaterThan(30);
  expect(inView.length).toBeLessThan(all.size);
  expect(new Set(inView.map((d) => d.id))).toEqual(new Set(seen.map((d) => d.id)));
  for (const d of inView) expect(d).toEqual(all.get(d.id));
});

test("no drop stops in mid-air: every stop is on open ground, on a solid, or on the facade line below the roof", () => {
  const others = ALL.filter((s) => s !== GROUND);
  for (const c of rainColumns()) {
    const hit = columnHit(c.id, SOLIDS, []);
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
      const origin = new Vector3(c.x, RAIN_TOP, c.z);
      const brute = firstHit(origin, RAIN_DIR, [...new Set([...solids, ...RAIN_SOLIDS])], bodies);
      const pruned = columnHit(c.id, solids, bodies);
      expect(pruned.distance, `${c.id}`).toBeCloseTo(brute.distance, 9);
      expect(pruned.open).toBe(brute.open);
    }
  }
}, 60_000);

test("rain falls from the back of No. 12's roof across the street to the back of No. 13's, none of it off the back of either row", () => {
  expect(RAIN_FIELD.z[0]).toBeGreaterThan(FACADE_Z - 12);
  expect(RAIN_FIELD.z[0]).toBeLessThan(FACADE_Z - 11);
  expect(RAIN_FIELD.z[1]).toBe(acrossZ(FACADE_Z - 12));
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
    const fromTheSky = (RAIN_TOP - d.head[1]) / -RAIN_DIR.y;
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
