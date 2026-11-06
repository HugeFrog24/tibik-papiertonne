import { Vector3 } from "three";
import { lazy } from "../../physics/lazy";
import { seeded } from "../../physics/seeded";
import { FLY } from "../../street/flyShape";
import { binByName, SEARCHED_BIN } from "../../street/layout";
import { TONNE } from "../../street/tonneShape";
import type { Vec3 } from "../../toon/primitives";
import { FPS } from "../../timeline";
import {
  PAPIERTONNEN_DURATION,
  SHOT_FOUND_BOX,
  SHOT_INSIDE_BIN,
  lidAt,
} from "./choreography";

type Zone = { readonly min: Vec3; readonly max: Vec3 };

const BELOW_THE_RIM = (depth: number) => TONNE.height - depth;

export const FLY_ZONES: {
  readonly inside: Zone;
  readonly mouth: Zone;
  readonly lens: Zone;
} = {
  inside: { min: [-0.17, BELOW_THE_RIM(0.2), -0.1], max: [0.17, BELOW_THE_RIM(0.06), 0.15] },
  mouth: { min: [-0.18, BELOW_THE_RIM(0.01), -0.15], max: [0.18, BELOW_THE_RIM(-0.22), 0.08] },
  lens: { min: [-0.015, 0.927, -0.203], max: [0.015, 0.94, -0.19] },
};

export const FLY_COUNT = 3;

export const DEPARTURES: readonly (number | undefined)[] = [
  undefined,
  SHOT_FOUND_BOX + 0.1,
  SHOT_FOUND_BOX + 1.1,
];

const AWAY = { direction: [0.4, 0.5, 0.75] as Vec3, distance: 4, speed: 1.2 };

const FLIGHT = {
  run: 0.4,
  runSpread: 0.25,
  speed: 0.5,
  startled: 1.0,
  calming: 1.2,
  turn: 1.66,
  turnSpread: 0.45,
  climb: 0.35,
  corner: 0.025,
  shortest: 0.12,
  flung: 1.5,
  seed: 4711,
  firstPass: 0.2,
  lingers: 4,
  betweenPasses: 0.7,
  apart: 2 * FLY.reach + 0.02,
  check: 0.01,
  attempts: 30,
};

export type FlyState = {
  readonly position: Vec3;
  readonly heading: number;
  readonly climb: number;
};

type Waypoint = { readonly t: number; readonly at: Vector3 };

const released = lazy(() => {
  for (let f = 0; f < PAPIERTONNEN_DURATION * FPS; f++)
    if (lidAt(f / FPS) > FLIGHT.flung) return f / FPS;
  return Infinity;
});

const binOrigin = lazy(() => new Vector3(...binByName(SEARCHED_BIN).position));

const within = (zone: Zone, p: Vector3) =>
  p.x >= zone.min[0] &&
  p.x <= zone.max[0] &&
  p.y >= zone.min[1] &&
  p.y <= zone.max[1] &&
  p.z >= zone.min[2] &&
  p.z <= zone.max[2];

const anywhereIn = (zone: Zone, random: () => number) =>
  new Vector3(...zone.min.map((lo, k) => lo + random() * (zone.max[k] - lo)));

const zoneAt = (t: number) =>
  t < released() ? FLY_ZONES.inside : FLY_ZONES.mouth;

const speedAt = (t: number) =>
  t >= released() && t < released() + FLIGHT.calming
    ? FLIGHT.startled
    : FLIGHT.speed;

const clearOf = (
  others: readonly Waypoint[][],
  from: Vector3,
  to: Vector3,
  t0: number,
  t1: number,
) => {
  const steps = Math.max(1, Math.ceil((t1 - t0) / FLIGHT.check));
  for (let k = 0; k <= steps; k++) {
    const t = t0 + ((t1 - t0) * k) / steps;
    const here = from.clone().lerp(to, k / steps);
    for (const other of others)
      if (localAt(other, t).distanceTo(here) < FLIGHT.apart) return false;
  }
  return true;
};

const flight = (fly: number, others: readonly Waypoint[][]): Waypoint[] => {
  const random = seeded(FLIGHT.seed + 97 * fly);
  const spread = (amount: number) => 1 + amount * (2 * random() - 1);
  let at = anywhereIn(FLY_ZONES.inside, random);
  let heading = random() * 2 * Math.PI;
  let t = 0;
  const pass = SHOT_INSIDE_BIN + FLIGHT.firstPass + FLIGHT.betweenPasses * fly;
  const path: Waypoint[] = [{ t, at }];
  const flyTo = (candidates: Vector3[], zone: Zone, speed: number) => {
    const timed = (p: Vector3) => ({
      p,
      until: t + Math.max(FLIGHT.shortest, p.distanceTo(at) / speed),
    });
    const options = [
      ...candidates,
      ...Array.from({ length: FLIGHT.attempts }, () =>
        anywhereIn(zone, random),
      ),
    ]
      .filter((p) => within(zone, p) && p.distanceTo(at) > 0.005)
      .map(timed);
    const next =
      options.find(({ p, until }) => clearOf(others, at, p, t, until)) ??
      options[0];
    heading = Math.atan2(next.p.x - at.x, next.p.z - at.z);
    t = next.until;
    at = next.p;
    path.push({ t, at });
  };
  let passed = false;
  while (t < PAPIERTONNEN_DURATION + 1) {
    const leaves = DEPARTURES[fly];
    if (leaves !== undefined && passed && t >= leaves) {
      const away = new Vector3(...AWAY.direction).normalize();
      at = at.clone().addScaledVector(away, AWAY.distance);
      t += AWAY.distance / AWAY.speed;
      path.push({ t, at });
      break;
    }
    const zone = zoneAt(t);
    const speed = speedAt(t);
    const run = FLIGHT.run * spread(FLIGHT.runSpread);
    if (!passed && t + run >= pass) {
      passed = true;
      for (let k = 0; k < FLIGHT.lingers; k++) flyTo([], FLY_ZONES.lens, speed);
      continue;
    }
    const side = random() < 0.5 ? -1 : 1;
    const turn = FLIGHT.turn * spread(FLIGHT.turnSpread / FLIGHT.turn);
    const climb = FLIGHT.climb * (2 * random() - 1);
    const tries = [side, -side].flatMap((s) =>
      [1, 0.6, 0.35].map((share) => {
        const yaw = heading + s * turn;
        const direction = new Vector3(
          Math.sin(yaw) * Math.cos(climb),
          Math.sin(climb),
          Math.cos(yaw) * Math.cos(climb),
        );
        return at.clone().addScaledVector(direction, speed * run * share);
      }),
    );
    flyTo(tries, zone, speed);
  }
  return path;
};

const flights = lazy(() =>
  Array.from({ length: FLY_COUNT }).reduce<Waypoint[][]>(
    (planned, _, fly) => [...planned, flight(fly, planned)],
    [],
  ),
);

const pointOn = (path: Waypoint[], k: number, t: number) => {
  const a = path[k];
  const b = path[Math.min(path.length - 1, k + 1)];
  const u = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
  return a.at.clone().lerp(b.at, Math.min(1, Math.max(0, u)));
};

const localAt = (path: Waypoint[], t: number) => {
  const k = Math.max(
    0,
    path.findIndex((w, i) => i + 1 < path.length && path[i + 1].t > t),
  );
  const c = FLIGHT.corner;
  const corner = [k, k + 1].find(
    (j) => j > 0 && j < path.length - 1 && Math.abs(t - path[j].t) < c,
  );
  if (corner === undefined) return pointOn(path, k, t);
  const before = pointOn(path, corner - 1, path[corner].t - c);
  const after = pointOn(path, corner, path[corner].t + c);
  const s = (t - (path[corner].t - c)) / (2 * c);
  return before
    .multiplyScalar((1 - s) ** 2)
    .addScaledVector(path[corner].at, 2 * s * (1 - s))
    .addScaledVector(after, s * s);
};

export const flyAt = (fly: number, t: number): FlyState => {
  const path = flights()[fly];
  const here = localAt(path, t);
  const ahead = localAt(path, t + 0.01).sub(here);
  const flat = Math.hypot(ahead.x, ahead.z);
  const p = here.add(binOrigin());
  return {
    position: [p.x, p.y, p.z],
    heading: Math.atan2(ahead.x, ahead.z),
    climb: Math.atan2(ahead.y, flat),
  };
};
