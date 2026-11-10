import { Vector3 } from "three";
import { frameHeightAt } from "../toon/frameHeight";
import type { Vec3 } from "../toon/primitives";
import { FORMATS, type Format } from "../frameRate";

export const STREAK_WIDTH = { real: 0.004, leastPixels: 3, faintest: 1 / 3, falloff: 0.4 };
export const STREAK_LENGTH = { leastPixels: 9 * STREAK_WIDTH.leastPixels };

export const leastStreakWidth = (format: Format = "wide") => STREAK_WIDTH.leastPixels / FORMATS[format].height;
export const leastStreakLength = (format: Format = "wide") => STREAK_LENGTH.leastPixels / FORMATS[format].height;

export const streakWidth = (depth: number, fov: number, format: Format = "wide") =>
  Math.max(STREAK_WIDTH.real, leastStreakWidth(format) * frameHeightAt(depth, fov));

export const streakOpacity = (depth: number, fov: number, format: Format = "wide") =>
  Math.max(STREAK_WIDTH.faintest, (STREAK_WIDTH.real / streakWidth(depth, fov, format)) ** STREAK_WIDTH.falloff);

const UP = new Vector3(0, 1, 0);

export const ribbon = (tail: Vec3, head: Vec3, eye: Vec3, fov: number, format: Format = "wide"): [Vec3, Vec3, Vec3, Vec3] => {
  const from = new Vector3(...tail);
  const to = new Vector3(...head);
  const view = from.clone().add(to).multiplyScalar(0.5).sub(new Vector3(...eye));
  const along = to.clone().sub(from);
  const side = (along.lengthSq() > 0 ? along : UP).clone().cross(view).normalize();
  const half = side.multiplyScalar(streakWidth(view.length(), fov, format) / 2);
  const corner = (p: Vector3, sign: number): Vec3 => [p.x + sign * half.x, p.y + sign * half.y, p.z + sign * half.z];
  return [corner(from, -1), corner(from, 1), corner(to, 1), corner(to, -1)];
};
