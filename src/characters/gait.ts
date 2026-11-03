import { Matrix4, Quaternion, Vector3 } from "three";
import { legLength, restAnkle, solveLeg } from "./legs";
import { footCapsule, hipPosition, type LegName, type Placement, type Pose, type Side, type Skeleton } from "./skeleton";

export type RootAt = (t: number) => { readonly x: number; readonly z: number; readonly yaw: number; readonly y?: number };

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
  readonly heelScale: number;
  readonly toeScale: number;
};

export type GaitPlan = {
  readonly skeleton: Skeleton;
  readonly style: GaitStyle;
  readonly plants: Readonly<Record<LegName, readonly Plant[]>>;
  readonly ground: Ground;
  readonly touchdowns: readonly { readonly time: number; readonly side: Side }[];
  readonly bob: { readonly from: number; readonly step: number; readonly values: readonly number[] };
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

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const smooth = (u: number) => u * u * (3 - 2 * u);
const angleBetween = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

export const legOf = (side: Side): LegName => (side === 1 ? "leftLeg" : "rightLeg");

const footRotation = (yaw: number, pitch: number) =>
  new Quaternion().setFromAxisAngle(Y_AXIS, yaw).multiply(new Quaternion().setFromAxisAngle(X_AXIS, pitch));

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
  const fit = Number.isFinite(length) ? Math.min(1, length / (heelRoll + toeRoll)) : 1;
  let pitch = 0;
  if (t - plant.on < heelRoll * fit) {
    pitch = -heelStrike * plant.heelScale * (1 - smooth((t - plant.on) / (heelRoll * fit)));
  } else if (plant.off - t < toeRoll * fit) {
    pitch = toeOff * plant.toeScale * smooth(1 - (plant.off - t) / (toeRoll * fit));
  }
  return pivoted(plan.skeleton, plant, pitch);
};

const lowestEnd = (skeleton: Skeleton, side: Side, pitch: number) => {
  const { heel, toe } = footCapsule(skeleton, side);
  const height = ([, y, z]: readonly number[]) => y * Math.cos(pitch) - z * Math.sin(pitch);
  return Math.min(height(heel), height(toe));
};

const swingClearance = (style: GaitStyle, from: Plant, to: Plant) => {
  const distance = Math.hypot(to.ankle.x - from.ankle.x, to.ankle.z - from.ankle.z);
  return style.lift * clamp(distance / (0.5 * style.stride), 0.35, 1);
};

const swingPose = (plan: GaitPlan, from: Plant, to: Plant, u: number) => {
  const s = smooth(u);
  const start = stanceFoot(plan, from, from.off);
  const end = stanceFoot(plan, to, to.on);
  const yaw = from.yaw + angleBetween(from.yaw, to.yaw) * s;
  const pitch = start.pitch + (end.pitch - start.pitch) * s;
  const standing = (plant: Plant) => plant.ankle.y + footCapsule(plan.skeleton, from.side).heel[1];
  const drop = standing(to) - standing(from);
  const level = drop < -0.01 ? smooth(clamp((u - 0.3) / 0.7, 0, 1)) : drop > 0.01 ? smooth(clamp(u / 0.7, 0, 1)) : s;
  const base = standing(from) + drop * level - lowestEnd(plan.skeleton, from.side, pitch);
  const across = drop < -0.01 ? smooth(clamp(u / 0.7, 0, 1)) : s;
  return { ankle: start.ankle.clone().lerp(end.ankle, across), yaw, pitch, base };
};

const groundNeed = (plan: GaitPlan, from: Plant, to: Plant, u: number) => {
  const { ankle, yaw, pitch, base } = swingPose(plan, from, to, u);
  const { heel, toe, radius } = footCapsule(plan.skeleton, from.side);
  const above = from.ankle.y + heel[1] - plan.ground(from.ankle.x, from.ankle.z);
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  let need = 0;
  for (let i = 0; i <= 12; i++) {
    const along = heel[2] - radius + ((toe[2] - heel[2] + 2 * radius) * i) / 12;
    const onAxis = clamp(along, heel[2], toe[2]);
    const axis = heel[1] * Math.cos(pitch) - onAxis * Math.sin(pitch);
    const reach = heel[1] * Math.sin(pitch) + along * Math.cos(pitch);
    const required = plan.ground(ankle.x + fx * reach, ankle.z + fz * reach) + above - axis;
    need = Math.max(need, required - base);
  }
  return need;
};

const SWING_SAMPLES = 32;
const obstacleLift = (plan: GaitPlan, from: Plant, to: Plant, u: number) => {
  if (plan.ground === FLAT_GROUND) {
    return 0;
  }
  const needs = Array.from({ length: SWING_SAMPLES + 1 }, (_, j) => groundNeed(plan, from, to, j / SWING_SAMPLES));
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
      return u1 > u0 ? v0 + (v1 - v0) * smooth((u - u0) / (u1 - u0)) : v1;
    }
  }
  return needs[SWING_SAMPLES];
};

const swingFoot = (plan: GaitPlan, from: Plant, to: Plant, t: number) => {
  const u = clamp((t - from.off) / (to.on - from.off), 0, 1);
  const { ankle, yaw, pitch, base } = swingPose(plan, from, to, u);
  const clearance = swingClearance(plan.style, from, to) * 16 * u * u * (1 - u) * (1 - u);
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
    const hip = new Vector3(...hipPosition(skeleton, side)).applyAxisAngle(Y_AXIS, r.yaw).add(new Vector3(r.x, r.y ?? 0, r.z));
    const across = Math.hypot(foot.ankle.x - hip.x, foot.ankle.z - hip.z);
    const drop = Math.sqrt(Math.max(0, length * length - across * across));
    limit = Math.min(limit, foot.ankle.y + drop - hip.y);
  }
  return limit;
};

const smoothBelow = (values: number[], radius: number) => {
  const n = values.length;
  const eroded = values.map((_, i) => {
    let low = Infinity;
    for (let j = Math.max(0, i - radius); j <= Math.min(n - 1, i + radius); j++) {
      low = Math.min(low, values[j]);
    }
    return low;
  });
  const half = Math.floor(radius / 2);
  const average = (v: number[]) =>
    v.map((_, i) => {
      let sum = 0;
      for (let j = i - half; j <= i + half; j++) {
        sum += v[clamp(j, 0, n - 1)];
      }
      return sum / (2 * half + 1);
    });
  return average(average(eroded));
};

export const planGait = (
  skeleton: Skeleton,
  style: GaitStyle,
  root: RootAt,
  steps: readonly Step[],
  span: readonly [number, number],
  ground: Ground = FLAT_GROUND,
): GaitPlan => {
  const start = steps.length > 0 ? Math.min(...steps.map((s) => s.lift)) : span[0];
  const plantsOf = (side: Side): Plant[] => {
    const own = steps.filter((s) => s.side === side).sort((a, b) => a.lift - b.lift);
    const placed = own
      .map((step, i) => ({ on: i === 0 ? -Infinity : own[i - 1].land, off: step.lift, width: own[i - 1]?.width, at: own[i - 1]?.at }))
      .concat([{ on: own.length > 0 ? own[own.length - 1].land : -Infinity, off: Infinity, width: undefined, at: own[own.length - 1]?.at }])
      .map(({ on, off, width, at }) => {
        let when = on + (off - on) * style.plantAt;
        if (!Number.isFinite(on)) {
          when = start;
        } else if (!Number.isFinite(off)) {
          when = span[1];
        }
        const r = root(when);
        const local = restAnkle(skeleton, side);
        if (width !== undefined) {
          local.x = side * width;
        }
        const ankle = local.applyAxisAngle(Y_AXIS, r.yaw).add(new Vector3(r.x, 0, r.z));
        if (at) {
          ankle.x = at.x;
          ankle.z = at.z;
        }
        ankle.y += ground(ankle.x, ankle.z);
        return { side, on, off, ankle, yaw: r.yaw, heelScale: 0, toeScale: 0 };
      });
    const forwards = (from: Plant, to: Plant) => {
      const along = new Vector3(Math.sin(to.yaw), 0, Math.cos(to.yaw));
      return clamp(to.ankle.clone().sub(from.ankle).dot(along) / style.stride, 0, 1);
    };
    return placed.map((plant, i) => ({
      ...plant,
      heelScale: i === 0 ? 0 : placed[i - 1].ankle.y - plant.ankle.y > STEP_DOWN ? -BALL_FIRST : forwards(placed[i - 1], plant),
      toeScale: i < placed.length - 1 ? forwards(plant, placed[i + 1]) : 0,
    }));
  };

  const plan: GaitPlan = {
    skeleton,
    style,
    plants: { leftLeg: plantsOf(1), rightLeg: plantsOf(-1) },
    ground,
    touchdowns: steps.map((s) => ({ time: s.land, side: s.side })).sort((a, b) => a.time - b.time),
    bob: { from: span[0], step: SAMPLE, values: [] },
  };
  const count = Math.ceil((span[1] - span[0]) / SAMPLE) + 1;
  const limits = Array.from({ length: count }, (_, i) => reachLimit(plan, root, span[0] + i * SAMPLE));
  return { ...plan, bob: { from: span[0], step: SAMPLE, values: smoothBelow(limits, Math.round(0.04 / SAMPLE)) } };
};

export const bobLimit = (plan: GaitPlan, t: number) => {
  const { from, step, values } = plan.bob;
  const at = clamp((t - from) / step, 0, values.length - 1);
  const i = Math.min(Math.floor(at), values.length - 2);
  return values[i] + (values[i + 1] - values[i]) * (at - i);
};

export const plantFeet = (plan: GaitPlan, t: number, placement: Placement): Pose => {
  const { skeleton } = plan;
  const bob = Math.min(placement.pose.bob, bobLimit(plan, t));
  const [x, y, z] = placement.position;
  const turn = new Quaternion().setFromAxisAngle(Y_AXIS, placement.rotationY);
  const toBody = new Matrix4().compose(new Vector3(x, y + bob, z), turn, new Vector3(1, 1, 1)).invert();
  const unturn = turn.clone().invert();
  const leg = (side: Side) => {
    const foot = footAt(plan, side, t);
    return solveLeg(skeleton, side, foot.ankle.clone().applyMatrix4(toBody), unturn.clone().multiply(foot.rotation));
  };
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
      return Math.sin(phaseOf(a.side) + span * ((t - a.time) / (b.time - a.time)));
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
