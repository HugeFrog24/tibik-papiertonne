import { kerbFace } from "./drainShape";
import { footprint, type Footprint } from "./footprint";

const MIDDLE = (kerbFace(false) + kerbFace(true)) / 2;

export const STREET_END = 118;
export const ROAD_PLANE = { z: 11, depth: 18, length: 2 * STREET_END };
export const ASPHALT = { tile: 4, base: "#4b4e53" };
export const JOINT = { z: MIDDLE + 0.75, width: 0.06 };
export const jointFootprint: Footprint = footprint(
  0,
  JOINT.z,
  ROAD_PLANE.length,
  JOINT.width,
);

const trench = (x: number, width: number, end: number): Footprint => ({
  x: [x - width / 2, x + width / 2],
  z: [kerbFace(false) + 0.01, end],
});

export const PATCHES: readonly Footprint[] = [
  trench(-0.7, 0.6, MIDDLE - 0.25),
  footprint(12, 8.0, 1.2, 0.9),
  footprint(20, 4.8, 1.6, 1.0),
];
