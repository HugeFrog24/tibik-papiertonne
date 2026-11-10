import type { Vec3 } from "../toon/primitives";
import { CAR, PARKED_CARS } from "./carShape";

const [, , SHOWN] = PARKED_CARS;
const at = (dx: number, y: number, z: number): Vec3 => [SHOWN.x + dx, y, z];

export const CAR_VIEWS = [
  { position: at(-4.6, 1.3, 0.6), target: at(-0.6, 0.7, CAR.z), fov: 40 },
  { position: at(4.4, 1.3, 0.9), target: at(0.6, 0.7, CAR.z), fov: 40 },
  { position: at(0.2, 1.1, 0.2), target: at(0.2, 0.75, CAR.z), fov: 55 },
  { position: at(1.3, 0.43, 1.2), target: at(1.3, 0.33, CAR.z), fov: 45 },
  { position: at(3.2, 1.7, 0.9), target: at(5.6, -0.1, 2.6), fov: 40 },
  { position: at(-11.4, 1.7, 1.0), target: at(-14.4, -0.1, 6.15), fov: 40 },
  { position: at(17.6, 1.7, 1.0), target: at(19.9, -0.1, 4.0), fov: 45 },
];
