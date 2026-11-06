import { Matrix4, Vector3 } from "three";
import { collide, nearby, obb, type Obb, type Solid, type Sphere } from "../physics/collision";

export const SMOKE = {
  wispEvery: 0.15,
  exhaleEvery: 0.05,
  life: { wisp: 3, exhale: 3.5 },
  wispRise: 0.15,
  exhaleSpeed: 1.2,
  drag: 0.4,
  buoyancy: 0.1,
  radius: { born: 0.006, wisp: 0.05, exhale: 0.09 },
  grow: 1.2,
  peak: 0.6,
  fadeIn: 0.15,
  sway: { amplitude: 0.03, period: 1.7 },
  flatten: { y: 0.4, xz: 1.6 },
  spread: 0.3,
  step: 1 / 60,
  reach: 1.5,
  colour: "#d9d9d4",
  ink: 0.004,
};

export type SmokeSource = {
  readonly name: string;
  readonly kind: "wisp" | "exhale";
  readonly windows: readonly (readonly [number, number])[];
  readonly origin: (t: number) => Vector3;
  readonly direction?: (t: number) => Vector3;
};

export type Curl = {
  readonly born: number;
  readonly center: Vector3;
  readonly radius: number;
  readonly flat: number;
  readonly opacity: number;
};

export type SmokeScene = {
  readonly storyAt: (t: number) => number;
  readonly filmAt?: (storyT: number) => number;
  readonly sources: readonly SmokeSource[];
  readonly solids: readonly Solid[];
  readonly bodies?: (t: number) => readonly Sphere[];
};

const UP = new Vector3(0, 1, 0);
const GOLDEN = 2.399963;

export const curlSize = ({ radius, flat }: Pick<Curl, "radius" | "flat">, grow = 0) => {
  const xz = radius * (1 + (SMOKE.flatten.xz - 1) * flat) + grow;
  const y = radius * (1 - (1 - SMOKE.flatten.y) * flat) + grow;
  return new Vector3(xz, y, xz);
};

export const curlExtent = (curl: Pick<Curl, "center" | "radius" | "flat">): Obb =>
  obb("smoke curl", new Matrix4().setPosition(curl.center), curlSize(curl).multiplyScalar(2).toArray());

const lifeOf = (source: SmokeSource) => SMOKE.life[source.kind];

const radiusAt = (source: SmokeSource, age: number) => {
  const full = SMOKE.radius[source.kind];
  return SMOKE.radius.born + (full - SMOKE.radius.born) * (1 - Math.exp(-age / SMOKE.grow));
};

const opacityAt = (source: SmokeSource, age: number) =>
  SMOKE.peak * Math.min(1, age / SMOKE.fadeIn) * Math.max(0, 1 - age / lifeOf(source)) ** 1.5;

const sideOf = (direction: Vector3) => {
  const side = new Vector3().crossVectors(direction, UP);
  return side.lengthSq() < 1e-9 ? new Vector3(1, 0, 0) : side.normalize();
};

const freePath = (source: SmokeSource, direction: Vector3, phase: number, age: number) => {
  const jet = source.kind === "exhale" ? SMOKE.exhaleSpeed : 0;
  const rise = source.kind === "wisp" ? SMOKE.wispRise : SMOKE.buoyancy;
  const sway = SMOKE.sway.amplitude * Math.sin((2 * Math.PI * age) / SMOKE.sway.period + phase);
  return direction
    .clone()
    .multiplyScalar(jet * SMOKE.drag * (1 - Math.exp(-age / SMOKE.drag)))
    .addScaledVector(UP, rise * age)
    .addScaledVector(sideOf(direction), sway - SMOKE.sway.amplitude * Math.sin(phase));
};

const resolve = (curl: { center: Vector3; radius: number; flat: number }, solids: readonly Solid[], dt: number) => {
  let box = curlExtent(curl);
  for (const solid of solids) {
    const hit = collide(box, solid);
    if (!hit) continue;
    curl.center.addScaledVector(hit.normal, hit.depth);
    if (hit.normal.y < -0.5) curl.flat = Math.min(1, curl.flat + dt / SMOKE.spread);
    box = curlExtent(curl);
  }
};

const SETTLING = 4;

export const clearOf = (curl: Curl, solids: readonly Solid[]): Curl => {
  const moved = { center: curl.center.clone(), radius: curl.radius, flat: curl.flat };
  for (let i = 0; i < SETTLING; i++) resolve(moved, solids, 0);
  return { ...curl, center: moved.center };
};

type State = { readonly center: Vector3; readonly radius: number; readonly flat: number };

type Track = {
  readonly states: State[];
  readonly direction: Vector3;
  readonly phase: number;
  readonly near: readonly Solid[];
  readonly born: number;
};

const STEPS_PER_SECOND = Math.round(1 / SMOKE.step);
const tracksOf = new WeakMap<SmokeScene, Map<string, Track>>();
const bodiesOf = new WeakMap<SmokeScene, Map<number, readonly Sphere[]>>();

const cached = <K extends object, V>(store: WeakMap<K, V>, key: K, build: () => V) => {
  const found = store.get(key);
  if (found) return found;
  const made = build();
  store.set(key, made);
  return made;
};

const filmOf = (scene: SmokeScene, storyT: number) => scene.filmAt?.(storyT) ?? storyT;

const bodiesAt = (scene: SmokeScene, storyT: number) => {
  if (!scene.bodies) return [];
  const known = cached(bodiesOf, scene, () => new Map<number, readonly Sphere[]>());
  const frame = Math.round(filmOf(scene, storyT) * STEPS_PER_SECOND);
  const found = known.get(frame);
  if (found) return found;
  const bodies = scene.bodies(frame / STEPS_PER_SECOND);
  known.set(frame, bodies);
  return bodies;
};

const trackOf = (scene: SmokeScene, source: SmokeSource, which: number, born: number, index: number): Track => {
  const tracks = cached(tracksOf, scene, () => new Map<string, Track>());
  const key = `${which}:${index}`;
  const found = tracks.get(key);
  if (found) return found;
  const at = filmOf(scene, born);
  const start = source.origin(at);
  const track: Track = {
    states: [{ center: start, radius: radiusAt(source, 0), flat: 0 }],
    direction: (source.direction?.(at) ?? UP).clone().normalize(),
    phase: index * GOLDEN,
    near: nearby(scene.solids, start, SMOKE.reach),
    born,
  };
  tracks.set(key, track);
  return track;
};

const stateAt = (scene: SmokeScene, source: SmokeSource, track: Track, steps: number): State => {
  for (let i = track.states.length; i <= steps; i++) {
    const last = track.states[i - 1];
    const now = i * SMOKE.step;
    const moved = freePath(source, track.direction, track.phase, now).sub(freePath(source, track.direction, track.phase, now - SMOKE.step));
    const curl = { center: last.center.clone().add(moved), radius: radiusAt(source, now), flat: last.flat };
    resolve(curl, track.near, SMOKE.step);
    resolve(curl, bodiesAt(scene, track.born + now), SMOKE.step);
    track.states.push(curl);
  }
  return track.states[steps];
};

const birthsOf = (source: SmokeSource, now: number, scene: SmokeScene) => {
  const every = source.kind === "exhale" ? SMOKE.exhaleEvery : SMOKE.wispEvery;
  let first = 0;
  return source.windows.flatMap(([from, to]) => {
    const start = scene.storyAt(from);
    const end = scene.storyAt(to);
    const count = Math.max(0, Math.ceil((Math.min(now, end) - start) / every - 1e-9));
    const births = Array.from({ length: count }, (_, k) => ({ born: start + k * every, index: first + k }));
    first += Math.max(0, Math.ceil((end - start) / every - 1e-9));
    return births;
  });
};

export const curlsAt = (t: number, scene: SmokeScene): Curl[] => {
  const now = scene.storyAt(t);
  return scene.sources.flatMap((source, which) =>
    birthsOf(source, now + 1e-9, scene).flatMap(({ born, index }) => {
      const age = now - born;
      if (age < 0 || age >= lifeOf(source)) return [];
      const state = stateAt(scene, source, trackOf(scene, source, which, born, index), Math.round(age * STEPS_PER_SECOND));
      return [{ born, center: state.center.clone(), radius: state.radius, flat: state.flat, opacity: opacityAt(source, age) }];
    }),
  );
};
