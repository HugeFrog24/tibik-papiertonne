import { Matrix4 } from "three";
import { frame, obb, type Obb, type Solid } from "../physics/collision";
import { floorLevel, type Part } from "../street/building";
import { FLUR, TIBIK_DOOR, stairwellSolids } from "./stairwell";

const floor = floorLevel(1);

export const SWUNG = Math.PI / 2;

export const CHEST = {
  name: "chest of drawers",
  center: [FLUR.x0 + 0.225, floor + 0.4, FLUR.z1 - 0.45],
  size: [0.45, 0.8, 0.9],
  drawers: 3,
} as const;

export const COAT_RACK = {
  name: "coat rack",
  center: [FLUR.x1 - 0.13, floor + 1.425, -9.97],
  size: [0.26, 1.15, 0.22],
  panel: 0.02,
  shelf: { height: 0.025, depth: 0.25 },
  hooks: 2,
} as const;

export const CLOCK = {
  name: "wall clock",
  center: [-3.8, floor + 1.95, FLUR.z0 + 0.02],
  size: [0.35, 0.35, 0.04],
} as const;

export const CHIME = {
  name: "door chime",
  center: [FLUR.x1 - 0.025, floor + 2.3, -9.3],
  size: [0.05, 0.16, 0.12],
} as const;

export const INTERCOM = {
  name: "intercom handset",
  center: [FLUR.x1 - 0.03, floor + 1.5, -10.15],
  size: [0.06, 0.22, 0.09],
} as const;

export const LIGHT_SWITCH = {
  name: "light switch",
  center: [
    FLUR.x1 - 0.006,
    floor + 1.05,
    TIBIK_DOOR.hinge[2] + TIBIK_DOOR.width + 0.15,
  ],
  size: [0.012, 0.08, 0.08],
} as const;

export const FLUR_PARTS: readonly Part[] = [
  CHEST,
  COAT_RACK,
  CLOCK,
  CHIME,
  INTERCOM,
  LIGHT_SWITCH,
].map(({ name, center, size }) => ({
  name,
  center: [...center],
  size: [...size],
}));

export const FLUR_SOLIDS: readonly Obb[] = FLUR_PARTS.map((part) =>
  obb(`Flur ${part.name}`, frame(new Matrix4(), part.center), part.size),
);

export const indoorSolids = (
  doors: Parameters<typeof stairwellSolids>[0],
): Solid[] => [...stairwellSolids(doors), ...FLUR_SOLIDS];
