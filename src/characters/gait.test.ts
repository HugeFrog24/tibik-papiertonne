import { describe, expect, test } from "vitest";
import { TIMELINE_FPS } from "../timeline";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { KAREN_REST, KAREN_SKELETON } from "../Karen/rig";
import { collide, obb, origin } from "../physics/collision";
import {
  PAPIERTONNEN_DURATION,
  footstepTimes,
  tibikGait,
} from "../scenes/papiertonnen/choreography";
import {
  papiertonnenEnd,
  solvePapiertonnen,
} from "../scenes/papiertonnen/solve";
import {
  HAUSMUELL_DURATION,
  karenFootsteps,
  karenGait,
  tibikFootsteps,
  tibikGait as hausmuellTibikGait,
} from "../scenes/hausmuell/choreography";
import { solveHausmuell } from "../scenes/hausmuell/solve";
import { RIG, TIBIK_REST } from "../Tibik/rig";
import { stairwellGround } from "../building/stairwell";
import { groundWithMats } from "../building/ground";
import {
  STORY_END as TREPPENHAUS_STORY_END,
  treppenhausTibikGait,
} from "../scenes/treppenhaus/choreography";
import { solveTreppenhaus } from "../scenes/treppenhaus/solve";
import { RUNDSCHREIBEN_DURATION, tibikGait as rundschreibenTibikGait } from "../scenes/rundschreiben/choreography";
import { solveRundschreiben } from "../scenes/rundschreiben/solve";
import { entranceGround } from "../street/layout";
import { tibikGait as klingelsturmTibikGait } from "../scenes/klingelsturm/door";
import { EXIT } from "../scenes/klingelsturm/exit";
import {
  KLINGELSTURM_DURATION,
  karenStandGait,
} from "../scenes/klingelsturm/choreography";
import { solveKlingelsturm } from "../scenes/klingelsturm/solve";
import {
  FLAT_GROUND,
  LANDING,
  PLANTED_TURN,
  ankleOnTread,
  bobLimit,
  footAt,
  legOf,
  planGait,
  plantFeet,
  rhythmicSteps,
  type GaitPlan,
  type Ground,
  type RootAt,
  type Step,
} from "./gait";
import { MAX_KNEE, legLength, restAnkle, solveLeg } from "./legs";
import { FASTEST_TURN } from "./walkPath";
import { wrapAngle } from "./scalar";
import {
  bodyColliders,
  footCapsule,
  footColliders,
  legFrames,
  legFramesOf,
  type Placement,
  type Side,
  type Skeleton,
} from "./skeleton";
import { framesThrough, mm } from "../scenes/sceneChecks";
import { duskGait } from "../scenes/nachtruhe/choreography";
import { bedroomFloor, toBedGait, toWindowGait } from "../scenes/nachtruhe/bedroom";
import { DUSK, MORNING, SIT_BACK, WALK_ROUND } from "../scenes/nachtruhe/timeline";
import { solveNachtruhe } from "../scenes/nachtruhe/solve";

const framesBetween = (from: number, to: number) => framesThrough(from, to).map((t) => Math.round(t * TIMELINE_FPS));

const SIDES = [1, -1] as const;
const TWIST_SAMPLING = (1 * Math.PI) / 180;
const STILL_SPINNING: Readonly<Record<string, number>> = { "Tibik (Treppenhaus)": 15, "Tibik (Papiertonnen)": 9, "Tibik (Hausmuell)": 22 };
const sideName = (side: Side) => (side === 1 ? "left" : "right");

type Walker = {
  readonly name: string;
  readonly skeleton: Skeleton;
  readonly plan: () => GaitPlan;
  readonly frames: readonly number[];
  readonly at: (frame: number) => Placement;
  readonly ground?: Ground;
};

const STAIRS = (() => {
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
    return obb(
      `tread ${i}`,
      new Matrix4().makeTranslation(0, (top - 1) / 2, (z0 + z1) / 2),
      [3, top + 1, z1 - z0],
    );
  });
  const capsule = footCapsule(RIG, 1);
  const heelReach = -(capsule.heel[2] - capsule.radius);
  const plantZ = (k: number) => (k - 1) * GOING + 0.01 + heelReach;
  const STEP = 0.55;
  const steps: Step[] = [
    ...Array.from(
      { length: TREADS + 1 },
      (_, i): Step => ({
        side: i % 2 === 0 ? -1 : 1,
        lift: STEP * i,
        land: STEP * i + 0.4,
        at: {
          x: (i % 2 === 0 ? -1 : 1) * restAnkle(RIG, 1).x,
          z: plantZ(i + 1),
        },
      }),
    ),
    {
      side: 1,
      lift: STEP * (TREADS + 1),
      land: STEP * (TREADS + 1) + 0.4,
      at: { x: restAnkle(RIG, 1).x, z: plantZ(TREADS + 1) },
    },
  ];
  const END = STEP * (TREADS + 2);
  const startZ = -0.25;
  const endZ = plantZ(TREADS + 1);
  const bodyZ = (t: number) =>
    startZ +
    (endZ - startZ) * Math.min(1, Math.max(0, (t + 0.2) / (END - 0.2)));
  const slope = (z: number) =>
    Math.min(TOP, Math.max(0, TOP - ((z + 0.1) * RISE) / GOING));
  const root: RootAt = (t) => ({
    x: 0,
    z: bodyZ(t),
    yaw: 0,
    y: slope(bodyZ(t)),
  });
  const plan = planGait(
    RIG,
    tibikGait().style,
    root,
    steps,
    [-1, END + 1],
    stairs,
  );
  const placementAt = (t: number): Placement => {
    const r = root(t);
    const position: [number, number, number] = [r.x, r.y ?? 0, r.z];
    const pose = plantFeet(plan, t, {
      position,
      rotationY: r.yaw,
      pose: { ...TIBIK_REST, bob: 0 },
    });
    return { position, rotationY: r.yaw, pose };
  };
  const plants = (side: Side) => plan.plants[legOf(side)];
  return {
    stairs,
    treadBoxes,
    steps,
    root,
    plan,
    placementAt,
    plants,
    END,
    capsule,
    plantZ,
  };
})();

const PAPIERTONNEN_FRAMES = Array.from(
  { length: PAPIERTONNEN_DURATION * TIMELINE_FPS },
  (_, f) => f,
);
const HAUSMUELL_STEP_WINDOWS: readonly (readonly [number, number])[] = [
  [0, 2.5],
  [22.8, HAUSMUELL_DURATION],
];
const inStepWindow = (t: number) =>
  HAUSMUELL_STEP_WINDOWS.some(([a, b]) => t >= a && t <= b);
const HAUSMUELL_FRAMES = Array.from(
  { length: Math.round(HAUSMUELL_DURATION * TIMELINE_FPS) },
  (_, f) => f,
).filter((f) => inStepWindow(f / TIMELINE_FPS) || f % 4 === 0);

const TREPPENHAUS_FRAMES = Array.from(
  { length: Math.floor(TREPPENHAUS_STORY_END * TIMELINE_FPS) + 1 },
  (_, f) => f,
);
const KLINGELSTURM_KAREN_FRAMES = Array.from(
  { length: Math.round(KLINGELSTURM_DURATION * TIMELINE_FPS) },
  (_, f) => f,
);
const KLINGELSTURM_TIBIK_FRAMES = Array.from({ length: Math.round(EXIT.end * TIMELINE_FPS) }, (_, f) => f);

const WALKERS: Walker[] = [
  {
    name: "Tibik (Nachtruhe, home at dusk)",
    skeleton: RIG,
    plan: duskGait,
    frames: framesBetween(0, DUSK[1] - 1 / TIMELINE_FPS),
    at: (f) => solveNachtruhe(f / TIMELINE_FPS).tibik,
    ground: entranceGround,
  },
  {
    name: "Tibik (Nachtruhe, to bed)",
    skeleton: RIG,
    plan: toBedGait,
    frames: framesBetween(DUSK[1], SIT_BACK[0]),
    at: (f) => solveNachtruhe(f / TIMELINE_FPS).tibik,
    ground: bedroomFloor,
  },
  {
    name: "Tibik (Nachtruhe, round the bed to the window)",
    skeleton: RIG,
    plan: toWindowGait,
    frames: framesBetween(WALK_ROUND[0], MORNING[1]),
    at: (f) => solveNachtruhe(f / TIMELINE_FPS).tibik,
    ground: bedroomFloor,
  },
  {
    name: "Tibik (Rundschreiben)",
    skeleton: RIG,
    plan: rundschreibenTibikGait,
    frames: Array.from({ length: Math.round(RUNDSCHREIBEN_DURATION * TIMELINE_FPS) }, (_, f) => f),
    at: (f) => solveRundschreiben(f / TIMELINE_FPS).tibik,
    ground: entranceGround,
  },
  {
    name: "Tibik (Treppenhaus)",
    skeleton: RIG,
    plan: treppenhausTibikGait,
    frames: TREPPENHAUS_FRAMES,
    at: (f) => solveTreppenhaus(f / TIMELINE_FPS).tibik,
    ground: groundWithMats,
  },
  {
    name: "Tibik (Klingelsturm)",
    skeleton: RIG,
    plan: klingelsturmTibikGait,
    frames: KLINGELSTURM_TIBIK_FRAMES,
    at: (f) => solveKlingelsturm(f / TIMELINE_FPS).tibik,
    ground: groundWithMats,
  },
  {
    name: "Karen (Klingelsturm)",
    skeleton: KAREN_SKELETON,
    plan: karenStandGait,
    frames: KLINGELSTURM_KAREN_FRAMES,
    at: (f) => ({
      ...solveKlingelsturm(f / TIMELINE_FPS).karen,
      skeleton: KAREN_SKELETON,
    }),
    ground: groundWithMats,
  },
  {
    name: "Tibik (Papiertonnen)",
    skeleton: RIG,
    plan: tibikGait,
    frames: PAPIERTONNEN_FRAMES,
    at: (f) => solvePapiertonnen(f / TIMELINE_FPS).tibik,
    ground: stairwellGround,
  },
  {
    name: "Tibik (Hausmuell)",
    skeleton: RIG,
    plan: hausmuellTibikGait,
    frames: HAUSMUELL_FRAMES,
    at: (f) => solveHausmuell(f / TIMELINE_FPS).tibik,
  },
  {
    name: "Karen",
    skeleton: KAREN_SKELETON,
    plan: karenGait,
    frames: HAUSMUELL_FRAMES,
    at: (f) => solveHausmuell(f / TIMELINE_FPS).karen,
  },
  {
    name: "Tibik (stairs)",
    skeleton: RIG,
    plan: () => STAIRS.plan,
    frames: Array.from(
      { length: Math.round((STAIRS.END + 1) * TIMELINE_FPS) },
      (_, f) => f - Math.round(0.5 * TIMELINE_FPS),
    ),
    at: (f) => STAIRS.placementAt(f / TIMELINE_FPS),
    ground: STAIRS.stairs,
  },
];

test("in Hausmuell, all steps happen while it is checked frame by frame", () => {
  for (const plan of [hausmuellTibikGait(), karenGait()]) {
    const landings = plan.touchdowns
      .map((s) => s.time)
      .filter((t) => t >= 0 && t <= HAUSMUELL_DURATION);
    expect(landings.filter((t) => !inStepWindow(t))).toEqual([]);
  }
});

const soleCentre = (skeleton: Skeleton) =>
  restAnkle(skeleton, 1).y + footCapsule(skeleton, 1).heel[1];
const soleRest = (skeleton: Skeleton) =>
  soleCentre(skeleton) - footCapsule(skeleton, 1).radius;
const bottom = (s: { center: Vector3; radius: number }) =>
  s.center.y - s.radius;

describe.each(WALKERS)(
  "$name",
  ({ name, skeleton, plan, frames, at, ground: under = FLAT_GROUND }) => {
    const standing = (plant: { support: number }) =>
      plant.support + soleRest(skeleton);

    test(
      "a planted foot is never turned further against his hips than the planner allows (60 degrees): turning round, he steps or pivots instead of wringing the leg",
      { timeout: 300_000 },
      () => {
        const gait = plan();
        const problems = frames.flatMap((frame) => {
          const placement = at(frame);
          return SIDES.flatMap((side) => {
            const foot = footAt(gait, side, frame / TIMELINE_FPS);
            if (!foot.plant) return [];
            const ahead = new Vector3(0, 0, 1).applyQuaternion(foot.rotation);
            const twist = Math.abs(wrapAngle(Math.atan2(ahead.x, ahead.z) - placement.rotationY));
            return twist > PLANTED_TURN + TWIST_SAMPLING ? [`${(frame / TIMELINE_FPS).toFixed(2)} s ${sideName(side)}: ${((twist * 180) / Math.PI).toFixed(0)} degrees`] : [];
          });
        });
        expect(problems.slice(0, 8)).toEqual([]);
      },
    );

    test(
      "a lifted foot sets off at once: a tenth of the way into its swing it has already covered a twentieth of its way along the ground, instead of easing out from rest while the body moves on",
      { timeout: 300_000 },
      () => {
        const gait = plan();
        const [first, last] = [frames[0] / TIMELINE_FPS, frames[frames.length - 1] / TIMELINE_FPS];
        const swings = SIDES.flatMap((side) =>
          gait.plants[legOf(side)].slice(1).map((to, i) => ({ side, from: gait.plants[legOf(side)][i], to })),
        ).filter(({ from, to }) => Number.isFinite(from.off) && Number.isFinite(to.on) && from.off >= first && to.on <= last && Math.hypot(to.ankle.x - from.ankle.x, to.ankle.z - from.ankle.z) >= 0.1);
        const lagging = swings.flatMap(({ side, from, to }) => {
          const way = Math.hypot(to.ankle.x - from.ankle.x, to.ankle.z - from.ankle.z);
          const early = footAt(gait, side, from.off + 0.1 * (to.on - from.off)).ankle;
          const covered = Math.hypot(early.x - from.ankle.x, early.z - from.ankle.z) / way;
          return covered < 0.05 ? [`${from.off.toFixed(2)} s ${sideName(side)}: ${(covered * 100).toFixed(1)} %`] : [];
        });
        expect(swings.length).toBeGreaterThan(0);
        expect(lagging.slice(0, 6)).toEqual([]);
      },
    );

    test(
      "the body never spins: a turn faster than FASTEST_TURN (5 rad/s) happens in no more frames than the few authored turns still waiting to be re-timed",
      { timeout: 300_000 },
      () => {
        const fast = frames.slice(1).flatMap((frame, i) => {
          const rate = Math.abs(wrapAngle(at(frame).rotationY - at(frames[i]).rotationY)) * TIMELINE_FPS;
          return frame === frames[i] + 1 && rate > FASTEST_TURN + 1e-6 ? [`${(frame / TIMELINE_FPS).toFixed(2)} s: ${rate.toFixed(1)} rad/s`] : [];
        });
        expect(fast.length, fast.join("; ")).toBeLessThanOrEqual(STILL_SPINNING[name] ?? 0);
      },
    );

    test(
      "as a foot lands and takes his weight its knee is already bent at least LANDING.knee, never dead straight",
      { timeout: 300_000 },
      () => {
        const gait = plan();
        const straight = SIDES.flatMap((side) =>
          gait.plants[legOf(side)]
            .filter((p) => Number.isFinite(p.on) && p.on * TIMELINE_FPS >= frames[0] && p.on * TIMELINE_FPS <= frames[frames.length - 1] - 1)
            .flatMap((p) => {
              const frame = Math.ceil(p.on * TIMELINE_FPS - 1e-6);
              const knee = at(frame).pose[legOf(side)].knee;
              return knee < LANDING.knee - 0.02 ? [`${(frame / TIMELINE_FPS).toFixed(2)} s ${sideName(side)}: knee ${knee.toFixed(2)}`] : [];
            }),
        );
        expect(straight.slice(0, 8)).toEqual([]);
      },
    );

    test(
      "every foot stays within the leg's reach: no ankle, planted or lifted, is ever asked to be further from the hip than the leg is long (a leg pulled past full length goes dead straight for a frame and snaps back)",
      { timeout: 300_000 },
      () => {
        const gait = plan();
        const problems = frames.flatMap((frame) => {
          const placement = at(frame);
          return SIDES.flatMap((side) => {
            const hip = origin(legFramesOf(skeleton, placement, side).hip);
            const beyond = hip.distanceTo(footAt(gait, side, frame / TIMELINE_FPS).ankle) - legLength(skeleton);
            return beyond > 0.001 ? [`${(frame / TIMELINE_FPS).toFixed(2)} s ${sideName(side)}: ${mm(beyond)} beyond reach`] : [];
          });
        });
        expect(problems.slice(0, 8)).toEqual([]);
      },
    );

    test(
      "planted feet don't slide: the part of the sole on the ground stays put until the foot lifts off",
      { timeout: 300_000 },
      () => {
        const problems: string[] = [];
        let before = SIDES.map((side) =>
          footColliders(skeleton, at(frames[0]), side),
        );
        for (let k = 1; k < frames.length; k++) {
          const frame = frames[k];
          const now = SIDES.map((side) =>
            footColliders(skeleton, at(frame), side),
          );
          SIDES.forEach((side, i) => {
            const was = footAt(plan(), side, frames[k - 1] / TIMELINE_FPS).plant;
            const is = footAt(plan(), side, frame / TIMELINE_FPS).plant;
            if (!is) {
              return;
            }
            const ground = standing(is);
            const lowest = Math.min(...now[i].map(bottom));
            if (Math.abs(lowest - ground) > 0.001) {
              problems.push(
                `frame ${frame}: ${sideName(side)} foot planted ${mm(lowest - ground)} off the ground`,
              );
            }
            if (was !== is) {
              return;
            }
            now[i].forEach((sphere, j) => {
              const touching =
                bottom(sphere) - ground < 0.001 &&
                bottom(before[i][j]) - ground < 0.001;
              const slid = Math.hypot(
                sphere.center.x - before[i][j].center.x,
                sphere.center.z - before[i][j].center.z,
              );
              if (touching && slid > 0.003) {
                problems.push(
                  `frame ${frame}: ${sideName(side)} sole slid ${mm(slid)}`,
                );
              }
            });
            const flat = [...now[i], ...before[i]].every(
              (s) => bottom(s) - ground < 0.001,
            );
            const moved = Math.max(
              ...now[i].map((s, j) =>
                Math.hypot(
                  s.center.x - before[i][j].center.x,
                  s.center.z - before[i][j].center.z,
                ),
              ),
            );
            if (flat && moved > 0.003) {
              problems.push(
                `frame ${frame}: ${sideName(side)} foot moved ${mm(moved)} while flat on the ground`,
              );
            }
          });
          before = now;
        }
        expect(problems).toEqual([]);
      },
    );

    test(
      "knees bend like a human's: within 0-150°, always pointing forwards",
      { timeout: 300_000 },
      () => {
        const problems: string[] = [];
        for (const frame of frames) {
          const placement = at(frame);
          const forward = new Vector3(
            Math.sin(placement.rotationY),
            0,
            Math.cos(placement.rotationY),
          );
          for (const side of SIDES) {
            const leg = placement.pose[legOf(side)];
            if (leg.knee < 0 || leg.knee > MAX_KNEE + 1e-9) {
              problems.push(
                `frame ${frame}: ${sideName(side)} knee at ${((leg.knee * 180) / Math.PI).toFixed(0)}°`,
              );
            }
            const { hip, knee, ankle } = legFramesOf(skeleton, placement, side);
            const line = origin(ankle).sub(origin(hip)).normalize();
            const out = origin(knee).sub(origin(hip));
            out.addScaledVector(line, -out.dot(line));
            const ahead = out.dot(forward);
            if (leg.knee > 0.02 ? ahead <= 0 : ahead < -1e-6) {
              problems.push(
                `frame ${frame}: ${sideName(side)} knee ${mm(ahead)} behind the leg`,
              );
            }
          }
        }
        expect(problems).toEqual([]);
      },
    );

    test(
      "feet never sink into the ground, and swinging feet clear it",
      { timeout: 300_000 },
      () => {
        const problems: string[] = [];
        const swings = new Map<number, number>();
        const aboveGround = (s: { center: Vector3; radius: number }) =>
          bottom(s) - under(s.center.x, s.center.z);
        for (const frame of frames) {
          const placement = at(frame);
          const legs = bodyColliders(skeleton, placement).legs;
          const deepest = Math.min(...legs.map(aboveGround));
          if (deepest < -0.001) {
            problems.push(
              `frame ${frame}: ${legs.find((s) => aboveGround(s) === deepest)?.name} ${mm(-deepest)} into the ground`,
            );
          }
          for (const side of SIDES) {
            const foot = footColliders(skeleton, placement, side);
            const planted = footAt(plan(), side, frame / TIMELINE_FPS).plant;
            if (planted) {
              const lowest = Math.min(...foot.map(bottom));
              if (lowest < standing(planted) - 0.001) {
                problems.push(
                  `frame ${frame}: ${sideName(side)} foot ${mm(standing(planted) - lowest)} below where it stands`,
                );
              }
              continue;
            }
            const plants = plan().plants[legOf(side)];
            const landing = plants.findIndex((p) => frame / TIMELINE_FPS < p.on);
            if (landing > 0 && frame / TIMELINE_FPS > plants[landing - 1].off) {
              const key = side * plants[landing].on;
              const clearance =
                Math.min(...foot.map(aboveGround)) - soleRest(skeleton);
              swings.set(key, Math.max(swings.get(key) ?? 0, clearance));
            }
          }
        }
        for (const [key, height] of swings) {
          if (height < 0.015) {
            problems.push(
              `the ${sideName(Math.sign(key) as Side)} foot landing at ${Math.abs(key).toFixed(2)} s only lifted ${mm(height)}`,
            );
          }
        }
        expect(problems).toEqual([]);
      },
    );

    test(
      "the body never jumps: the hips move smoothly from frame to frame",
      { timeout: 300_000 },
      () => {
        const problems: string[] = [];
        const hipHeight = (frame: number) => {
          const placement = at(frame);
          return placement.position[1] + placement.pose.bob;
        };
        for (let k = 1; k < frames.length; k++) {
          if (frames[k] - frames[k - 1] !== 1) continue;
          const jump = Math.abs(
            hipHeight(frames[k]) - hipHeight(frames[k - 1]),
          );
          if (jump > 0.03)
            problems.push(
              `frame ${frames[k]}: hips moved ${(jump * 100).toFixed(1)} cm`,
            );
        }
        expect(problems).toEqual([]);
      },
    );

    test("always at least one foot on the ground (walking, not hopping)", () => {
      for (const frame of frames) {
        expect(
          SIDES.some(
            (side) => footAt(plan(), side, frame / TIMELINE_FPS).plant !== null,
          ),
        ).toBe(true);
      }
    });
  },
);

describe("footstep sounds land on the actual foot plants, on the timeline's 30 fps grid whatever rate the film renders at", () => {
  const sounds: [string, () => number[], () => GaitPlan, number][] = [
    [
      "Tibik, Papiertonnen",
      () => footstepTimes(),
      tibikGait,
      PAPIERTONNEN_DURATION,
    ],
    [
      "Tibik, Hausmuell",
      () => tibikFootsteps(),
      hausmuellTibikGait,
      HAUSMUELL_DURATION,
    ],
    ["Karen", () => karenFootsteps(), karenGait, HAUSMUELL_DURATION],
  ];
  test.each(sounds)("%s", (_, times, plan, duration) => {
    const plants = plan()
      .touchdowns.map((s) => s.time)
      .filter((t) => t >= 0 && t < duration);
    expect(plants.length).toBeGreaterThan(0);
    expect(times()).toHaveLength(plants.length);
    times().forEach((t, i) => { expect(Math.abs(t - plants[i])).toBeLessThanOrEqual(1 / TIMELINE_FPS); },
    );
    for (const t of times()) expect(Math.abs(t * TIMELINE_FPS - Math.round(t * TIMELINE_FPS)), `${t} s`).toBeLessThan(1e-9);
  });
});

test(
  "Hausmuell starts with Tibik's legs exactly as Papiertonnen ends",
  { timeout: 120_000 },
  () => {
    const end = papiertonnenEnd().tibik;
    const start = solveHausmuell(0).tibik;
    for (const side of SIDES) {
      const a = legFramesOf(RIG, end, side);
      const b = legFramesOf(RIG, start, side);
      for (const joint of ["hip", "knee", "ankle"] as const) {
        expect(origin(b[joint]).distanceTo(origin(a[joint]))).toBeLessThan(
          1e-6,
        );
      }
    }
  },
);

describe("leg inverse kinematics", () => {
  const characters: [string, Skeleton][] = [
    ["Tibik", RIG],
    ["Karen", KAREN_SKELETON],
  ];

  test.each(characters)(
    "%s: the leg reaches any ankle position in range, with the foot turned as asked",
    (_, skeleton) => {
      for (const side of SIDES) {
        for (const [dx, dy, dz, yaw, pitch] of [
          [0, 0, 0, 0, 0],
          [0, 0.05, 0.12, 0.3, -0.3],
          [0.02, 0.08, -0.15, -0.4, 0.6],
          [-0.05, 0.12, 0.05, 1.2, 0.2],
        ]) {
          const target = restAnkle(skeleton, side).add(new Vector3(dx, dy, dz));
          const rotation = new Quaternion().setFromEuler(
            new Euler(pitch, yaw, 0, "YXZ"),
          );
          const leg = solveLeg(skeleton, side, target, rotation);
          const { ankle } = legFrames(skeleton, new Matrix4(), leg, side);
          expect(origin(ankle).distanceTo(target)).toBeLessThan(1e-6);
          expect(
            new Quaternion().setFromRotationMatrix(ankle).angleTo(rotation),
          ).toBeLessThan(1e-6);
          expect(leg.knee).toBeGreaterThanOrEqual(0);
        }
      }
    },
  );

  test.each(characters)(
    "%s: out of reach, the leg straightens towards the target instead of stretching",
    (_, skeleton) => {
      const side = 1;
      const target = restAnkle(skeleton, side).add(new Vector3(0, -0.2, 0.3));
      const leg = solveLeg(skeleton, side, target, new Quaternion());
      const { hip, ankle } = legFrames(skeleton, new Matrix4(), leg, side);
      expect(leg.knee).toBeCloseTo(0, 6);
      expect(origin(ankle).distanceTo(origin(hip))).toBeCloseTo(
        legLength(skeleton),
        6,
      );
    },
  );

  test("standing at rest the legs are straight and the feet level", () => {
    for (const [skeleton, pose] of [
      [RIG, TIBIK_REST],
      [KAREN_SKELETON, KAREN_REST],
    ] as const) {
      for (const side of SIDES) {
        const leg = pose[side === 1 ? "leftLeg" : "rightLeg"];
        expect(leg.knee).toBeCloseTo(0, 6);
        const { ankle } = legFrames(skeleton, new Matrix4(), leg, side);
        expect(
          origin(ankle).distanceTo(restAnkle(skeleton, side)),
        ).toBeLessThan(1e-9);
        expect(new Vector3(0, 0, 1).transformDirection(ankle).y).toBeCloseTo(
          0,
          9,
        );
        expect(new Vector3(1, 0, 0).transformDirection(ankle).y).toBeCloseTo(
          0,
          9,
        );
      }
    }
  });
});

describe("on stairs", () => {
  const { stairs, treadBoxes, plan, placementAt, plants, END, capsule } =
    STAIRS;

  test("every planted sole rests on its tread, mostly on it, never against the riser behind", () => {
    const gap = soleCentre(RIG) - capsule.radius;
    const problems: string[] = [];
    for (const side of SIDES) {
      for (const plant of plants(side)) {
        const t = Number.isFinite(plant.off)
          ? (Math.max(plant.on, -0.5) + plant.off) / 2
          : plant.on + 0.4;
        const placement = placementAt(t);
        const tread = stairs(plant.ankle.x, plant.ankle.z);
        const lowest = Math.min(
          ...footColliders(RIG, placement, side).map(bottom),
        );
        if (Math.abs(lowest - tread - gap) > 0.003) {
          problems.push(
            `${sideName(side)} foot at ${t.toFixed(2)} s: sole ${mm(lowest - tread)} above its tread`,
          );
        }
        const own = footCapsule(RIG, side);
        const from = own.heel[2] - own.radius;
        const to = own.toe[2] + own.radius;
        const heights = Array.from({ length: 21 }, (_, i) =>
          stairs(plant.ankle.x, plant.ankle.z + from + ((to - from) * i) / 20),
        );
        const supported =
          heights.filter((y) => Math.abs(y - tread) < 1e-9).length /
          heights.length;
        if (supported < 0.7)
          problems.push(
            `${sideName(side)} foot at ${t.toFixed(2)} s: only ${(supported * 100).toFixed(0)}% on its tread`,
          );
        if (heights.some((y) => y > tread + 1e-9))
          problems.push(
            `${sideName(side)} foot at ${t.toFixed(2)} s: heel against the riser`,
          );
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
            if (hit && hit.depth > 0.001)
              problems.push(
                `${t.toFixed(3)} s: ${sideName(side)} ${s.name} ${mm(hit.depth)} into ${box.name}`,
              );
          }
        }
      }
    }
    expect(problems.slice(0, 8)).toEqual([]);
  });

  test("a foot lands without jumping", () => {
    const problems: string[] = [];
    for (const side of SIDES) {
      for (let t = -0.5; t <= END + 0.5; t += 1 / TIMELINE_FPS) {
        const moved = footAt(plan, side, t + 1 / TIMELINE_FPS).ankle.distanceTo(
          footAt(plan, side, t).ankle,
        );
        if (moved > 0.1)
          problems.push(
            `${sideName(side)} ankle moved ${(moved * 100).toFixed(1)} cm at ${t.toFixed(2)} s`,
          );
      }
      for (const plant of plants(side).filter((p) => Number.isFinite(p.on))) {
        const jump = footAt(plan, side, plant.on - 1e-4).ankle.distanceTo(
          footAt(plan, side, plant.on + 1e-4).ankle,
        );
        if (jump > 0.003)
          problems.push(
            `${sideName(side)} foot jumps ${mm(jump)} landing at ${plant.on.toFixed(2)} s`,
          );
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
        const settled = footAt(
          plan,
          side,
          plant.on + plan.style.heelRoll + 0.03,
        ).pitch;
        if (landing < 0.05)
          problems.push(
            `${sideName(side)} foot lands at ${plant.on.toFixed(2)} s with pitch ${landing.toFixed(2)}: heel not up`,
          );
        if (Math.abs(settled) > 0.01)
          problems.push(
            `${sideName(side)} foot at ${plant.on.toFixed(2)} s is not flat yet: pitch ${settled.toFixed(2)}`,
          );
      });
    }
    expect(problems).toEqual([]);
  });

  test("on flat ground, a ground that is flat everywhere plans exactly the same walk", () => {
    const walk: RootAt = (t) => ({ x: 0.8 * t, z: 0, yaw: Math.PI / 2 });
    const walkSteps = rhythmicSteps({
      from: 0,
      to: 2,
      first: -1,
      cadence: () => 4,
      overlap: 0.1,
    });
    const style = tibikGait().style;
    const flat = planGait(RIG, style, walk, walkSteps, [-1, 3]);
    const level = planGait(RIG, style, walk, walkSteps, [-1, 3], () => 0);
    expect(level.plants).toEqual(flat.plants);
    expect(level.bob).toEqual(flat.bob);
    for (let t = -0.5; t < 2.5; t += 0.01) {
      for (const side of SIDES) {
        expect(
          footAt(level, side, t).ankle.distanceTo(footAt(flat, side, t).ankle),
        ).toBeLessThan(1e-9);
      }
    }
  });

  test("a single step in a walk only changes the hip smoothing around it, not the flat stretch after it", () => {
    const walk: RootAt = (t) => ({ x: 0.8 * t, z: 0, yaw: Math.PI / 2 });
    const walkSteps = rhythmicSteps({
      from: 0,
      to: 4,
      first: -1,
      cadence: () => 4,
      overlap: 0.1,
    });
    const style = tibikGait().style;
    const flat = planGait(RIG, style, walk, walkSteps, [-1, 5]);
    const doorStep: Ground = (x) => (x < 0.12 ? 0.15 : 0);
    const stepping = planGait(RIG, style, walk, walkSteps, [-1, 5], doorStep);
    expect(stepping.level).toBe(false);
    for (let t = 1.5; t < 4.5; t += 0.01) {
      expect(bobLimit(stepping, t)).toBe(bobLimit(flat, t));
    }
  });

  test("a foot authored to land inside a step is refused", () => {
    const into = STAIRS.steps.map((step, i) =>
      i === 2 && step.at
        ? { ...step, at: { x: step.at.x, z: step.at.z - 0.04 } }
        : step,
    );
    expect(() =>
      planGait(
        RIG,
        tibikGait().style,
        STAIRS.root,
        into,
        [-1, END + 1],
        stairs,
      ),
    ).toThrow(/inside/);
  });
});

test("a foot placed on a tread has its heel exactly the gap in front of the riser", () => {
  for (const yaw of [0, Math.PI / 2, 2.4]) {
    for (const side of SIDES) {
      const ankle = ankleOnTread(RIG, side, yaw, { x: 1, z: -2 }, 0.01);
      const { heel, radius } = footCapsule(RIG, side);
      const forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const heelEnd = new Vector3(ankle.x, 0, ankle.z).addScaledVector(
        forward,
        heel[2] - radius,
      );
      expect(
        heelEnd
          .clone()
          .sub(new Vector3(1, 0, -2))
          .dot(forward),
      ).toBeCloseTo(0.01, 9);
    }
  }
});

test("rhythmicSteps can end a walk on a given foot: when its natural count ends on the other foot it fits one more, slightly shorter step into the same time, and otherwise changes nothing", () => {
  const cadence = (t: number) => 2.4 + 0.3 * Math.sin(t);
  for (const to of [2.0, 2.2, 2.4, 2.6, 3.1])
    for (const last of [1, -1] as const) {
      const natural = rhythmicSteps({ from: 0.5, to, first: 1, cadence, overlap: 0.3 });
      const steps = rhythmicSteps({ from: 0.5, to, first: 1, cadence, overlap: 0.3, last });
      expect(steps[steps.length - 1].side).toBe(last);
      expect(steps[0].side).toBe(1);
      if (natural[natural.length - 1].side === last) expect(steps).toEqual(natural);
      else expect(steps.length).toBe(natural.length + 1);
      for (const s of steps) expect(s.land).toBeLessThanOrEqual(to + 1e-9);
    }
});

test("rhythmicSteps asked to end on a foot copes with walks too short for a step: none when the walk takes no time, one or two steps when it is shorter than a step, ending on that foot", () => {
  const cadence = () => 2.4;
  expect(rhythmicSteps({ from: 1, to: 1, first: 1, cadence, overlap: 0.3, last: -1 })).toEqual([]);
  for (const last of [1, -1] as const) {
    const steps = rhythmicSteps({ from: 0, to: 0.3, first: 1, cadence, overlap: 0.3, last });
    expect(steps.length).toBe(last === 1 ? 1 : 2);
    expect(steps[steps.length - 1].side).toBe(last);
    for (const s of steps) expect(s.land).toBeLessThanOrEqual(0.3 + 1e-9);
  }
});
