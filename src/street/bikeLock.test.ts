import { CatmullRomCurve3, Vector3 } from "three";
import { expect, test } from "vitest";
import {
  BIKE,
  BIKE_POINTS,
  BIKE_RODS,
  CABLE,
  STAND,
  STAND_XS,
  cableLoop,
  lockHead,
  standLocal,
  standRods,
} from "./bikes";
import { mm } from "../scenes/sceneChecks";

const v = (p: readonly number[]) => new Vector3(p[0], p[1], p[2]);
const toSegment = (p: Vector3, a: Vector3, b: Vector3) => {
  const ab = b.clone().sub(a);
  const t = Math.min(1, Math.max(0, p.clone().sub(a).dot(ab) / ab.lengthSq()));
  return p.distanceTo(a.clone().addScaledVector(ab, t));
};
const curve = () => new CatmullRomCurve3(cableLoop().map(v), true);
const samples = () => curve().getSpacedPoints(600);
const standRodsLocal = () =>
  STAND_XS.flatMap(standRods).map((rod) => ({
    from: v(standLocal(rod.from)),
    to: v(standLocal(rod.to)),
    radius: rod.radius,
  }));
const rods = () => [
  ...BIKE_RODS.map((r) => ({ from: v(r.from), to: v(r.to), radius: r.radius })),
  ...standRodsLocal(),
];
const tyreGap = (p: Vector3) =>
  Math.min(
    ...[BIKE_POINTS.rear, BIKE_POINTS.front].map((hub) => {
      const local = p.clone().sub(v(hub));
      const ring = Math.hypot(local.y, local.z) - (BIKE.wheel - BIKE.tyre);
      return Math.hypot(ring, local.x) - BIKE.tyre;
    }),
  );
const worldY = (p: Vector3) =>
  p.x * Math.sin(BIKE.lean) + p.y * Math.cos(BIKE.lean);
const winding = (points: Vector3[], c: { y: number; z: number; x: number }) => {
  let turn = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const d =
      Math.atan2(b.y - c.y, b.x - c.x) - Math.atan2(a.y - c.y, a.x - c.x);
    turn += Math.atan2(Math.sin(d), Math.cos(d));
  }
  return Math.round(Math.abs(turn) / (2 * Math.PI));
};

test("the bike is locked: an armoured cable runs through its frame and round the stand's lower rail", () => {
  const points = samples();
  const z = points[0].z;
  for (const p of points) expect(p.z).toBeCloseTo(z, 9);
  const downTube = BIKE_RODS.find(
    (r) => r.from === BIKE_POINTS.crank && r.to === BIKE_POINTS.headLow,
  )!;
  const s = (z - downTube.from[2]) / (downTube.to[2] - downTube.from[2]);
  const frame = v(downTube.from).lerp(v(downTube.to), s);
  const rail = v(standLocal([STAND_XS[0], STAND.knee, 0]));
  expect(winding(points, frame)).toBe(1);
  expect(winding(points, rail)).toBe(1);
  const length = curve().getLength();
  expect(length).toBeGreaterThan(0.8);
  expect(length).toBeLessThan(1.5);
  expect(CABLE.radius * 2).toBeCloseTo(0.015, 9);
});

test("the cable and its lock pass through nothing: no tube of the bike, no tyre, no part of the stand, not the ground", () => {
  const reach = CABLE.radius + CABLE.ink;
  const head = lockHead();
  const along = Array.from({ length: 21 }, (_, i) =>
    v(head.from).lerp(v(head.to), i / 20),
  );
  const problems: string[] = [];
  const check = (p: Vector3, r: number, what: string) => {
    for (const rod of rods()) {
      const gap = toSegment(p, rod.from, rod.to) - rod.radius - r;
      if (gap < 0) problems.push(`${what} ${mm(gap)} in a rod`);
    }
    if (tyreGap(p) - r < 0) problems.push(`${what} in a tyre`);
    if (worldY(p) - r < 0) problems.push(`${what} in the ground`);
  };
  for (const p of samples()) check(p, reach, "cable");
  for (const p of along) check(p, head.radius + CABLE.ink, "lock");
  expect(problems.slice(0, 5)).toEqual([]);
});
