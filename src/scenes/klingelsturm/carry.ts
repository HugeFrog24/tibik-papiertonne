import { interpolate } from "remotion";
import {
  carriedBox,
  type ArmPose,
  type Placement,
} from "../../characters/skeleton";
import { FOUND_KARTON_SIZE, PANEL } from "../../street/kartonShape";
import type { Vec3 } from "../../toon/primitives";
import { RIG } from "../../Tibik/rig";

export const CRADLE: ArmPose = { raise: 1, out: 1, elbow: 1.6, inward: 1.2 };

const [w, h, d] = FOUND_KARTON_SIZE;

export const TUCKED = {
  side: 0.4,
  rotation: [0, 0, 0] as Vec3,
  size: [w + 2 * PANEL, h, d + 2 * PANEL] as Vec3,
};

const ARC = {
  along: [0, 0.25, 0.5, 0.75, 1],
  side: [1, 0.62, 0, -0.62, -1],
  height: [0.66, 0.66, 0.64, 0.66, 0.66],
  forward: [0.25, 0.43, 0.49, 0.43, 0.25],
};

export const tuckedAt = (swap: number): Vec3 => [
  TUCKED.side * interpolate(swap, ARC.along, ARC.side),
  interpolate(swap, ARC.along, ARC.height),
  interpolate(swap, ARC.along, ARC.forward),
];

export const tuckedParcel = (tibik: Placement, swap = 0) =>
  carriedBox(RIG, tibik, tuckedAt(swap), TUCKED.rotation, TUCKED.size);
