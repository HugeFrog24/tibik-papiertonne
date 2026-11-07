import type { PerspectiveCamera } from "three";
import { easeUnit, lerpVec3 } from "../characters/scalar";
import type { Vec3 } from "./primitives";

export const WORLD_UP: Vec3 = [0, 1, 0];

export type CameraSetup = {
  readonly position: Vec3;
  readonly target: Vec3;
  readonly fov: number;
  readonly up?: Vec3;
};
export type Shot = {
  readonly name: string;
  readonly from: number;
  readonly to: number;
  readonly story?: number;
  readonly at: (t: number) => CameraSetup;
  readonly blur?: boolean;
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

export const camerasOf = <S extends Shot>(shots: readonly S[]) => ({
  shotAt: (t: number): S => findShot(shots, t),
  cameraAt: (t: number): CameraSetup => findShot(shots, t).at(t),
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
