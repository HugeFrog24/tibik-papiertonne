import type { PerspectiveCamera } from "three";
import { easeUnit, lerpVec3 } from "../characters/scalar";
import type { Vec3 } from "./primitives";
import { atFrame, type Format } from "../frameRate";
import type { SceneClock } from "../sceneClock";

export const WORLD_UP: Vec3 = [0, 1, 0];

export type CameraSetup = {
  readonly position: Vec3;
  readonly target: Vec3;
  readonly fov: number;
  readonly up?: Vec3 | undefined;
};
export type Shot = {
  readonly name: string;
  readonly from: number;
  readonly to: number;
  readonly story?: number;
  readonly at: (t: number) => CameraSetup;
  readonly tall?: (t: number) => CameraSetup;
  readonly blur?: boolean;
};

export const sinceTheCut = (shot: Shot, sinceCut: number, storyOf: (filmT: number) => number = (t) => t) => shot.at(storyOf(shot.from) + sinceCut);

export const heldShots = <S extends { readonly from: number; readonly to: number }>(shots: readonly S[], clock: SceneClock): S[] =>
  shots.map((shot) => ({ ...shot, from: clock.editAt(shot.from), to: clock.editAt(shot.to) }));

export const sinceTheHeldCut = (shot: Shot, sinceCut: number, clock: SceneClock) => shot.at(clock.storyAt(clock.editAt(shot.from) + sinceCut));

export const onFrames = <S extends { readonly from: number; readonly to: number }>(shots: readonly S[]): readonly S[] =>
  shots.map((shot) => ({ ...shot, from: atFrame(shot.from), to: atFrame(shot.to) }));

export type Framed = { readonly at?: (t: number) => CameraSetup; readonly tall?: (t: number) => CameraSetup };

export const inFormat = <S extends Framed>(shot: S, format: Format): S =>
  format === "tall" && shot.tall ? { ...shot, at: shot.tall } : shot;

export const reframe =
  (at: (t: number) => CameraSetup, change: { readonly aimAt?: (t: number) => Vec3; readonly shift?: Vec3; readonly fov?: number }) =>
  (t: number): CameraSetup => {
    const setup = at(t);
    const [x, y, z] = change.aimAt?.(t) ?? setup.target;
    const [dx, dy, dz] = change.shift ?? [0, 0, 0];
    return { ...setup, target: [x + dx, y + dy, z + dz], fov: change.fov ?? setup.fov };
  };

export const withTall = (at: (t: number) => CameraSetup, change: Parameters<typeof reframe>[1]) => ({ at, tall: reframe(at, change) });

export const heldBetween =
  <T>(at: (t: number) => T, from = -Infinity, until = Infinity) =>
  (t: number): T =>
    at(Math.min(Math.max(t, from), until));

export const weighedAmidst =
  (eye: Vec3, ...points: readonly (readonly [(t: number) => Vec3, (t: number) => number])[]) =>
  (t: number): Vec3 => {
    const raw = points.map(([, weight]) => Math.max(0, weight(t)));
    const weights = raw.some((w) => w > 0) ? raw : raw.map(() => 1);
    const offsets = points.map(([p]) => p(t).map((v, i) => v - eye[i]));
    const distances = offsets.map((d) => Math.hypot(...d));
    const toward = offsets.map((d, k) => d.map((v) => (v / distances[k]) * weights[k]));
    const sum = [0, 1, 2].map((i) => toward.reduce((total, d) => total + d[i], 0));
    const length = Math.hypot(...sum);
    const total = weights.reduce((a, b) => a + b, 0);
    const distance = distances.reduce((acc, d, k) => acc + d * weights[k], 0) / total;
    return [0, 1, 2].map((i) => eye[i] + (sum[i] / length) * distance) as Vec3;
  };

export const amidst = (eye: Vec3, ...points: readonly ((t: number) => Vec3)[]) =>
  weighedAmidst(eye, ...points.map((p) => [p, () => 1] as const));

export const levelWith =
  (at: (t: number) => CameraSetup, point: (t: number) => Vec3) =>
  (t: number): Vec3 => {
    const [x, , z] = point(t);
    return [x, at(t).target[1], z];
  };

export const FOLLOW = { window: 1.6, samples: 17 };

export const smoothed =
  (point: (t: number) => Vec3, window: number = FOLLOW.window, samples: number = FOLLOW.samples) =>
  (t: number): Vec3 => {
    const all = Array.from({ length: samples }, (_, i) => point(t + (i / (samples - 1) - 0.5) * window));
    return [0, 1, 2].map((k) => all.reduce((sum, p) => sum + p[k], 0) / samples) as Vec3;
  };

export const following = (
  at: (t: number) => CameraSetup,
  point: (t: number) => Vec3,
  { during, window, ...change }: Omit<Parameters<typeof reframe>[1], "aimAt"> & { readonly during?: readonly [number, number]; readonly window?: number } = {},
) => withTall(at, { aimAt: levelWith(at, smoothed(during ? heldBetween(point, ...during) : point, window)), ...change });

export const between =
  (...points: readonly ((t: number) => Vec3)[]) =>
  (t: number): Vec3 => {
    const all = points.map((p) => p(t));
    return [0, 1, 2].map((i) => all.reduce((sum, p) => sum + p[i], 0) / all.length) as Vec3;
  };

export const fixed =
  (position: Vec3, target: Vec3, fov: number) => (): CameraSetup => ({
    position,
    target,
    fov,
  });

export const dolly =
  (from: CameraSetup, to: CameraSetup, start: number, end: number) =>
  (t: number): CameraSetup => {
    const k = easeUnit((t - start) / (end - start));
    return {
      position: lerpVec3(from.position, to.position, k),
      target: lerpVec3(from.target, to.target, k),
      fov: from.fov + (to.fov - from.fov) * k,
    };
  };

export const findShot = <
  S extends { readonly from: number; readonly to: number },
>(
  shots: readonly S[],
  t: number,
): S => shots.find((s) => t >= s.from && t < s.to) ?? shots[shots.length - 1];

export const storyTimeIn = (shots: readonly Shot[]) => (filmT: number) => {
  const shot = findShot(shots, filmT);
  return (shot.story ?? shot.from) + (filmT - shot.from);
};

export const filmShownIn = (shots: readonly Shot[]) => (storyT: number): number => {
  const shot = shots.find((s) => storyT < (s.story ?? s.from) + (s.to - s.from)) ?? shots[shots.length - 1];
  const story = shot.story ?? shot.from;
  return storyT < story ? shot.from : shot.from + (storyT - story);
};

const SAME_MOMENT = 1e-6;

export const storyJumpsIn = (shots: readonly Shot[]) =>
  shots
    .slice(1)
    .filter((shot, i) => Math.abs((shots[i].story ?? shots[i].from) + (shots[i].to - shots[i].from) - (shot.story ?? shot.from)) > SAME_MOMENT)
    .map((shot) => shot.from);

export const heardUntilIn = (shots: readonly Shot[], end: number) => {
  const jumps = storyJumpsIn(shots);
  return (t: number) => Math.min(end, ...jumps.filter((cut) => cut > t));
};

export const filmTimeIn = (shots: readonly Shot[]) => (storyT: number): number | null => {
  const shot = shots.find((s) => {
    const story = s.story ?? s.from;
    return storyT >= story && storyT < story + (s.to - s.from);
  });
  return shot ? shot.from + (storyT - (shot.story ?? shot.from)) : null;
};

export const camerasOf = <S extends Shot>(shots: readonly S[], storyOf: (filmT: number) => number = (t) => t) => ({
  shotAt: (t: number): S => findShot(shots, t),
  cameraAt: (t: number, format: Format = "wide"): CameraSetup => {
    const shot = findShot(shots, t);
    return sinceTheCut(inFormat(shot, format), t - shot.from, storyOf);
  },
});

export const aimLens = (
  lens: PerspectiveCamera,
  setup: CameraSetup,
  frame: { readonly aspect?: number; readonly near?: number; readonly far?: number } = {},
) => {
  lens.fov = setup.fov;
  if (frame.aspect !== undefined) lens.aspect = frame.aspect;
  if (frame.near !== undefined) lens.near = frame.near;
  if (frame.far !== undefined) lens.far = frame.far;
  lens.position.set(...setup.position);
  lens.up.set(...(setup.up ?? WORLD_UP));
  lens.lookAt(...setup.target);
  lens.updateProjectionMatrix();
  lens.updateMatrixWorld();
  return lens;
};
