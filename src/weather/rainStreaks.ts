import { Vector3 } from "three";
import { frameHeightAt } from "../toon/frameHeight";
import type { Vec3 } from "../toon/primitives";

export const STREAK_WIDTH = { real: 0.004, leastOfFrame: 3 / 1080 };
export const STREAK_LENGTH = { leastOfFrame: 9 * STREAK_WIDTH.leastOfFrame };

export const streakWidth = (depth: number, fov: number) => Math.max(STREAK_WIDTH.real, STREAK_WIDTH.leastOfFrame * frameHeightAt(depth, fov));

const UP = new Vector3(0, 1, 0);

export const ribbon = (tail: Vec3, head: Vec3, eye: Vec3, fov: number): [Vec3, Vec3, Vec3, Vec3] => {
  const from = new Vector3(...tail);
  const to = new Vector3(...head);
  const view = from.clone().add(to).multiplyScalar(0.5).sub(new Vector3(...eye));
  const along = to.clone().sub(from);
  const side = (along.lengthSq() > 0 ? along : UP).clone().cross(view).normalize();
  const half = side.multiplyScalar(streakWidth(view.length(), fov) / 2);
  const corner = (p: Vector3, sign: number): Vec3 => [p.x + sign * half.x, p.y + sign * half.y, p.z + sign * half.z];
  return [corner(from, -1), corner(from, 1), corner(to, 1), corner(to, -1)];
};
