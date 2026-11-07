import { smallestClearing } from "../physics/collision";
import { clamp, easeUnit, smoothstep, wrapAngle } from "./scalar";
import { Quaternion, Vector3 } from "three";
import { legLength, restAnkle, solveLeg } from "./legs";
import {
  footCapsule,
  bodyFrameOf,
  footCenter,
  hipPosition,
  type LegName,
  type LegPose,
  type Placement,
  type Pose,
  type Side,
  type Skeleton,
} from "./skeleton";

export type RootAt = (t: number) => {
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly y?: number;
};

export type Ground = (x: number, z: number) => number;
export const FLAT_GROUND: Ground = () => 0;

export type Step = {
  readonly side: Side;
  readonly lift: number;
  readonly land: number;
  readonly width?: number;
  readonly at?: { readonly x: number; readonly z: number };
};

export type GaitStyle = {
  readonly stride: number;
  readonly plantAt: number;
  readonly lift: number;
  readonly heelStrike: number;
  readonly heelRoll: number;
  readonly toeOff: number;
  readonly toeRoll: number;
};

export type Plant = {
  readonly side: Side;
  readonly on: number;
  readonly off: number;
  readonly ankle: Vector3;
  readonly yaw: number;
  readonly support: number;
  readonly heelScale: number;
  readonly toeScale: number;
};

export type GaitPlan = {
  readonly skeleton: Skeleton;
  readonly style: GaitStyle;
  readonly plants: Readonly<Record<LegName, readonly Plant[]>>;
  readonly ground: Ground;
  readonly level: boolean;
  readonly touchdowns: readonly {
    readonly time: number;
    readonly side: Side;
  }[];
  readonly bob: {
    readonly from: number;
    readonly step: number;
    readonly values: readonly number[];
  };
};

export type FootState = {
  readonly ankle: Vector3;
  readonly rotation: Quaternion;
  readonly pitch: number;
  readonly plant: Plant | null;
};

const Y_AXIS = new Vector3(0, 1, 0);
const X_AXIS = new Vector3(1, 0, 0);
const SAMPLE = 1 / 240;
const STEP_DOWN = 0.05;
const BALL_FIRST = 0.6;
const BOB_SMOOTHING = { level: 0.1, uneven: 0.12 };

const angleBetween = (from: number, to: number) => wrapAngle(to - from);

export const shiftSteps = (steps: readonly Step[], by: number): Step[] =>
  steps.map((s) => ({ ...s, lift: s.lift + by, land: s.land + by }));

export const legOf = (side: Side): LegName =>
  side === 1 ? "leftLeg" : "rightLeg";
export const opposite = (side: Side): Side => (side === 1 ? -1 : 1);

export const STEP_OVERLAP = 0.12;

export const rootSpeed = (root: RootAt) => (t: number) => {
  const a = root(t - 0.005);
  const b = root(t + 0.005);
  return Math.hypot(b.x - a.x, b.z - a.z) / 0.01;
};

export const walkCadence = (root: RootAt) => {
  const speed = rootSpeed(root);
  return (t: number) => 2.4 + 1.25 * speed(t);
};

export const touchdownTimes = (
  plan: GaitPlan,
  duration: number,
  fps: number,
): number[] =>
  plan.touchdowns
    .filter((s) => s.time >= 0 && s.time < duration)
    .map((s) => Math.round(s.time * fps) / fps);

export const ankleOnTread = (
  skeleton: Skeleton,
  side: Side,
  yaw: number,
  riser: { readonly x: number; readonly z: number },
  gap = 0.01,
): { x: number; z: number } => {
  const { heel, radius } = footCapsule(skeleton, side);
  const reach = gap - (heel[2] - radius);
  return {
    x: riser.x + Math.sin(yaw) * reach,
    z: riser.z + Math.cos(yaw) * reach,
  };
};

const footRotation = (yaw: number, pitch: number) =>
  new Quaternion()
    .setFromAxisAngle(Y_AXIS, yaw)
    .multiply(new Quaternion().setFromAxisAngle(X_AXIS, pitch));

const pivoted = (skeleton: Skeleton, plant: Plant, pitch: number) => {
  const capsule = footCapsule(skeleton, plant.side);
  const pivot = new Vector3(...(pitch > 0 ? capsule.toe : capsule.heel));
  const level = footRotation(plant.yaw, 0);
  const rotation = footRotation(plant.yaw, pitch);
  const ankle = plant.ankle
    .clone()
    .add(pivot.clone().applyQuaternion(level))
    .sub(pivot.applyQuaternion(rotation));
  return { ankle, rotation, pitch };
};

const stanceFoot = (plan: GaitPlan, plant: Plant, t: number) => {
  const { heelStrike, heelRoll, toeOff, toeRoll } = plan.style;
  const length = plant.off - plant.on;
  const fit = Number.isFinite(length)
    ? Math.min(1, length / (heelRoll + toeRoll))
    : 1;
  let pitch = 0;
  if (t - plant.on < heelRoll * fit) {
    pitch =
      -heelStrike *
      plant.heelScale *
      (1 - smoothstep((t - plant.on) / (heelRoll * fit)));
  } else if (plant.off - t < toeRoll * fit) {
    pitch =
      toeOff *
      plant.toeScale *
      smoothstep(1 - (plant.off - t) / (toeRoll * fit));
  }
  return pivoted(plan.skeleton, plant, pitch);
};

const lowestEnd = (skeleton: Skeleton, side: Side, pitch: number) => {
  const { heel, toe } = footCapsule(skeleton, side);
  const height = ([, y, z]: readonly number[]) =>
    y * Math.cos(pitch) - z * Math.sin(pitch);
  return Math.min(height(heel), height(toe));
};

const swingClearance = (style: GaitStyle, from: Plant, to: Plant) => {
  const distance = Math.hypot(
    to.ankle.x - from.ankle.x,
    to.ankle.z - from.ankle.z,
  );
  return style.lift * clamp(distance / (0.5 * style.stride), 0.35, 1);
};

const swingPose = (plan: GaitPlan, from: Plant, to: Plant, u: number) => {
  const s = smoothstep(u);
  const start = stanceFoot(plan, from, from.off);
  const end = stanceFoot(plan, to, to.on);
  const yaw = from.yaw + angleBetween(from.yaw, to.yaw) * s;
  const pitch = start.pitch + (end.pitch - start.pitch) * s;
  const standing = (plant: Plant) =>
    plant.ankle.y + footCapsule(plan.skeleton, from.side).heel[1];
  const drop = standing(to) - standing(from);
  const level =
    drop < -0.01
      ? easeUnit((u - 0.3) / 0.7)
      : drop > 0.01
        ? easeUnit(u / 0.7)
        : s;
  const base =
    standing(from) + drop * level - lowestEnd(plan.skeleton, from.side, pitch);
  const across = drop < -0.01 ? easeUnit(u / 0.7) : s;
  return {
    ankle: start.ankle.clone().lerp(end.ankle, across),
    yaw,
    pitch,
    base,
  };
};

const MAX_LIFT = 0.03;

export const SOLE_GRID = { rows: 20, columns: 5 };

type SoleSample = {
  readonly along: number;
  readonly across: number;
  readonly rise: number;
};
const soleCache = new Map<Skeleton, Map<Side, readonly SoleSample[]>>();

export const soleSamples = (
  skeleton: Skeleton,
  side: Side,
): readonly SoleSample[] => {
  const bySide =
    soleCache.get(skeleton) ?? new Map<Side, readonly SoleSample[]>();
  soleCache.set(skeleton, bySide);
  const cached = bySide.get(side);
  if (cached) return cached;
  const [cx, , cz] = footCenter(skeleton, side);
  const [rx, ry, rz] = skeleton.foot.size;
  const samples: SoleSample[] = [];
  for (let i = 0; i <= SOLE_GRID.rows; i++) {
    for (let j = -SOLE_GRID.columns; j <= SOLE_GRID.columns; j++) {
      const u = -rz + (2 * rz * i) / SOLE_GRID.rows;
      const v = (rx * j) / (SOLE_GRID.columns + 0.5);
      const inside = 1 - (u / rz) ** 2 - (v / rx) ** 2;
      if (inside > 0)
        samples.push({
          along: cz + u,
          across: cx + v,
          rise: ry * (1 - Math.sqrt(inside)),
        });
    }
  }
  bySide.set(side, samples);
  return samples;
};

export const supportUnder = (
  ground: Ground,
  skeleton: Skeleton,
  side: Side,
  ankle: Vector3,
  yaw: number,
) => {
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const floor = ground(ankle.x, ankle.z);
  let top = floor;
  for (const { along, across, rise } of soleSamples(skeleton, side)) {
    top = Math.max(
      top,
      ground(
        ankle.x + fx * along + fz * across,
        ankle.z + fz * along - fx * across,
      ) - rise,
    );
  }
  return top - floor <= MAX_LIFT ? top : floor;
};

const groundNeed = (plan: GaitPlan, from: Plant, to: Plant, u: number) => {
  const { ankle, yaw, pitch, base } = swingPose(plan, from, to, u);
  const { heel, toe, radius } = footCapsule(plan.skeleton, from.side);
  const above = from.ankle.y + heel[1] - from.support;
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  let need = 0;
  for (let i = 0; i <= 12; i++) {
    const along = heel[2] - radius + ((toe[2] - heel[2] + 2 * radius) * i) / 12;
    const onAxis = clamp(along, heel[2], toe[2]);
    const beyond = along - onAxis;
    const rounded = radius - Math.sqrt(Math.max(0, radius * radius - beyond * beyond));
    const axis = heel[1] * Math.cos(pitch) - onAxis * Math.sin(pitch);
    const reach = heel[1] * Math.sin(pitch) + along * Math.cos(pitch);
    const required =
      plan.ground(ankle.x + fx * reach, ankle.z + fz * reach) + above - axis - rounded;
    need = Math.max(need, required - base);
  }
  return need;
};

const isLevel = (plan: GaitPlan) => {
  const all = [...plan.plants.leftLeg, ...plan.plants.rightLeg];
  const height = plan.ground(all[0].ankle.x, all[0].ankle.z);
  const flatAt = (x: number, z: number) =>
    Math.abs(plan.ground(x, z) - height) < 1e-6;
  const { heel, toe } = footCapsule(plan.skeleton, 1);
  return [plan.plants.leftLeg, plan.plants.rightLeg].every((own) =>
    own.every((plant, i) => {
      if (!flatAt(plant.ankle.x, plant.ankle.z)) return false;
      const next = own[i + 1];
      if (!next) return true;
      for (let k = 0; k <= 8; k++) {
        const along = plant.ankle.clone().lerp(next.ankle, k / 8);
        for (const reach of [heel[2] - 0.1, 0, toe[2] + 0.1]) {
          if (
            !flatAt(
              along.x + Math.sin(plant.yaw) * reach,
              along.z + Math.cos(plant.yaw) * reach,
            )
          )
            return false;
        }
      }
      return true;
    }),
  );
};

const SWING_SAMPLES = 32;
const obstacleLift = (plan: GaitPlan, from: Plant, to: Plant, u: number) => {
  if (plan.level) {
    return 0;
  }
  const needs = Array.from({ length: SWING_SAMPLES + 1 }, (_, j) =>
    groundNeed(plan, from, to, j / SWING_SAMPLES),
  );
  const top = needs.indexOf(Math.max(...needs));
  const corners: [number, number][] = [[0, needs[0]]];
  let rising = needs[0];
  for (let j = 1; j <= top; j++) {
    if (needs[j] > rising) {
      rising = needs[j];
      corners.push([j / SWING_SAMPLES, rising]);
    }
  }
  for (let j = top; j < SWING_SAMPLES; j++) {
    const ahead = Math.max(...needs.slice(j + 1));
    if (ahead < Math.max(...needs.slice(j))) {
      corners.push([j / SWING_SAMPLES, Math.max(...needs.slice(j))]);
    }
  }
  corners.push([1, needs[SWING_SAMPLES]]);
  for (let i = 0; i < corners.length - 1; i++) {
    const [u0, v0] = corners[i];
    const [u1, v1] = corners[i + 1];
    if (u >= u0 && u <= u1) {
      return u1 > u0 ? v0 + (v1 - v0) * smoothstep((u - u0) / (u1 - u0)) : v1;
    }
  }
  return needs[SWING_SAMPLES];
};

const swingFoot = (plan: GaitPlan, from: Plant, to: Plant, t: number) => {
  const u = clamp((t - from.off) / (to.on - from.off), 0, 1);
  const { ankle, yaw, pitch, base } = swingPose(plan, from, to, u);
  const clearance =
    swingClearance(plan.style, from, to) * 16 * u * u * (1 - u) * (1 - u);
  ankle.y = base + obstacleLift(plan, from, to, u) + clearance;
  return { ankle, rotation: footRotation(yaw, pitch), pitch };
};

export const footAt = (plan: GaitPlan, side: Side, t: number): FootState => {
  const plants = plan.plants[legOf(side)];
  for (let i = 0; i < plants.length; i++) {
    const plant = plants[i];
    if (t <= plant.off) {
      if (t >= plant.on) {
        return { ...stanceFoot(plan, plant, t), plant };
      }
      return { ...swingFoot(plan, plants[i - 1], plant, t), plant: null };
    }
  }
  const last = plants[plants.length - 1];
  return { ...stanceFoot(plan, last, last.off), plant: last };
};

const swingProgress = (plan: GaitPlan, side: Side, t: number) => {
  const plants = plan.plants[legOf(side)];
  const next = plants.findIndex((p) => t < p.on);
  if (next <= 0) {
    return null;
  }
  const from = plants[next - 1];
  return t > from.off ? (t - from.off) / (plants[next].on - from.off) : null;
};

const reachLimit = (plan: GaitPlan, root: RootAt, t: number) => {
  const { skeleton } = plan;
  const r = root(t);
  const length = legLength(skeleton);
  let limit = Infinity;
  for (const side of [1, -1] as const) {
    const foot = footAt(plan, side, t);
    if (!foot.plant && (swingProgress(plan, side, t) ?? 1) < 0.8) {
      continue;
    }
    const hip = new Vector3(...hipPosition(skeleton, side))
      .applyAxisAngle(Y_AXIS, r.yaw)
      .add(new Vector3(r.x, r.y ?? 0, r.z));
    const across = Math.hypot(foot.ankle.x - hip.x, foot.ankle.z - hip.z);
    const drop = Math.sqrt(Math.max(0, length * length - across * across));
    limit = Math.min(limit, foot.ankle.y + drop - hip.y);
  }
  return limit;
};

const smoothBelow = (values: number[], radii: readonly number[]) => {
  const n = values.length;
  const eroded = values.map((_, i) => {
    let low = Infinity;
    for (
      let j = Math.max(0, i - radii[i]);
      j <= Math.min(n - 1, i + radii[i]);
      j++
    ) {
      low = Math.min(low, values[j]);
    }
    return low;
  });
  const average = (v: number[]) =>
    v.map((_, i) => {
      const half = Math.floor(radii[i] / 2);
      let sum = 0;
      for (let j = i - half; j <= i + half; j++) {
        sum += v[clamp(j, 0, n - 1)];
      }
      return sum / (2 * half + 1);
    });
  return average(average(eroded));
};

const MAX_HIP_SPEED = 0.75;
const limitHipSpeed = (
  values: readonly number[],
  heights: readonly number[],
) => {
  const step = MAX_HIP_SPEED * SAMPLE;
  const hips = values.map((v, i) => v + heights[i]);
  for (let i = hips.length - 2; i >= 0; i--)
    hips[i] = Math.min(hips[i], hips[i + 1] + step);
  for (let i = 1; i < hips.length; i++)
    hips[i] = Math.min(hips[i], hips[i - 1] + step);
  return hips.map((h, i) => h - heights[i]);
};

const UNEVEN_MARGIN = 0.25;
const unevenSpans = (plan: GaitPlan): (readonly [number, number])[] => {
  const { heel, toe } = footCapsule(plan.skeleton, 1);
  const crossesUneven = (plant: Plant, next: Plant) => {
    const height = plan.ground(plant.ankle.x, plant.ankle.z);
    for (let k = 0; k <= 8; k++) {
      const along = plant.ankle.clone().lerp(next.ankle, k / 8);
      for (const reach of [heel[2] - 0.1, 0, toe[2] + 0.1]) {
        const x = along.x + Math.sin(plant.yaw) * reach;
        const z = along.z + Math.cos(plant.yaw) * reach;
        if (Math.abs(plan.ground(x, z) - height) >= 1e-6) return true;
      }
    }
    return false;
  };
  return [plan.plants.leftLeg, plan.plants.rightLeg].flatMap((own) =>
    own.flatMap((plant, i) => {
      const next = own[i + 1] ?? plant;
      return crossesUneven(plant, next)
        ? [
            [
              Math.max(plant.off === Infinity ? plant.on : plant.off, -1e9),
              Math.min(next.on, 1e9),
            ] as const,
          ]
        : [];
    }),
  );
};

const restingAnkle = (
  skeleton: Skeleton,
  side: Side,
  width: number | undefined,
  r: { readonly x: number; readonly z: number; readonly yaw: number },
) => {
  const local = restAnkle(skeleton, side);
  if (width !== undefined) local.x = side * width;
  return local.applyAxisAngle(Y_AXIS, r.yaw).add(new Vector3(r.x, 0, r.z));
};

const EDGE_SHIFT = { step: 0.005, most: 0.4, clear: 0.05 };

const straddles = (ground: Ground, skeleton: Skeleton, side: Side, x: number, z: number, yaw: number) => {
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const heights = soleSamples(skeleton, side).flatMap(({ along, across }) =>
    [-EDGE_SHIFT.clear, 0, EDGE_SHIFT.clear].map((more) =>
      ground(x + fx * (along + more) + fz * across, z + fz * (along + more) - fx * across),
    ),
  );
  return Math.max(...heights) - Math.min(...heights) > MAX_LIFT;
};

export const offTheEdges = (
  skeleton: Skeleton,
  style: GaitStyle,
  root: RootAt,
  steps: readonly Step[],
  span: readonly [number, number],
  ground: Ground,
): Step[] =>
  steps.map((step) => {
    if (step.at) return step;
    const next = steps
      .filter((s) => s.side === step.side && s.lift > step.land)
      .sort((a, b) => a.lift - b.lift)[0];
    const when = next ? step.land + (next.lift - step.land) * style.plantAt : span[1];
    const r = root(when);
    const ankle = restingAnkle(skeleton, step.side, step.width, r);
    if (!straddles(ground, skeleton, step.side, ankle.x, ankle.z, r.yaw)) return step;
    const fx = Math.sin(r.yaw);
    const fz = Math.cos(r.yaw);
    for (let d = EDGE_SHIFT.step; d <= EDGE_SHIFT.most; d += EDGE_SHIFT.step) {
      for (const shift of [d, -d]) {
        const x = ankle.x + fx * shift;
        const z = ankle.z + fz * shift;
        if (!straddles(ground, skeleton, step.side, x, z, r.yaw)) return { ...step, at: { x, z } };
      }
    }
    return step;
  });

export const planGait = (
  skeleton: Skeleton,
  style: GaitStyle,
  root: RootAt,
  steps: readonly Step[],
  span: readonly [number, number],
  ground: Ground = FLAT_GROUND,
  surface: Ground = ground,
): GaitPlan => {
  const start =
    steps.length > 0 ? Math.min(...steps.map((s) => s.lift)) : span[0];
  const plantsOf = (side: Side): Plant[] => {
    const own = steps
      .filter((s) => s.side === side)
      .sort((a, b) => a.lift - b.lift);
    const placed = own
      .map((step, i) => ({
        on: i === 0 ? -Infinity : own[i - 1].land,
        off: step.lift,
        width: own[i - 1]?.width,
        at: own[i - 1]?.at,
      }))
      .concat([
        {
          on: own.length > 0 ? own[own.length - 1].land : -Infinity,
          off: Infinity,
          width: undefined,
          at: own[own.length - 1]?.at,
        },
      ])
      .map(({ on, off, width, at }) => {
        let when = on + (off - on) * style.plantAt;
        if (!Number.isFinite(on)) {
          when = start;
        } else if (!Number.isFinite(off)) {
          when = span[1];
        }
        const r = root(when);
        const ankle = restingAnkle(skeleton, side, width, r);
        if (at) {
          ankle.x = at.x;
          ankle.z = at.z;
        }
        const support = supportUnder(surface, skeleton, side, ankle, r.yaw);
        ankle.y += support;
        return {
          side,
          on,
          off,
          ankle,
          yaw: r.yaw,
          support,
          heelScale: 0,
          toeScale: 0,
        };
      });
    const forwards = (from: Plant, to: Plant) => {
      const along = new Vector3(Math.sin(to.yaw), 0, Math.cos(to.yaw));
      return clamp(
        to.ankle.clone().sub(from.ankle).dot(along) / style.stride,
        0,
        1,
      );
    };
    return placed.map((plant, i) => ({
      ...plant,
      heelScale:
        i === 0
          ? 0
          : placed[i - 1].ankle.y - plant.ankle.y > STEP_DOWN
            ? -BALL_FIRST
            : forwards(placed[i - 1], plant),
      toeScale: i < placed.length - 1 ? forwards(plant, placed[i + 1]) : 0,
    }));
  };

  const plan: GaitPlan = {
    skeleton,
    style,
    plants: { leftLeg: plantsOf(1), rightLeg: plantsOf(-1) },
    ground,
    level: true,
    touchdowns: steps
      .map((s) => ({ time: s.land, side: s.side }))
      .sort((a, b) => a.time - b.time),
    bob: { from: span[0], step: SAMPLE, values: [] },
  };
  const level = isLevel(plan);
  const levelled = { ...plan, level };
  if (!level) {
    for (const leg of ["leftLeg", "rightLeg"] as const) {
      const own = plan.plants[leg];
      for (let i = 1; i < own.length; i++) {
        for (const [u, moment] of [
          [0, own[i - 1].off],
          [1, own[i].on],
        ] as const) {
          if (groundNeed(plan, own[i - 1], own[i], u) > 0.001) {
            throw new Error(
              `The ${leg === "leftLeg" ? "left" : "right"} foot would stand inside the ground at ${moment.toFixed(2)} s`,
            );
          }
        }
      }
    }
  }
  const count = Math.ceil((span[1] - span[0]) / SAMPLE) + 1;
  const limits = Array.from({ length: count }, (_, i) =>
    reachLimit(levelled, root, span[0] + i * SAMPLE),
  );
  const radius = (smoothing: number) => Math.round(smoothing / SAMPLE);
  const spans = level ? [] : unevenSpans(levelled);
  const radii = limits.map((_, i) => {
    const t = span[0] + i * SAMPLE;
    const near = spans.some(
      ([a, b]) => t >= a - UNEVEN_MARGIN && t <= b + UNEVEN_MARGIN,
    );
    return radius(near ? BOB_SMOOTHING.uneven : BOB_SMOOTHING.level);
  });
  const heights = limits.map((_, i) => root(span[0] + i * SAMPLE).y ?? 0);
  return {
    ...levelled,
    bob: {
      from: span[0],
      step: SAMPLE,
      values: limitHipSpeed(smoothBelow(limits, radii), heights),
    },
  };
};

export const bobLimit = (plan: GaitPlan, t: number) => {
  const { from, step, values } = plan.bob;
  const at = clamp((t - from) / step, 0, values.length - 1);
  const i = Math.min(Math.floor(at), values.length - 2);
  return values[i] + (values[i + 1] - values[i]) * (at - i);
};

type Foot = { readonly ankle: Vector3; readonly rotation: Quaternion };

const legReaching = (
  skeleton: Skeleton,
  placement: Placement,
  bob: number,
  side: Side,
  foot: Foot,
): LegPose =>
  solveLeg(
    skeleton,
    side,
    foot.ankle.clone().applyMatrix4(bodyFrameOf(skeleton, { ...placement, pose: { ...placement.pose, bob } }).invert()),
    new Quaternion()
      .setFromRotationMatrix(bodyFrameOf(skeleton, placement))
      .invert()
      .multiply(foot.rotation),
  );

const HIGHEST_HEEL = 1.2;
const ARC_STEPS = 24;

const lowestOnTheSole = (ry: number, rz: number, pitch: number) => {
  const reach = Math.hypot(ry * Math.cos(pitch), rz * Math.sin(pitch));
  return new Vector3(0, (-ry * ry * Math.cos(pitch)) / reach, (rz * rz * Math.sin(pitch)) / reach);
};

const rolledAlong = (ry: number, rz: number, pitch: number) => {
  const end = Math.atan2(-ry * Math.cos(pitch), rz * Math.sin(pitch));
  const start = -Math.PI / 2;
  const step = (end - start) / ARC_STEPS;
  let length = 0;
  for (let i = 0; i < ARC_STEPS; i++) {
    const phi = start + (i + 0.5) * step;
    length += Math.hypot(rz * Math.sin(phi), ry * Math.cos(phi)) * step;
  }
  return length;
};

const rolled = (skeleton: Skeleton, plant: Plant, pitch: number): Foot => {
  const [, ry, rz] = skeleton.foot.size;
  const center = new Vector3(...footCenter(skeleton, plant.side));
  const level = footRotation(plant.yaw, 0);
  const rotation = footRotation(plant.yaw, pitch);
  const contact = plant.ankle
    .clone()
    .add(center.clone().applyQuaternion(level))
    .add(new Vector3(0, -ry, rolledAlong(ry, rz, pitch)).applyQuaternion(level));
  const ankle = contact
    .sub(lowestOnTheSole(ry, rz, pitch).applyQuaternion(rotation))
    .sub(center.applyQuaternion(rotation));
  return { ankle, rotation };
};

export const legOnToes = (
  skeleton: Skeleton,
  placement: Placement,
  side: Side,
  plant: Plant,
): LegPose => {
  const hip = new Vector3(...hipPosition(skeleton, side)).applyMatrix4(
    bodyFrameOf(skeleton, placement),
  );
  const pitch = smallestClearing(
    (p) => hip.distanceTo(rolled(skeleton, plant, p).ankle) - legLength(skeleton),
    HIGHEST_HEEL,
    0.02,
  );
  return legReaching(
    skeleton,
    placement,
    placement.pose.bob,
    side,
    rolled(skeleton, plant, pitch),
  );
};

export const plantFeet = (
  plan: GaitPlan,
  t: number,
  placement: Placement,
): Pose => {
  const bob = Math.min(placement.pose.bob, bobLimit(plan, t));
  const leg = (side: Side) =>
    legReaching(plan.skeleton, placement, bob, side, footAt(plan, side, t));
  return { ...placement.pose, bob, leftLeg: leg(1), rightLeg: leg(-1) };
};

export const strideAt = (plan: GaitPlan, t: number) => {
  const steps = plan.touchdowns;
  if (steps.length === 0) {
    return 0;
  }
  const phaseOf = (side: Side) => (side === 1 ? Math.PI / 2 : -Math.PI / 2);
  if (t <= steps[0].time) {
    return Math.sin(phaseOf(steps[0].side));
  }
  for (let i = 0; i < steps.length - 1; i++) {
    const a = steps[i];
    const b = steps[i + 1];
    if (t < b.time) {
      const span = a.side === b.side ? 2 * Math.PI : Math.PI;
      return Math.sin(
        phaseOf(a.side) + span * ((t - a.time) / (b.time - a.time)),
      );
    }
  }
  return Math.sin(phaseOf(steps[steps.length - 1].side));
};

export const rhythmicSteps = (options: {
  readonly from: number;
  readonly to: number;
  readonly first: Side;
  readonly cadence: (t: number) => number;
  readonly overlap: number;
  readonly width?: (t: number) => number | undefined;
}): Step[] => {
  const { from, to, first, cadence, overlap, width } = options;
  const dt = 1 / 960;
  const crossings: number[] = [from];
  let phase = 0;
  for (let t = from; t < to + 2; t += dt) {
    const next = phase + cadence(t + dt / 2) * dt;
    while (crossings.length / 16 <= next) {
      const target = crossings.length / 16;
      crossings.push(t + ((target - phase) / (next - phase)) * dt);
    }
    phase = next;
  }
  const timeAt = (p: number) => {
    const i = p * 16;
    const lo = Math.floor(i);
    return crossings[lo] + (crossings[lo + 1] - crossings[lo]) * (i - lo);
  };
  const steps: Step[] = [];
  for (let k = 1; k * 16 + 1 < crossings.length && timeAt(k) <= to; k++) {
    const land = timeAt(k);
    steps.push({
      side: (k % 2 === 1 ? first : -first) as Side,
      lift: timeAt(k - 1 + overlap),
      land,
      width: width?.(land),
    });
  }
  return steps;
};
