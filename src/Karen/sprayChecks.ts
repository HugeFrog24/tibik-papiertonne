import { Vector3 } from "three";
import { FRAME_SIZE, onScreen, seenBy } from "../dialogue/screen";
import type { CameraSetup } from "../scenes/hausmuell/cameras";
import type { Placement } from "../characters/skeleton";
import type { Line } from "../dialogue/line";
import {
  capsule,
  contacts,
  sphere,
  type Obb,
  type Solid,
} from "../physics/collision";
import { insideKarenHead, toKarenHead } from "./mouthEmitter";
import { atFrame } from "./sceneSpray";
import { SPITTLE, type Spike } from "./spittle";
import {
  SPRAY,
  flightPoint,
  type Burst,
  type Flight,
  type SprayFrame,
} from "./spray";
import { mm } from "../scenes/sceneChecks";

export const outOfPlace = (
  flights: readonly Flight[],
  lines: readonly Line[],
  karenAt: (t: number) => Placement,
): string[] => {
  const shouts = lines.filter(
    (l) => l.speaker === "karen" && l.tone === "shout",
  );
  const problems: string[] = [];
  for (const { launch } of flights) {
    if (
      !shouts.some((l) => launch.at > l.from - 0.05 && launch.at < l.to + 0.05)
    )
      problems.push(`${launch.id}: not on a shouted line`);
    const karen = karenAt(atFrame(launch.at));
    const p = toKarenHead(launch.from, karen);
    if (insideKarenHead(launch.from, karen))
      problems.push(`${launch.id}: starts inside her head`);
    if (p.z < 0.1 || Math.abs(p.x) > 0.01)
      problems.push(`${launch.id}: not in front of her lips`);
  }
  return problems;
};

export const passingThrough = (
  flights: readonly Flight[],
  targets: (t: number) => readonly Solid[],
): string[] => {
  const fine = SPRAY.step / 4;
  const problems: string[] = [];
  for (const { launch, landing } of flights) {
    const end = landing ? landing.at - launch.at - SPRAY.step : SPRAY.flight;
    for (let time = fine; time < end; time += fine) {
      const hit = contacts(
        [sphere(launch.id, flightPoint(launch, time), launch.radius)],
        targets(launch.at + time),
      )[0];
      if (hit) {
        problems.push(`${launch.id} inside ${hit.b} at ${time.toFixed(4)} s`);
        break;
      }
    }
  }
  return problems;
};

export const strayFlights = (flights: readonly Flight[]): string[] =>
  flights.flatMap(({ launch, landing }) => {
    if (!landing) return [`${launch.id}: never lands`];
    const reach = Math.hypot(
      landing.point.x - launch.from.x,
      landing.point.z - launch.from.z,
    );
    return [
      ...(landing.at - launch.at > SPRAY.flight
        ? [`${launch.id}: flies too long`]
        : []),
      ...(reach >= 2 ? [`${launch.id}: lands ${reach.toFixed(2)} m away`] : []),
    ];
  });

export const spotsOffTheirSurface = (
  flights: readonly Flight[],
  frameAt: (t: number) => SprayFrame,
  surfaceAt: (name: string, t: number) => Obb | undefined,
  after: readonly number[],
): string[] =>
  flights.flatMap(({ launch, landing, follow }) => {
    if (!landing || !follow) return [];
    return after.flatMap((dt) => {
      const spot = frameAt(landing.at + dt).spots.find(
        (s) => s.id === launch.id,
      );
      const box = surfaceAt(landing.on, landing.at + dt);
      if (!spot || !box) return [];
      const local = box.axes.map((axis) =>
        spot.point.clone().sub(box.center).dot(axis),
      );
      const onAFace = local.some(
        (v, i) => Math.abs(Math.abs(v) - box.half[i]) < 1e-6,
      );
      const inside = local.every((v, i) => Math.abs(v) <= box.half[i] + 1e-6);
      return onAFace && inside
        ? []
        : [`${launch.id} at +${dt} s: off ${landing.on}`];
    });
  });

export const tooThin = (
  flights: readonly Flight[],
  targets: (t: number) => readonly Solid[],
): string[] => {
  const step = SPRAY.step * SPRAY.speed[1] - 2 * SPRAY.radius[0];
  const thin = new Set<string>();
  for (const { launch, landing } of flights)
    for (const t of [launch.at, landing?.at ?? launch.at + SPRAY.flight])
      for (const s of targets(t)) {
        const least =
          s.kind === "obb"
            ? 2 * Math.min(...s.half)
            : s.kind === "sphere"
              ? 2 * s.radius
              : Infinity;
        if (least <= step) thin.add(`${s.name} (${mm(least, 2)})`);
      }
  return [...thin];
};

export const dropWidthsOnScreen = (
  flights: readonly Flight[],
  frameAt: (t: number) => SprayFrame,
  cameraAt: (t: number) => CameraSetup,
  after = 0.08,
): number[] =>
  flights.flatMap(({ launch }) => {
    const t = launch.at + after;
    const drop = frameAt(t).drops.find((d) => d.id === launch.id);
    const setup = cameraAt(t);
    if (!drop || !seenBy(drop.head, setup)) return [];
    const eye = new Vector3(...setup.position);
    const view = new Vector3(...setup.target).sub(eye).normalize();
    const depth = drop.head.clone().sub(eye).dot(view);
    const tan = Math.tan(((setup.fov / 2) * Math.PI) / 180);
    return [((2 * drop.radius) / (2 * depth * tan)) * FRAME_SIZE.height];
  });

export const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const SPITTLE_PHASES = [0.1, 0.3, 0.5, 0.7, 0.9];

export const spittleClashes = (
  loud: readonly Burst[],
  spittleAt: (t: number) => readonly Spike[],
  targets: (t: number) => readonly Solid[],
  karenAt: (t: number) => Placement,
): string[] => {
  const problems: string[] = [];
  for (const burst of loud)
    for (const phase of SPITTLE_PHASES) {
      const t = burst.at + phase * SPITTLE.life;
      const karen = karenAt(atFrame(t));
      for (const s of spittleAt(t).filter((s) => s.burst === burst.seed)) {
        const balls = [
          ...capsule(s.id, s.from, s.to, s.radius),
          sphere(s.id, s.to, s.bead),
        ];
        const hit = contacts(balls, targets(t))[0];
        if (hit) problems.push(`${s.id} +${phase}: inside ${hit.b}`);
        if (insideKarenHead(s.to, karen))
          problems.push(`${s.id} +${phase}: inside her head`);
      }
    }
  return problems;
};

export const spittleSpansOnScreen = (
  loud: readonly Burst[],
  spittleAt: (t: number) => readonly Spike[],
  cameraAt: (t: number) => CameraSetup,
): number[] =>
  loud.flatMap((burst) => {
    const t = burst.at + 0.45 * SPITTLE.life;
    const setup = cameraAt(t);
    const tips = spittleAt(t)
      .filter((s) => s.burst === burst.seed)
      .map((s) => s.to);
    if (tips.length < 2 || !tips.every((p) => seenBy(p, setup))) return [];
    const xs = tips.map((p) => onScreen(p, setup)[0]);
    return [Math.max(...xs) - Math.min(...xs)];
  });
