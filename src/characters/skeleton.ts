import { CatmullRomCurve3, Euler, Matrix4, Vector2, Vector3 } from "three";
import {
  capsule,
  taperedCapsule,
  frame,
  obb,
  origin,
  pointIn,
  sphere,
  type Obb,
  type Sphere,
} from "../physics/collision";
import type { Vec3 } from "../toon/primitives";
import { sphereLattice } from "./scalar";

export type ArmPose = {
  readonly raise: number;
  readonly out: number;
  readonly elbow: number;
  readonly inward: number;
};

export type Pose = {
  readonly bob: number;
  readonly lean: number;
  readonly twist: number;
  readonly sway: number;
  readonly headPitch: number;
  readonly headYaw: number;
  readonly headRoll: number;
  readonly gazeYaw: number;
  readonly gazePitch: number;
  readonly blink: number;
  readonly leftArm: ArmPose;
  readonly rightArm: ArmPose;
  readonly leftLeg: LegPose;
  readonly rightLeg: LegPose;
};

export type LegPose = {
  readonly hip: Vec3;
  readonly knee: number;
  readonly ankle: Vec3;
};
export type LegName = "leftLeg" | "rightLeg";

export type Side = 1 | -1;
export type ArmName = "leftArm" | "rightArm";

export type Placement = {
  readonly position: Vec3;
  readonly rotationY: number;
  readonly pose: Pose;
  readonly tilt?: number;
};

export type Swell = {
  readonly at: readonly [number, number];
  readonly width: number;
  readonly above: number;
  readonly below: number;
  readonly height: number;
};

export type Skeleton = {
  readonly hipHeight: number;
  readonly neckHeight: number;
  readonly torso: {
    readonly profile: readonly (readonly [number, number])[];
    readonly depthScale: number;
    readonly bulges?: readonly Swell[];
    readonly shoulders?: { readonly x: number; readonly y: number; readonly size: Vec3 };
  };
  readonly head: readonly {
    readonly name: string;
    readonly center: Vec3;
    readonly radius: number;
  }[];
  readonly shoulder: { readonly x: number; readonly y: number };
  readonly upperArm: { readonly length: number; readonly radius: number; readonly shoulder?: number };
  readonly forearm: { readonly length: number; readonly radius: number; readonly wrist?: number };
  readonly hand: { readonly offset: number; readonly size: Vec3 };
  readonly hipX: number;
  readonly hipSplay: number;
  readonly thigh: { readonly length: number; readonly radius: number };
  readonly shin: { readonly length: number; readonly radius: number };
  readonly foot: { readonly offset: Vec3; readonly size: Vec3 };
};

export const torsoRotation = (p: Pose) =>
  new Euler(p.lean, p.twist, p.sway, "YXZ");
export const headRotation = (p: Pose) =>
  new Euler(p.headPitch, p.headYaw, p.headRoll, "YXZ");
export const shoulderRotation = (a: ArmPose, side: Side) =>
  new Euler(-a.raise, 0, side * a.out, "XYZ");
export const elbowRotation = (a: ArmPose, side: Side) =>
  new Euler(-a.elbow, -side * a.inward, 0, "YXZ");
export const hipRotation = (leg: LegPose) =>
  new Euler(leg.hip[0], leg.hip[1], leg.hip[2], "XYZ");
export const kneeRotation = (leg: LegPose) => new Euler(leg.knee, 0, 0);
export const ankleRotation = (leg: LegPose) =>
  new Euler(leg.ankle[0], leg.ankle[1], leg.ankle[2], "XYZ");

export const hipPosition = (skeleton: Skeleton, side: Side): Vec3 => [
  side * skeleton.hipX,
  skeleton.hipHeight,
  0,
];

export const footCenter = (skeleton: Skeleton, side: Side): Vec3 => {
  const [x, y, z] = skeleton.foot.offset;
  return [side * x, y, z];
};

export const footCapsule = (skeleton: Skeleton, side: Side) => {
  const [x, y, z] = footCenter(skeleton, side);
  const radius = skeleton.foot.size[1];
  const reach = skeleton.foot.size[2] - radius;
  return {
    heel: [x, y, z - reach] as Vec3,
    toe: [x, y, z + reach] as Vec3,
    radius,
  };
};

export const legFrames = (
  skeleton: Skeleton,
  body: Matrix4,
  leg: LegPose,
  side: Side,
) => {
  const hip = frame(body, hipPosition(skeleton, side), hipRotation(leg));
  const knee = frame(hip, [0, -skeleton.thigh.length, 0], kneeRotation(leg));
  const ankle = frame(knee, [0, -skeleton.shin.length, 0], ankleRotation(leg));
  return { hip, knee, ankle };
};

const profileCache = new WeakMap<Skeleton, Vector2[]>();

export const torsoProfile = (skeleton: Skeleton): Vector2[] => {
  const cached = profileCache.get(skeleton);
  if (cached) {
    return cached;
  }
  const curve = new CatmullRomCurve3(
    skeleton.torso.profile.map(([r, y]) => new Vector3(r, y, 0)),
  );
  const points = curve
    .getPoints(48)
    .map((p) => new Vector2(Math.max(0, p.x), p.y));
  profileCache.set(skeleton, points);
  return points;
};

const risingCache = new WeakMap<Skeleton, boolean>();
const rising = (skeleton: Skeleton) => {
  const cached = risingCache.get(skeleton);
  if (cached !== undefined) return cached;
  const points = torsoProfile(skeleton);
  const up = points.every((p, i) => i === 0 || points[i - 1].y < p.y);
  risingCache.set(skeleton, up);
  return up;
};

const firstSegment = (skeleton: Skeleton, y: number) => {
  const points = torsoProfile(skeleton);
  if (rising(skeleton)) {
    if (!(y >= points[0].y && y <= points[points.length - 1].y)) return -1;
    let lo = 0;
    let hi = points.length - 2;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (points[mid + 1].y >= y) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (y >= Math.min(a.y, b.y) && y <= Math.max(a.y, b.y) && a.y !== b.y)
      return i;
  }
  return -1;
};

export const torsoRadiusAt = (skeleton: Skeleton, y: number) => {
  const i = firstSegment(skeleton, y);
  if (i < 0) return { radius: 0, slope: 0 };
  const points = torsoProfile(skeleton);
  const a = points[i];
  const b = points[i + 1];
  const t = (y - a.y) / (b.y - a.y);
  return {
    radius: a.x + (b.x - a.x) * t,
    slope: (b.x - a.x) / (b.y - a.y),
  };
};

const HANG = { above: 1.2, below: 0.75, blend: 4 };

const swell = (dx: number, dy: number, b: Swell) => {
  const r2 = (dx / b.width) ** 2 + (dy / (dy >= 0 ? b.above : b.below)) ** 2;
  return r2 >= 1 ? 0 : b.height * (1 - r2) ** (dy >= 0 ? HANG.above : HANG.below);
};

export const bustLift = (skeleton: Skeleton, x: number, y: number) =>
  (skeleton.torso.bulges ?? []).reduce((sum, b) => sum + swell(x - b.at[0], y - b.at[1], b) ** HANG.blend, 0) ** (1 / HANG.blend);

export const bustPush = (skeleton: Skeleton, x: number, y: number, frontness: number) =>
  frontness > 0 ? bustLift(skeleton, x, y) * frontness : 0;

export const torsoSurface = (skeleton: Skeleton, p: Vector2, angle: number) => {
  const x = p.x * Math.cos(angle);
  return new Vector3(x, p.y, p.x * skeleton.torso.depthScale * Math.sin(angle) + bustPush(skeleton, x, p.y, Math.sin(angle)));
};

const SLOPE_STEP = 0.005;

const unswollen = (skeleton: Skeleton, local: Vector3) => {
  const scaled = Math.hypot(local.x, local.z / skeleton.torso.depthScale);
  const frontness = scaled > 0 ? local.z / skeleton.torso.depthScale / scaled : 0;
  const push = (x: number, y: number) => bustPush(skeleton, x, y, frontness);
  const here = push(local.x, local.y);
  if (here <= 0) return { local, steepness: 1 };
  const dx = (push(local.x + SLOPE_STEP, local.y) - push(local.x - SLOPE_STEP, local.y)) / (2 * SLOPE_STEP);
  const dy = (push(local.x, local.y + SLOPE_STEP) - push(local.x, local.y - SLOPE_STEP)) / (2 * SLOPE_STEP);
  return {
    local: new Vector3(local.x, local.y, local.z - here),
    steepness: Math.sqrt(1 + dx ** 2 + dy ** 2),
  };
};

const squashed = (skeleton: Skeleton, point: Vector3) => {
  const { local, steepness } = unswollen(skeleton, point);
  const scaled = Math.hypot(local.x, local.z / skeleton.torso.depthScale);
  return { local, steepness, scaled, squash: scaled > 0 ? Math.hypot(local.x, local.z) / scaled : 1 };
};

const torsoDepth = (skeleton: Skeleton, point: Vector3, radius: number) => {
  const { local, steepness, scaled, squash } = squashed(skeleton, point);
  const { radius: surface, slope } = torsoRadiusAt(skeleton, local.y);
  if (surface <= 0) {
    return 0;
  }
  const distance = ((scaled - surface) / Math.sqrt(1 + slope * slope)) * squash;
  return radius - distance / steepness;
};

export const bodyFrameOf = (skeleton: Skeleton, placement: Placement) => {
  const root = frame(
    new Matrix4(),
    placement.position,
    new Euler(0, placement.rotationY, 0),
  );
  const lifted = frame(root, [0, placement.pose.bob, 0]);
  return placement.tilt
    ? frame(frame(lifted, [0, skeleton.hipHeight, 0], new Euler(-placement.tilt, 0, 0)), [0, -skeleton.hipHeight, 0])
    : lifted;
};

const frames = (skeleton: Skeleton, placement: Placement) => {
  const body = bodyFrameOf(skeleton, placement);
  const torso = frame(
    body,
    [0, skeleton.hipHeight, 0],
    torsoRotation(placement.pose),
  );
  const head = frame(torso, [0, skeleton.neckHeight, 0], headRotation(placement.pose));
  return { body, torso, head };
};

const armSpheres = (
  skeleton: Skeleton,
  torso: Matrix4,
  arm: ArmPose,
  side: Side,
  name: string,
) => {
  const shoulder = frame(
    torso,
    [side * skeleton.shoulder.x, skeleton.shoulder.y, 0],
    shoulderRotation(arm, side),
  );
  const elbow = frame(
    shoulder,
    [0, -skeleton.upperArm.length, 0],
    elbowRotation(arm, side),
  );
  return [
    ...taperedCapsule(
      `${name} upper arm`,
      origin(shoulder),
      origin(elbow),
      skeleton.upperArm.shoulder ?? skeleton.upperArm.radius,
      skeleton.upperArm.radius,
    ),
    ...taperedCapsule(
      `${name} forearm`,
      origin(elbow),
      pointIn(elbow, [0, -skeleton.forearm.length, 0]),
      skeleton.forearm.radius,
      skeleton.forearm.wrist ?? skeleton.forearm.radius,
    ),
    sphere(
      `${name} hand`,
      pointIn(elbow, [0, -skeleton.hand.offset, 0]),
      Math.max(...skeleton.hand.size),
    ),
  ];
};

const legSpheres = (
  skeleton: Skeleton,
  body: Matrix4,
  leg: LegPose,
  side: Side,
  name: string,
) => {
  const { hip, knee, ankle } = legFrames(skeleton, body, leg, side);
  const foot = footCapsule(skeleton, side);
  return [
    ...capsule(
      `${name} thigh`,
      origin(hip),
      origin(knee),
      skeleton.thigh.radius,
    ),
    ...capsule(
      `${name} shin`,
      origin(knee),
      origin(ankle),
      skeleton.shin.radius,
    ),
    ...capsule(
      `${name} foot`,
      pointIn(ankle, foot.heel),
      pointIn(ankle, foot.toe),
      foot.radius,
    ),
  ];
};

export const legFramesOf = (
  skeleton: Skeleton,
  placement: Placement,
  side: Side,
) =>
  legFrames(
    skeleton,
    frames(skeleton, placement).body,
    placement.pose[side === 1 ? "leftLeg" : "rightLeg"],
    side,
  );

export const footColliders = (
  skeleton: Skeleton,
  placement: Placement,
  side: Side,
): Sphere[] => {
  const { ankle } = legFramesOf(skeleton, placement, side);
  const foot = footCapsule(skeleton, side);
  return capsule(
    "foot",
    pointIn(ankle, foot.heel),
    pointIn(ankle, foot.toe),
    foot.radius,
  );
};

const COVERAGE = 0.012;
const AROUND = 360;
const ringAround = (width: number, depth: number, radius: number) => {
  const angle = (k: number) => (k / AROUND) * 2 * Math.PI;
  const surface = (k: number) =>
    [width * Math.cos(angle(k)), depth * Math.sin(angle(k))] as const;
  const inward = (k: number) => {
    const nx = Math.cos(angle(k)) / width;
    const nz = Math.sin(angle(k)) / depth;
    const length = Math.hypot(nx, nz);
    const [x, z] = surface(k);
    return [x - (radius * nx) / length, z - (radius * nz) / length] as const;
  };
  const covers = (center: readonly [number, number], k: number) => {
    const [x, z] = surface(k);
    return Math.hypot(x - center[0], z - center[1]) <= radius + COVERAGE;
  };
  const reach = (k: number, step: 1 | -1) => {
    const center = inward(k);
    let n = 0;
    while (n < AROUND / 2 && covers(center, k + step * (n + 1))) n++;
    return n;
  };
  const centers = [inward(0)];
  const last = AROUND - reach(0, -1);
  let open = reach(0, 1) + 1;
  while (open < last) {
    let best = open;
    let furthest = open - 1;
    for (let k = open; k < open + AROUND / 2 && k - reach(k, -1) <= open; k++) {
      const end = k + reach(k, 1);
      if (end > furthest) {
        furthest = end;
        best = k;
      }
    }
    centers.push(inward(best));
    open = furthest + 1;
  }
  return centers;
};

type Ring = {
  readonly radius: number;
  readonly centers: readonly (readonly [number, number, number])[];
};
type TorsoRings = { readonly lower: Ring[]; readonly upper: Ring[]; readonly bust: Ring[] };
const ringCache = new WeakMap<Skeleton, TorsoRings>();
const LOWEST = 10;
const MIDDLE = 24;
const HIGHEST = 44;
const SAG = 0.006;

const torsoRings = (skeleton: Skeleton): TorsoRings => {
  const cached = ringCache.get(skeleton);
  if (cached) return cached;
  const points = torsoProfile(skeleton);
  const bottom = Math.min(...points.map((p) => p.y));
  const radiusAt = (i: number) =>
    Math.min(points[i].x * skeleton.torso.depthScale, points[i].y - bottom);
  const ringAt = (i: number): Ring => {
    const { x: r, y } = points[i];
    const radius = radiusAt(i);
    return {
      radius,
      centers: ringAround(r, r * skeleton.torso.depthScale, radius).map(
        ([x, z]) => [x, y, z] as const,
      ),
    };
  };
  const between = (from: number, to: number) => {
    const picked = [from];
    let at = from;
    while (at < to) {
      let next = at + 1;
      let travelled = points[at].distanceTo(points[next]);
      while (next < to) {
        const further = travelled + points[next].distanceTo(points[next + 1]);
        if (
          further >
          2 * Math.sqrt(2 * Math.min(radiusAt(at), radiusAt(next + 1)) * SAG)
        )
          break;
        travelled = further;
        next++;
      }
      picked.push(next);
      at = next;
    }
    return picked;
  };
  const rings = {
    lower: between(LOWEST, MIDDLE).map(ringAt),
    upper: between(MIDDLE, HIGHEST).map(ringAt),
    bust: bustBalls(skeleton),
  };
  ringCache.set(skeleton, rings);
  return rings;
};

const BUST_BALL = { radii: [0.085, 0.07, 0.055, 0.04], step: 0.065, least: 0.01, poke: 0.009 };

export const sphereDirections = (count: number) => sphereLattice(count).map(({ polar, azimuth }) => new Vector3().setFromSphericalCoords(1, polar, azimuth));

const SPHERE_POINTS = sphereDirections(200);

const aboveTheFront = (skeleton: Skeleton, p: Vector3) => {
  const z = swollenFront(skeleton, p.x, p.y);
  if (z === null || p.z <= 0) return 0;
  const zx = ((swollenFront(skeleton, p.x + SLOPE_STEP, p.y) ?? z) - (swollenFront(skeleton, p.x - SLOPE_STEP, p.y) ?? z)) / (2 * SLOPE_STEP);
  const zy = ((swollenFront(skeleton, p.x, p.y + SLOPE_STEP) ?? z) - (swollenFront(skeleton, p.x, p.y - SLOPE_STEP) ?? z)) / (2 * SLOPE_STEP);
  return (p.z - z) / Math.hypot(1, zx, zy);
};

const pokesOut = (skeleton: Skeleton, center: Vector3, radius: number) =>
  Math.max(...SPHERE_POINTS.map((d) => aboveTheFront(skeleton, center.clone().addScaledVector(d, radius))));

const swollenFront = (skeleton: Skeleton, x: number, y: number) => {
  const r = torsoRadiusAt(skeleton, y).radius;
  if (Math.abs(x) >= r) return null;
  const plain = Math.sqrt(r * r - x * x);
  return plain * skeleton.torso.depthScale + bustPush(skeleton, x, y, plain / r);
};

const bustBalls = (skeleton: Skeleton): Ring[] => {
  const bulges = skeleton.torso.bulges ?? [];
  if (bulges.length === 0) return [];
  const xs = [Math.min(...bulges.map((b) => b.at[0] - b.width)), Math.max(...bulges.map((b) => b.at[0] + b.width))];
  const ys = [Math.min(...bulges.map((b) => b.at[1] - b.below)), Math.max(...bulges.map((b) => b.at[1] + b.above))];
  const grid = ([from, to]: number[]) => Array.from({ length: Math.ceil((to - from) / BUST_BALL.step) + 1 }, (_, i) => from + i * BUST_BALL.step);
  const centers = grid(xs).flatMap((x) =>
    grid(ys).flatMap((y) => {
      const z = swollenFront(skeleton, x, y);
      if (z === null || bustLift(skeleton, x, y) < BUST_BALL.least) return [];
      const zx = ((swollenFront(skeleton, x + SLOPE_STEP, y) ?? z) - (swollenFront(skeleton, x - SLOPE_STEP, y) ?? z)) / (2 * SLOPE_STEP);
      const zy = ((swollenFront(skeleton, x, y + SLOPE_STEP) ?? z) - (swollenFront(skeleton, x, y - SLOPE_STEP) ?? z)) / (2 * SLOPE_STEP);
      const normal = new Vector3(-zx, -zy, 1).normalize();
      const at = (radius: number) => new Vector3(x, y, z).addScaledVector(normal, -radius);
      const radius = BUST_BALL.radii.find((r) => pokesOut(skeleton, at(r), r) <= BUST_BALL.poke);
      if (radius === undefined) return [];
      const c = at(radius);
      return [{ radius, centers: [[c.x, c.y, c.z] as const] }];
    }),
  );
  return centers;
};

const SHOULDER_BALL = { step: 0.02, least: 0.01 };

const shoulderCache = new WeakMap<Skeleton, Ring[]>();

const shoulderRings = (skeleton: Skeleton): Ring[] => {
  const cached = shoulderCache.get(skeleton);
  if (cached) return cached;
  const rings = fitShoulders(skeleton);
  shoulderCache.set(skeleton, rings);
  return rings;
};

const fitShoulders = (skeleton: Skeleton): Ring[] => {
  const mass = skeleton.torso.shoulders;
  if (!mass) return [];
  const [wide, high, deep] = mass.size;
  const surface = sphereDirections(400).map((d) => new Vector3(d.x * wide, d.y * high, d.z * deep));
  const count = Math.floor(wide / SHOULDER_BALL.step);
  const balls = Array.from({ length: 2 * count + 1 }, (_, i) => (i - count) * SHOULDER_BALL.step)
    .map((along) => ({ along, radius: Math.min(...surface.map((p) => Math.hypot(p.x - along, p.y, p.z))) }))
    .filter(({ radius }) => radius >= SHOULDER_BALL.least);
  return ([1, -1] as const).flatMap((side) => balls.map(({ along, radius }) => ({ radius, centers: [[side * (mass.x + along), mass.y, 0] as const] })));
};

const ringSpheres = (rings: readonly Ring[], torso: Matrix4, name = "body") =>
  rings.flatMap(({ radius, centers }) =>
    centers.map((c) => sphere(name, pointIn(torso, c), radius)),
  );

export type BodyColliders = {
  readonly torso: Sphere[];
  readonly lowerTorso: Sphere[];
  readonly upperTorso: Sphere[];
  readonly head: Sphere[];
  readonly leftArm: Sphere[];
  readonly rightArm: Sphere[];
  readonly legs: Sphere[];
};

const ROOT_OVERLAP = 1.8;

export const armRootReach = (skeleton: Skeleton) => (skeleton.upperArm.shoulder ?? skeleton.upperArm.radius) * ROOT_OVERLAP;

export const bodyColliders = (
  skeleton: Skeleton,
  placement: Placement,
): BodyColliders => {
  const { pose } = placement;
  const { body, torso, head } = frames(skeleton, placement);
  const { lower, upper, bust } = torsoRings(skeleton);
  const lowerTorso = ringSpheres(lower, torso);
  const upperTorso = [...ringSpheres(upper, torso), ...ringSpheres(bust, torso), ...ringSpheres(shoulderRings(skeleton), torso, "shoulder")];
  return {
    torso: [...lowerTorso, ...upperTorso.slice(upper[0].centers.length)],
    lowerTorso,
    upperTorso,
    head: skeleton.head.map((h) =>
      sphere(h.name, pointIn(head, h.center), h.radius),
    ),
    leftArm: armSpheres(skeleton, torso, pose.leftArm, 1, "left"),
    rightArm: armSpheres(skeleton, torso, pose.rightArm, -1, "right"),
    legs: [
      ...legSpheres(skeleton, body, pose.leftLeg, 1, "left"),
      ...legSpheres(skeleton, body, pose.rightLeg, -1, "right"),
    ],
  };
};

export const torsoMatrix = (skeleton: Skeleton, placement: Placement) =>
  frames(skeleton, placement).torso;

export const handSphere = (
  skeleton: Skeleton,
  placement: Placement,
  which: ArmName,
): Sphere => {
  const spheres = armColliders(skeleton, placement, which);
  return spheres[spheres.length - 1];
};

export const handPosition = (
  skeleton: Skeleton,
  placement: Placement,
  which: ArmName,
) => handSphere(skeleton, placement, which).center;

export const armColliders = (
  skeleton: Skeleton,
  placement: Placement,
  which: ArmName,
): Sphere[] => {
  const { torso } = frames(skeleton, placement);
  const side: Side = which === "leftArm" ? 1 : -1;
  return armSpheres(
    skeleton,
    torso,
    placement.pose[which],
    side,
    which === "leftArm" ? "left" : "right",
  );
};

export const armIntoTorso = (
  skeleton: Skeleton,
  pose: Pose,
  which: ArmName,
) => {
  const side: Side = which === "leftArm" ? 1 : -1;
  const shoulder = new Vector3(
    side * skeleton.shoulder.x,
    skeleton.hipHeight + skeleton.shoulder.y,
    0,
  );
  const torso = new Matrix4().makeTranslation(0, skeleton.hipHeight, 0);
  const spheres = armSpheres(skeleton, torso, pose[which], side, which);
  let deepest = 0;
  for (const s of spheres) {
    if (s.center.distanceTo(shoulder) < armRootReach(skeleton)) {
      continue;
    }
    const local = s.center.clone().sub(new Vector3(0, skeleton.hipHeight, 0));
    deepest = Math.max(deepest, torsoDepth(skeleton, local, s.radius));
  }
  return deepest;
};

export const boxIntoTorso = (
  skeleton: Skeleton,
  placement: Placement,
  box: Obb,
) => {
  const toTorso = frames(skeleton, placement).torso.clone().invert();
  let deepest = 0;
  for (const u of [-1, -0.5, 0, 0.5, 1]) {
    for (const v of [-1, -0.5, 0, 0.5, 1]) {
      for (const w of [-1, -0.5, 0, 0.5, 1]) {
        if (Math.max(Math.abs(u), Math.abs(v), Math.abs(w)) < 1) {
          continue;
        }
        const point = box.center
          .clone()
          .addScaledVector(box.axes[0], u * box.half[0])
          .addScaledVector(box.axes[1], v * box.half[1])
          .addScaledVector(box.axes[2], w * box.half[2])
          .applyMatrix4(toTorso);
        deepest = Math.max(deepest, torsoDepth(skeleton, point, 0));
      }
    }
  }
  return deepest;
};

export const torsoDepthAt = (skeleton: Skeleton, local: Vector3) =>
  torsoDepth(skeleton, local, 0);

export const shoulderDepthAt = (skeleton: Skeleton, local: Vector3) => {
  const mass = skeleton.torso.shoulders;
  if (!mass) return -Infinity;
  const [wide, high, deep] = mass.size;
  return Math.max(
    ...([1, -1] as const).map((side) => {
      const spread = Math.hypot((local.x - side * mass.x) / wide, (local.y - mass.y) / high, local.z / deep);
      return (1 - spread) * Math.min(high, deep);
    }),
  );
};

export const bodyDepthAt = (skeleton: Skeleton, local: Vector3) =>
  Math.max(torsoDepthAt(skeleton, local), shoulderDepthAt(skeleton, local));

export const torsoClearance = (skeleton: Skeleton, point: Vector3) => {
  const { local, steepness, scaled, squash } = squashed(skeleton, point);
  const profile = torsoProfile(skeleton);
  let nearest = Infinity;
  let inside = false;
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i];
    const b = profile[i + 1];
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const k = Math.max(
      0,
      Math.min(
        1,
        ((scaled - a.x) * ab.x + (local.y - a.y) * ab.y) /
          (ab.x ** 2 + ab.y ** 2),
      ),
    );
    nearest = Math.min(
      nearest,
      Math.hypot(scaled - a.x - ab.x * k, local.y - a.y - ab.y * k),
    );
    if (
      a.y > local.y !== b.y > local.y &&
      scaled < a.x + ((local.y - a.y) / (b.y - a.y)) * ab.x
    )
      inside = !inside;
  }
  return ((inside ? -nearest : nearest) * squash) / steepness;
};

export const carriedBox = (
  skeleton: Skeleton,
  placement: Placement,
  position: Vec3,
  rotation: Vec3,
  size: Vec3,
  localCenter: Vec3 = [0, 0, 0],
): Obb => {
  const { torso } = frames(skeleton, placement);
  return obb(
    "carried box",
    frame(torso, position, new Euler(...rotation)),
    size,
    localCenter,
  );
};

export const faceDirection = (skeleton: Skeleton, placement: Placement) =>
  new Vector3(0, 0, 1).transformDirection(frames(skeleton, placement).head);

export const lowestPoint = (spheres: readonly { readonly center: { readonly y: number }; readonly radius: number }[]) =>
  Math.min(...spheres.map((s) => s.center.y - s.radius));

export const allColliders = (skeleton: Skeleton, placement: Placement) => {
  const body = bodyColliders(skeleton, placement);
  return [
    ...body.torso,
    ...body.head,
    ...body.legs,
    ...body.leftArm,
    ...body.rightArm,
  ];
};
