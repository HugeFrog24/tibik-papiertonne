import { Vector3 } from "three";
import { random } from "remotion";
import { lerp } from "../characters/scalar";
import type { Line } from "../dialogue/line";
import { contacts, sphere, type Obb, type Solid } from "../physics/collision";
import type { Spike } from "./spittle";

export const SPRAY = {
  speed: [3.6, 4.6] as const,
  cone: 0.26,
  drag: 2.5,
  gravity: 9.81,
  radius: [0.00225, 0.0045] as const,
  flight: 2,
  step: 0.0005,
  spread: 0.03,
  exclaim: 1,
  maxExclaim: 3,
  strengths: { strong: 4, medium: 3, light: 2 },
  dry: 4,
};

export type Plosive = {
  readonly index: number;
  readonly letter: string;
  readonly count: number;
};

const STRENGTH: Record<string, number> = {
  P: SPRAY.strengths.strong,
  B: SPRAY.strengths.strong,
  T: SPRAY.strengths.medium,
  D: SPRAY.strengths.medium,
  K: SPRAY.strengths.light,
  G: SPRAY.strengths.light,
};

const LETTER = /[A-ZÄÖÜß]/;

const lettersOf = (text: string) => {
  const letters: { readonly c: string; readonly word: number }[] = [];
  let word = 0;
  for (const raw of text) {
    const c = raw === "ß" ? raw : raw.toUpperCase();
    if (LETTER.test(c)) letters.push({ c, word });
    else word++;
  }
  return letters;
};

export const plosivesOf = (text: string): Plosive[] => {
  const letters = lettersOf(text);
  const at = (i: number, word: number) =>
    letters[i]?.word === word ? letters[i].c : undefined;
  const found: Plosive[] = [];
  letters.forEach(({ c, word }, i) => {
    const before = at(i - 1, word);
    const after = at(i + 1, word);
    if (c === before) return;
    if (c === "C" && (after === "H" || after === "K")) return;
    if (c === "Z" && before === "T") return;
    const sound = c === "Z" ? "T" : c === "Q" || c === "C" ? "K" : c;
    const count = STRENGTH[sound];
    if (count) found.push({ index: i, letter: sound, count });
  });
  return found;
};

export type Burst = {
  readonly seed: string;
  readonly at: number;
  readonly count: number;
};

export const burstsOf = (lines: readonly Line[]): Burst[] =>
  lines
    .filter((l) => l.speaker === "karen" && l.tone === "shout")
    .flatMap((l) => {
      const letters = lettersOf(l.text).length;
      const plosives = plosivesOf(l.text);
      const bangs = Math.min(
        SPRAY.maxExclaim,
        (l.text.match(/!/g) ?? []).length,
      );
      return plosives.map((p, i) => ({
        seed: `${l.name}/${i}`,
        at: l.from + ((l.to - l.from) * (p.index + 0.5)) / letters,
        count:
          p.count + (i === plosives.length - 1 ? SPRAY.exclaim * bangs : 0),
      }));
    });

export type Emitter = {
  readonly origin: Vector3;
  readonly forward: Vector3;
  readonly up: Vector3;
  readonly open: number;
};

export type Launch = {
  readonly id: string;
  readonly at: number;
  readonly from: Vector3;
  readonly velocity: Vector3;
  readonly radius: number;
};


export const coneDirection = (
  { forward, up }: Emitter,
  angle: number,
  around: number,
) => {
  const side = forward.clone().cross(up).normalize();
  const lift = side.clone().cross(forward).normalize();
  return forward
    .clone()
    .normalize()
    .multiplyScalar(Math.cos(angle))
    .addScaledVector(side, Math.sin(angle) * Math.cos(around))
    .addScaledVector(lift, Math.sin(angle) * Math.sin(around));
};

export const launchesOf = (
  bursts: readonly Burst[],
  emitterAt: (t: number) => Emitter,
): Launch[] =>
  bursts.flatMap((burst) =>
    Array.from({ length: burst.count }, (_, k) => {
      const id = `${burst.seed}/${k}`;
      const r = (key: string) => random(`${id}/${key}`);
      const at = burst.at + (r("when") - 0.5) * SPRAY.spread;
      const emitter = emitterAt(at);
      const { origin } = emitter;
      const direction = coneDirection(
        emitter,
        SPRAY.cone * Math.sqrt(r("angle")),
        2 * Math.PI * r("around"),
      );
      return {
        id,
        at,
        from: origin.clone(),
        velocity: direction.multiplyScalar(lerp(...SPRAY.speed, r("speed"))),
        radius: lerp(...SPRAY.radius, r("size")),
      };
    }),
  );

const GRAVITY = new Vector3(0, -SPRAY.gravity, 0);

export const flightPoint = (launch: Launch, time: number): Vector3 => {
  const k = SPRAY.drag;
  const fade = (1 - Math.exp(-k * time)) / k;
  const drift = GRAVITY.clone().divideScalar(k);
  return launch.from
    .clone()
    .addScaledVector(drift, time)
    .addScaledVector(launch.velocity.clone().sub(drift), fade);
};

export type Landing = {
  readonly id: string;
  readonly at: number;
  readonly point: Vector3;
  readonly surface: Vector3;
  readonly on: string;
  readonly normal: Vector3;
};

export const landingOf = (
  launch: Launch,
  solidsAt: (t: number) => readonly Solid[],
): Landing | null => {
  for (let time = SPRAY.step; time <= SPRAY.flight; time += SPRAY.step) {
    const point = flightPoint(launch, time);
    const hit = contacts(
      [sphere(launch.id, point, launch.radius)],
      solidsAt(launch.at + time),
    )[0];
    if (hit) {
      const normal = hit.normal.clone().normalize();
      return {
        id: launch.id,
        at: launch.at + time,
        point,
        surface: point
          .clone()
          .addScaledVector(normal, -(launch.radius - hit.depth)),
        on: hit.b,
        normal,
      };
    }
  }
  return null;
};

export const spotAt = (
  landing: Landing,
  surfaceAt: (t: number) => Obb | undefined,
  t: number,
): Vector3 | null => follow(landing, surfaceAt, t)?.point ?? null;

export type SurfaceKind = "stays" | "dries" | "none";

export type Flight = {
  readonly launch: Launch;
  readonly landing: Landing | null;
  readonly kind: SurfaceKind;
  readonly follow: boolean;
};

export const SHUTTER = 1 / 60;
export const SPLAT = 2.2;

export type SprayFrame = {
  readonly drops: readonly {
    readonly id: string;
    readonly head: Vector3;
    readonly tail: Vector3;
    readonly radius: number;
  }[];
  readonly spots: readonly {
    readonly id: string;
    readonly point: Vector3;
    readonly normal: Vector3;
    readonly radius: number;
    readonly opacity: number;
  }[];
  readonly spittle: readonly Spike[];
};

const follow = (
  landing: Landing,
  surfaceAt: (t: number) => Obb | undefined,
  t: number,
) => {
  const then = surfaceAt(landing.at);
  const now = surfaceAt(t);
  if (!then || !now) return null;
  const offset = landing.surface.clone().sub(then.center);
  const local = then.axes.map((axis) => offset.dot(axis));
  const turn = then.axes.map((axis) => landing.normal.dot(axis));
  return {
    point: now.axes.reduce(
      (p, axis, i) => p.addScaledVector(axis, local[i]),
      now.center.clone(),
    ),
    normal: now.axes
      .reduce((n, axis, i) => n.addScaledVector(axis, turn[i]), new Vector3())
      .normalize(),
  };
};

export const sprayFrame = (
  flights: readonly Flight[],
  t: number,
  surfaceAt: (surface: string, t: number) => Obb | undefined,
  spittle: readonly Spike[] = [],
): SprayFrame => ({
  spittle,
  drops: flights
    .filter(
      ({ launch, landing }) =>
        t >= launch.at && t < (landing?.at ?? launch.at + SPRAY.flight),
    )
    .map(({ launch }) => ({
      id: launch.id,
      head: flightPoint(launch, t - launch.at),
      tail: flightPoint(launch, Math.max(0, t - launch.at - SHUTTER)),
      radius: launch.radius,
    })),
  spots: flights.flatMap(({ launch, landing, kind, follow: moves }) => {
    if (!landing || t < landing.at) return [];
    if (kind === "none") return [];
    const opacity = kind === "stays" ? 1 : 1 - (t - landing.at) / SPRAY.dry;
    if (opacity <= 0) return [];
    const placed = moves
      ? follow(landing, (at) => surfaceAt(landing.on, at), t)
      : { point: landing.surface, normal: landing.normal };
    if (!placed) return [];
    return [
      {
        id: launch.id,
        point: placed.point,
        normal: placed.normal,
        radius: launch.radius * SPLAT,
        opacity,
      },
    ];
  }),
});
