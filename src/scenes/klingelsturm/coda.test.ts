import { Vector3 } from "three";
import { expect, test } from "vitest";
import { SHOES, SHOE } from "../../building/doormatShape";
import { type Door, doorFrame } from "../../building/doors";
import {
  CORE,
  LANE_SPLIT,
  NEIGHBOUR_DOOR,
  TIBIK_DOOR,
  doorLanding,
} from "../../building/stairwell";
import { bodyColliders, footColliders } from "../../characters/skeleton";
import { footfallOffset } from "../../Karen/footfall";
import { mouthInWorld, onScreen, seenBy } from "../../dialogue/screen";
import { KAREN_SKELETON } from "../../Karen/rig";
import { FPS } from "../../timeline";
import type { CameraSetup } from "../hausmuell/cameras";
import { SHOTS, cameraAt } from "./cameras";
import {
  KAREN_HOME,
  KLINGELSTURM_DURATION,
  karenAt,
  karenStandGait,
} from "./choreography";
import { SHUT } from "./door";

test("after he shuts his door Karen crosses to her own door and phones from there, facing the stairs", () => {
  expect(KAREN_HOME.turn[0]).toBeGreaterThanOrEqual(SHUT[1]);
  for (let t = KAREN_HOME.side[1] + 0.1; t <= KLINGELSTURM_DURATION; t += 0.5) {
    const karen = karenAt(t);
    expect(karen.position[0], t.toFixed(1)).toBeGreaterThan(LANE_SPLIT);
    expect(karen.position[0], t.toFixed(1)).toBeLessThan(CORE.x1 - 0.5);
    expect(Math.cos(karen.rotationY), t.toFixed(1)).toBeGreaterThan(0.95);
  }
});

test("she never steps on her own shoes standing on her mat", () => {
  const problems: string[] = [];
  for (
    let f = Math.floor(SHUT[1] * FPS);
    f <= KLINGELSTURM_DURATION * FPS;
    f++
  ) {
    const t = f / FPS;
    const karen = { ...karenAt(t), skeleton: KAREN_SKELETON };
    for (const side of [1, -1] as const)
      for (const sphere of footColliders(KAREN_SKELETON, karen, side))
        for (const shoe of SHOES) {
          const dx = Math.max(
            0,
            Math.abs(sphere.center.x - shoe.position[0]) - SHOE[0],
          );
          const dz = Math.max(
            0,
            Math.abs(sphere.center.z - shoe.position[2]) - SHOE[2],
          );
          if (Math.hypot(dx, dz) < sphere.radius)
            problems.push(`${t.toFixed(2)} s: foot ${side} on a shoe`);
        }
  }
  expect(problems.slice(0, 5)).toEqual([]);
});

test("crossing, her footfalls land near her centre line, on average well inside her wide standing stance, which she takes again at her door", () => {
  const sideways = (t: number, side: 1 | -1) =>
    footfallOffset(karenAt(t), side);
  const standingBefore = sideways(KAREN_HOME.side[0] - 0.5, 1);
  const crossing = karenStandGait()
    .touchdowns.filter(
      (s) => s.time > KAREN_HOME.side[0] && s.time < KAREN_HOME.side[1] - 0.25,
    )
    .map((s) => sideways(s.time + 0.01, s.side));
  expect(crossing.length).toBeGreaterThan(4);
  const mean = crossing.reduce((a, b) => a + b, 0) / crossing.length;
  expect(mean).toBeLessThan(0.7 * standingBefore);
  expect(Math.max(...crossing)).toBeLessThan(standingBefore);
  for (const side of [1, -1] as const)
    expect(sideways(KAREN_HOME.side[1] + 0.5, side)).toBeCloseTo(
      standingBefore,
      2,
    );
});

const plateOf = (door: Door) =>
  new Vector3(
    door.width / 2,
    1.35,
    doorLanding(door) * (door.thickness / 2),
  ).applyMatrix4(doorFrame(door, 0));

const offFrame = (point: Vector3, setup: CameraSetup, margin: number) => {
  const [x, y] = onScreen(point, setup);
  return seenBy(point, setup, margin)
    ? null
    : `at ${x.toFixed(0)}, ${y.toFixed(0)}`;
};

const fromTheLens = (t: number, setup: CameraSetup) => {
  const body = bodyColliders(KAREN_SKELETON, karenAt(t));
  const eye = new Vector3(...setup.position);
  return Math.min(
    ...[...body.torso, ...body.head, ...body.leftArm, ...body.rightArm].map(
      (s) => s.center.distanceTo(eye) - s.radius,
    ),
  );
};

const herFace = (t: number) => mouthInWorld(KAREN_SKELETON, karenAt(t));

const framesOf = (prefix: string, step: number) =>
  SHOTS.filter((s) => s.name.startsWith(prefix)).flatMap((shot) => {
    const times: { shot: string; t: number }[] = [];
    for (let f = Math.ceil(shot.from * FPS); f < shot.to * FPS; f += step)
      times.push({ shot: shot.name, t: f / FPS });
    return times;
  });

const NEAREST = 1.0;

const herFraming = (
  label: string,
  t: number,
  setup: CameraSetup,
  margin: number,
) => {
  const problems: string[] = [];
  const face = offFrame(herFace(t), setup, margin);
  if (face) problems.push(`${label} ${t.toFixed(2)} s: face ${face}`);
  const near = fromTheLens(t, setup);
  if (near < NEAREST)
    problems.push(
      `${label} ${t.toFixed(2)} s: body ${near.toFixed(2)} m from the lens`,
    );
  return problems;
};

test("in the medium shots her face stays in frame and her body keeps a metre from the lens, crossing included", () => {
  const problems: string[] = [];
  for (const { shot, t } of framesOf("Medium:", 2))
    problems.push(...herFraming(shot, t, cameraAt(t), 0.05));
  expect(problems.slice(0, 10)).toEqual([]);
});

test("once she is home, the medium shots show her door's Schulz nameplate beside her", () => {
  const plate = plateOf(NEIGHBOUR_DOOR);
  const problems = framesOf("Medium:", 5)
    .filter(({ t }) => t >= KAREN_HOME.side[1])
    .flatMap(({ shot, t }) => {
      const off = offFrame(plate, cameraAt(t), 0.1);
      return off ? [`${shot} ${t.toFixed(2)} s: plate ${off}`] : [];
    });
  expect(problems.slice(0, 6)).toEqual([]);
});

test("when the light goes out the wide holds her, a metre off, and his door, which he comes out of", () => {
  const plate = plateOf(TIBIK_DOOR);
  const problems: string[] = [];
  for (const { shot, t } of framesOf("Wide: the light goes out", 5)) {
    const setup = cameraAt(t);
    problems.push(...herFraming(shot, t, setup, 0.08));
    const door = offFrame(plate, setup, 0.08);
    if (door) problems.push(`${t.toFixed(2)} s: his nameplate ${door}`);
  }
  expect(problems.slice(0, 8)).toEqual([]);
});
