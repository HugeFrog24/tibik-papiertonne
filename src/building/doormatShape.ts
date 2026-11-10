import { floorLevel } from "../street/building";
import type { Vec3 } from "../toon/primitives";
import { CORE, FLAT_DOORS } from "./stairwell";

export const MAT_SIZES = {
  small: [0.4, 0.6] as const,
  large: [0.5, 0.8] as const,
};
export type MatStyle = "coir" | "welcome" | "rubber" | "red";
export type Doormat = {
  readonly storey: number;
  readonly side: "links" | "rechts";
  readonly size: readonly [number, number];
  readonly style: MatStyle;
};

const WALL_GAP = 0.05;
export const MAT_THICKNESS = 0.02;

export const DOORMATS: readonly Doormat[] = [
  { storey: 0, side: "links", size: MAT_SIZES.large, style: "coir" },
  { storey: 0, side: "rechts", size: MAT_SIZES.small, style: "welcome" },
  { storey: 1, side: "links", size: MAT_SIZES.large, style: "coir" },
  { storey: 1, side: "rechts", size: MAT_SIZES.large, style: "coir" },
  { storey: 2, side: "links", size: MAT_SIZES.small, style: "rubber" },
  { storey: 2, side: "rechts", size: MAT_SIZES.large, style: "red" },
  { storey: 3, side: "links", size: MAT_SIZES.small, style: "welcome" },
  { storey: 3, side: "rechts", size: MAT_SIZES.small, style: "coir" },
  { storey: 4, side: "links", size: MAT_SIZES.large, style: "coir" },
  { storey: 5, side: "rechts", size: MAT_SIZES.small, style: "rubber" },
];

export const doorOfMat = (mat: Doormat) =>
  FLAT_DOORS.find((f) => f.storey === mat.storey && f.side === mat.side)!.door;

export const doormatRect = (mat: Doormat) => {
  const door = doorOfMat(mat);
  const [depth, along] = mat.size;
  const inward = mat.side === "links" ? 1 : -1;
  const wall = (mat.side === "links" ? CORE.x0 : CORE.x1) + inward * WALL_GAP;
  const middle = door.hinge[2] + door.width / 2;
  return {
    x0: Math.min(wall, wall + inward * depth),
    x1: Math.max(wall, wall + inward * depth),
    z0: middle - along / 2,
    z1: middle + along / 2,
    y: floorLevel(mat.storey),
  };
};

export const SHOE: Vec3 = [0.05, 0.035, 0.13];
export const SHOES: readonly { readonly position: Vec3 }[] = [
  [CORE.x1 - 0.17, -9.45],
  [CORE.x1 - 0.15, -9.2],
].map(([x, z]) => ({
  position: [x, floorLevel(1) + MAT_THICKNESS + SHOE[1], z] as Vec3,
}));

const MAT_RECTS = DOORMATS.map((mat) => doormatRect(mat));

export const matRise = (x: number, z: number, floor: number) =>
  MAT_RECTS.some(
    (r) =>
      Math.abs(r.y - floor) < 1e-9 &&
      x >= r.x0 &&
      x <= r.x1 &&
      z >= r.z0 &&
      z <= r.z1,
  )
    ? MAT_THICKNESS
    : 0;
