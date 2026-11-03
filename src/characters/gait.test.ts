import { describe, expect, test } from "vitest";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { KAREN_REST, KAREN_SKELETON } from "../Karen/rig";
import { collide, obb, origin } from "../physics/collision";
import { PAPIERTONNEN_DURATION, footstepTimes, tibikGait } from "../scenes/papiertonnen/choreography";
import { papiertonnenEnd, solvePapiertonnen } from "../scenes/papiertonnen/solve";
import {
  HAUSMUELL_DURATION,
  karenFootsteps,
  karenGait,
  tibikFootsteps,
  tibikGait as hausmuellTibikGait,
} from "../scenes/hausmuell/choreography";
import { solveHausmuell } from "../scenes/hausmuell/solve";
import { RIG, TIBIK_REST } from "../Tibik/rig";
import { FLAT_GROUND, footAt, planGait, plantFeet, rhythmicSteps, type GaitPlan, type Ground, type RootAt, type Step } from "./gait";
import { MAX_KNEE, legLength, restAnkle, solveLeg } from "./legs";
import { bodyColliders, footCapsule, footColliders, legFrames, legFramesOf, type Placement, type Side, type Skeleton } from "./skeleton";

const FPS = 30;
const SIDES = [1, -1] as const;
const sideName = (side: Side) => (side === 1 ? "left" : "right");

type Walker = {
  readonly name: string;
  readonly skeleton: Skeleton;
  readonly plan: () => GaitPlan;
  readonly frames: readonly number[];
  readonly at: (frame: number) => Placement;
};

const PAPIERTONNEN_FRAMES = Array.from({ length: PAPIERTONNEN_DURATION * FPS }, (_, f) => f);
const HAUSMUELL_FRAMES = Array.from({ length: HAUSMUELL_DURATION * FPS }, (_, f) => f).filter((f) => f < 2.5 * FPS || f % 4 === 0);

const WALKERS: Walker[] = [
  { name: "Tibik (Papiertonnen)", skeleton: RIG, plan: tibikGait, frames: PAPIERTONNEN_FRAMES, at: (f) => solvePapiertonnen(f / FPS).tibik },
  { name: "Tibik (Hausmuell)", skeleton: RIG, plan: hausmuellTibikGait, frames: HAUSMUELL_FRAMES, at: (f) => solveHausmuell(f / FPS).tibik },
  { name: "Karen", skeleton: KAREN_SKELETON, plan: karenGait, frames: HAUSMUELL_FRAMES, at: (f) => solveHausmuell(f / FPS).karen },
];

test("in Hausmuell, all steps happen while it is checked frame by frame", () => {
  for (const plan of [hausmuellTibikGait(), karenGait()]) {
    const landings = plan.touchdowns.map((s) => s.time).filter((t) => t >= 0);
    expect(Math.max(...landings)).toBeLessThan(2.5);
  }
});

const soleCentre = (skeleton: Skeleton) => restAnkle(skeleton, 1).y + footCapsule(skeleton, 1).heel[1];
const bottom = (s: { center: Vector3; radius: number }) => s.center.y - s.radius;

describe.each(WALKERS)("$name", ({ skeleton, plan, frames, at }) => {
  test("planted feet don't slide: the part of the sole on the ground stays put until the foot lifts off", { timeout: 300_000 }, () => {
    const ground = soleCentre(skeleton) - footCapsule(skeleton, 1).radius;
    const problems: string[] = [];
    let before = SIDES.map((side) => footColliders(skeleton, at(frames[0]), side));
    for (let k = 1; k < frames.length; k++) {
      const frame = frames[k];
      const now = SIDES.map((side) => footColliders(skeleton, at(frame), side));
      SIDES.forEach((side, i) => {
        const was = footAt(plan(), side, frames[k - 1] / FPS).plant;
        const is = footAt(plan(), side, frame / FPS).plant;
        if (!is) {
          return;
        }
        const lowest = Math.min(...now[i].map(bottom));
        if (Math.abs(lowest - ground) > 0.001) {
          problems.push(`frame ${frame}: ${sideName(side)} foot planted ${((lowest - ground) * 1000).toFixed(1)} mm off the ground`);
        }
        if (was !== is) {
          return;
        }
        now[i].forEach((sphere, j) => {
          const touching = bottom(sphere) - ground < 0.001 && bottom(before[i][j]) - ground < 0.001;
          const slid = Math.hypot(sphere.center.x - before[i][j].center.x, sphere.center.z - before[i][j].center.z);
          if (touching && slid > 0.003) {
            problems.push(`frame ${frame}: ${sideName(side)} sole slid ${(slid * 1000).toFixed(1)} mm`);
          }
        });
        const flat = [...now[i], ...before[i]].every((s) => bottom(s) - ground < 0.001);
        const moved = Math.max(...now[i].map((s, j) => Math.hypot(s.center.x - before[i][j].center.x, s.center.z - before[i][j].center.z)));
        if (flat && moved > 0.003) {
          problems.push(`frame ${frame}: ${sideName(side)} foot moved ${(moved * 1000).toFixed(1)} mm while flat on the ground`);
        }
      });
      before = now;
    }
    expect(problems).toEqual([]);
  });

  test("knees bend like a human's: within 0-150°, always pointing forwards", { timeout: 300_000 }, () => {
    const problems: string[] = [];
    for (const frame of frames) {
      const placement = at(frame);
      const forward = new Vector3(Math.sin(placement.rotationY), 0, Math.cos(placement.rotationY));
      for (const side of SIDES) {
        const leg = placement.pose[side === 1 ? "leftLeg" : "rightLeg"];
        if (leg.knee < 0 || leg.knee > MAX_KNEE + 1e-9) {
          problems.push(`frame ${frame}: ${sideName(side)} knee at ${((leg.knee * 180) / Math.PI).toFixed(0)}°`);
        }
        const { hip, knee, ankle } = legFramesOf(skeleton, placement, side);
        const line = origin(ankle).sub(origin(hip)).normalize();
        const out = origin(knee).sub(origin(hip));
        out.addScaledVector(line, -out.dot(line));
        const ahead = out.dot(forward);
        if (leg.knee > 0.02 ? ahead <= 0 : ahead < -1e-6) {
          problems.push(`frame ${frame}: ${sideName(side)} knee ${(ahead * 1000).toFixed(1)} mm behind the leg`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  test("feet never sink into the ground, and swinging feet clear it", { timeout: 300_000 }, () => {
    const ground = soleCentre(skeleton) - footCapsule(skeleton, 1).radius;
    const problems: string[] = [];
    const swings = new Map<number, number>();
    for (const frame of frames) {
      const placement = at(frame);
      const legs = bodyColliders(skeleton, placement).legs;
      const deepest = Math.min(...legs.map(bottom));
      if (deepest < -0.001) {
        problems.push(`frame ${frame}: ${legs.find((s) => bottom(s) === deepest)?.name} ${(-deepest * 1000).toFixed(1)} mm into the ground`);
      }
      for (const side of SIDES) {
        const lowest = Math.min(...footColliders(skeleton, placement, side).map(bottom));
        if (lowest < ground - 0.001) {
          problems.push(`frame ${frame}: ${sideName(side)} foot ${((ground - lowest) * 1000).toFixed(1)} mm below where it stands`);
        }
        const plants = plan().plants[side === 1 ? "leftLeg" : "rightLeg"];
        const landing = plants.findIndex((p) => frame / FPS < p.on);
        if (landing > 0 && frame / FPS > plants[landing - 1].off) {
          const key = side * plants[landing].on;
          swings.set(key, Math.max(swings.get(key) ?? 0, lowest - ground));
        }
      }
    }
    for (const [key, height] of swings) {
      if (height < 0.015) {
        problems.push(`the ${sideName(Math.sign(key) as Side)} foot landing at ${Math.abs(key).toFixed(2)} s only lifted ${(height * 1000).toFixed(1)} mm`);
      }
    }
    expect(problems).toEqual([]);
  });

  test("always at least one foot on the ground (walking, not hopping)", () => {
    for (const frame of frames) {
      expect(SIDES.some((side) => footAt(plan(), side, frame / FPS).plant !== null)).toBe(true);
    }
  });
});

describe("footstep sounds land on the actual foot plants", () => {
  const sounds: [string, () => number[], () => GaitPlan, number][] = [
    ["Tibik, Papiertonnen", () => footstepTimes(FPS), tibikGait, PAPIERTONNEN_DURATION],
    ["Tibik, Hausmuell", () => tibikFootsteps(FPS), hausmuellTibikGait, HAUSMUELL_DURATION],
    ["Karen", () => karenFootsteps(FPS), karenGait, HAUSMUELL_DURATION],
  ];
  test.each(sounds)("%s", (_, times, plan, duration) => {
    const plants = plan()
      .touchdowns.map((s) => s.time)
      .filter((t) => t >= 0 && t < duration);
    expect(plants.length).toBeGreaterThan(0);
    expect(times()).toHaveLength(plants.length);
    times().forEach((t, i) => expect(Math.abs(t - plants[i])).toBeLessThanOrEqual(1 / FPS));
  });
});

test("Hausmuell starts with Tibik's legs exactly as Papiertonnen ends", { timeout: 120_000 }, () => {
  const end = papiertonnenEnd().tibik;
  const start = solveHausmuell(0).tibik;
  for (const side of SIDES) {
    const a = legFramesOf(RIG, end, side);
    const b = legFramesOf(RIG, start, side);
    for (const joint of ["hip", "knee", "ankle"] as const) {
      expect(origin(b[joint]).distanceTo(origin(a[joint]))).toBeLessThan(1e-6);
    }
  }
});

describe("leg inverse kinematics", () => {
  const characters: [string, Skeleton][] = [
    ["Tibik", RIG],
    ["Karen", KAREN_SKELETON],
  ];

  test.each(characters)("%s: the leg reaches any ankle position in range, with the foot turned as asked", (_, skeleton) => {
    for (const side of SIDES) {
      for (const [dx, dy, dz, yaw, pitch] of [
        [0, 0, 0, 0, 0],
        [0, 0.05, 0.12, 0.3, -0.3],
        [0.02, 0.08, -0.15, -0.4, 0.6],
        [-0.05, 0.12, 0.05, 1.2, 0.2],
      ]) {
        const target = restAnkle(skeleton, side).add(new Vector3(dx, dy, dz));
        const rotation = new Quaternion().setFromEuler(new Euler(pitch, yaw, 0, "YXZ"));
        const leg = solveLeg(skeleton, side, target, rotation);
        const { ankle } = legFrames(skeleton, new Matrix4(), leg, side);
        expect(origin(ankle).distanceTo(target)).toBeLessThan(1e-6);
        expect(new Quaternion().setFromRotationMatrix(ankle).angleTo(rotation)).toBeLessThan(1e-6);
        expect(leg.knee).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test.each(characters)("%s: out of reach, the leg straightens towards the target instead of stretching", (_, skeleton) => {
    const side = 1;
    const target = restAnkle(skeleton, side).add(new Vector3(0, -0.2, 0.3));
    const leg = solveLeg(skeleton, side, target, new Quaternion());
    const { hip, ankle } = legFrames(skeleton, new Matrix4(), leg, side);
    expect(leg.knee).toBeCloseTo(0, 6);
    expect(origin(ankle).distanceTo(origin(hip))).toBeCloseTo(legLength(skeleton), 6);
  });

  test("standing at rest the legs are straight and the feet level", () => {
    for (const [skeleton, pose] of [
      [RIG, TIBIK_REST],
      [KAREN_SKELETON, KAREN_REST],
    ] as const) {
      for (const side of SIDES) {
        const leg = pose[side === 1 ? "leftLeg" : "rightLeg"];
        expect(leg.knee).toBeCloseTo(0, 6);
        const { ankle } = legFrames(skeleton, new Matrix4(), leg, side);
        expect(origin(ankle).distanceTo(restAnkle(skeleton, side))).toBeLessThan(1e-9);
        expect(new Vector3(0, 0, 1).transformDirection(ankle).y).toBeCloseTo(0, 9);
        expect(new Vector3(1, 0, 0).transformDirection(ankle).y).toBeCloseTo(0, 9);
      }
    }
  });
});

describe("on stairs", () => {
  const RISE = 0.175;
  const GOING = 0.28;
  const TREADS = 5;
  const TOP = (TREADS + 1) * RISE;
  const stairs: Ground = (_x, z) => {
    if (z < 0) return TOP;
    const k = Math.floor(z / GOING) + 1;
    return k > TREADS ? 0 : TOP - k * RISE;
  };
  const treadBoxes = Array.from({ length: TREADS + 2 }, (_, i) => {
    const z0 = i === 0 ? -2 : (i - 1) * GOING;
    const z1 = i === 0 ? 0 : i === TREADS + 1 ? 4 : i * GOING;
    const top = i === 0 ? TOP : stairs(0, (z0 + z1) / 2);
    return obb(`tread ${i}`, new Matrix4().makeTranslation(0, (top - 1) / 2, (z0 + z1) / 2), [3, top + 1, z1 - z0]);
  });

  const capsule = footCapsule(RIG, 1);
  const heelReach = -(capsule.heel[2] - capsule.radius);
  const treadStart = (k: number) => (k - 1) * GOING;
  const plantZ = (k: number) => treadStart(k) + 0.01 + heelReach;
  const STEP = 0.55;
  const steps: Step[] = [
    ...Array.from({ length: TREADS + 1 }, (_, i): Step => ({
      side: i % 2 === 0 ? -1 : 1,
      lift: STEP * i,
      land: STEP * i + 0.4,
      at: { x: (i % 2 === 0 ? -1 : 1) * restAnkle(RIG, 1).x, z: plantZ(i + 1) },
    })),
    { side: 1, lift: STEP * (TREADS + 1), land: STEP * (TREADS + 1) + 0.4, at: { x: restAnkle(RIG, 1).x, z: plantZ(TREADS + 1) } },
  ];
  const END = STEP * (TREADS + 2);
  const startZ = -0.25;
  const endZ = plantZ(TREADS + 1);
  const bodyZ = (t: number) => startZ + (endZ - startZ) * Math.min(1, Math.max(0, (t + 0.2) / (END - 0.2)));
  const root: RootAt = (t) => ({ x: 0, z: bodyZ(t), yaw: 0, y: stairs(0, bodyZ(t) - 0.14) });
  const plan = planGait(RIG, tibikGait().style, root, steps, [-1, END + 1], stairs);
  const placementAt = (t: number): Placement => {
    const r = root(t);
    const position: [number, number, number] = [r.x, r.y ?? 0, r.z];
    const pose = plantFeet(plan, t, { position, rotationY: r.yaw, pose: { ...TIBIK_REST, bob: 0 } });
    return { position, rotationY: r.yaw, pose };
  };
  const plants = (side: Side) => plan.plants[side === 1 ? "leftLeg" : "rightLeg"];

  test("every planted sole rests on its tread, mostly on it, never against the riser behind", () => {
    const gap = soleCentre(RIG) - capsule.radius;
    const problems: string[] = [];
    for (const side of SIDES) {
      for (const plant of plants(side)) {
        const t = Number.isFinite(plant.off) ? (Math.max(plant.on, -0.5) + plant.off) / 2 : plant.on + 0.4;
        const placement = placementAt(t);
        const tread = stairs(plant.ankle.x, plant.ankle.z);
        const lowest = Math.min(...footColliders(RIG, placement, side).map(bottom));
        if (Math.abs(lowest - tread - gap) > 0.003) {
          problems.push(`${sideName(side)} foot at ${t.toFixed(2)} s: sole ${((lowest - tread) * 1000).toFixed(1)} mm above its tread`);
        }
        const own = footCapsule(RIG, side);
        const from = own.heel[2] - own.radius;
        const to = own.toe[2] + own.radius;
        const heights = Array.from({ length: 21 }, (_, i) => stairs(plant.ankle.x, plant.ankle.z + from + ((to - from) * i) / 20));
        const supported = heights.filter((y) => Math.abs(y - tread) < 1e-9).length / heights.length;
        if (supported < 0.7) problems.push(`${sideName(side)} foot at ${t.toFixed(2)} s: only ${(supported * 100).toFixed(0)}% on its tread`);
        if (heights.some((y) => y > tread + 1e-9)) problems.push(`${sideName(side)} foot at ${t.toFixed(2)} s: heel against the riser`);
      }
    }
    expect(problems).toEqual([]);
  });

  test("a swinging foot never passes through a step", () => {
    const problems: string[] = [];
    for (let t = -0.5; t <= END + 0.5; t += 1 / 240) {
      for (const side of SIDES) {
        for (const s of footColliders(RIG, placementAt(t), side)) {
          for (const box of treadBoxes) {
            const hit = collide(s, box);
            if (hit && hit.depth > 0.001) problems.push(`${t.toFixed(3)} s: ${sideName(side)} ${s.name} ${(hit.depth * 1000).toFixed(1)} mm into ${box.name}`);
          }
        }
      }
    }
    expect(problems.slice(0, 8)).toEqual([]);
  });

  test("a foot lands without jumping", () => {
    const problems: string[] = [];
    for (const side of SIDES) {
      for (let t = -0.5; t <= END + 0.5; t += 1 / FPS) {
        const moved = footAt(plan, side, t + 1 / FPS).ankle.distanceTo(footAt(plan, side, t).ankle);
        if (moved > 0.1) problems.push(`${sideName(side)} ankle moved ${(moved * 100).toFixed(1)} cm at ${t.toFixed(2)} s`);
      }
      for (const plant of plants(side).filter((p) => Number.isFinite(p.on))) {
        const jump = footAt(plan, side, plant.on - 1e-4).ankle.distanceTo(footAt(plan, side, plant.on + 1e-4).ankle);
        if (jump > 0.003) problems.push(`${sideName(side)} foot jumps ${(jump * 1000).toFixed(1)} mm landing at ${plant.on.toFixed(2)} s`);
      }
    }
    expect(problems).toEqual([]);
  });

  test("knees stay human: within 0-150 degrees, pointing forwards", () => {
    const problems: string[] = [];
    for (let t = -0.5; t <= END + 0.5; t += 1 / FPS) {
      const placement = placementAt(t);
      for (const side of SIDES) {
        const leg = placement.pose[side === 1 ? "leftLeg" : "rightLeg"];
        if (leg.knee < 0 || leg.knee > MAX_KNEE + 1e-9) problems.push(`${t.toFixed(2)} s: ${sideName(side)} knee ${leg.knee.toFixed(2)}`);
        const { hip, knee, ankle } = legFramesOf(RIG, placement, side);
        const line = origin(ankle).sub(origin(hip)).normalize();
        const out = origin(knee).sub(origin(hip));
        out.addScaledVector(line, -out.dot(line));
        if (leg.knee > 0.02 && out.z <= 0) problems.push(`${t.toFixed(2)} s: ${sideName(side)} knee behind the leg`);
      }
    }
    expect(problems).toEqual([]);
  });

  test("going down a step, the ball of the foot lands first, then the heel lowers", () => {
    const problems: string[] = [];
    for (const side of SIDES) {
      const own = plants(side);
      own.forEach((plant, i) => {
        if (i === 0 || own[i - 1].ankle.y - plant.ankle.y < 0.1) return;
        const landing = footAt(plan, side, plant.on).pitch;
        const settled = footAt(plan, side, plant.on + plan.style.heelRoll + 0.03).pitch;
        if (landing < 0.05) problems.push(`${sideName(side)} foot lands at ${plant.on.toFixed(2)} s with pitch ${landing.toFixed(2)}: heel not up`);
        if (Math.abs(settled) > 0.01) problems.push(`${sideName(side)} foot at ${plant.on.toFixed(2)} s is not flat yet: pitch ${settled.toFixed(2)}`);
      });
    }
    expect(problems).toEqual([]);
  });

  test("on flat ground, giving the ground explicitly changes nothing", () => {
    const walk: RootAt = (t) => ({ x: 0.8 * t, z: 0, yaw: Math.PI / 2 });
    const walkSteps = rhythmicSteps({ from: 0, to: 2, first: -1, cadence: () => 4, overlap: 0.1 });
    const style = tibikGait().style;
    expect(planGait(RIG, style, walk, walkSteps, [-1, 3], FLAT_GROUND)).toEqual(planGait(RIG, style, walk, walkSteps, [-1, 3]));
  });
});
