import { floorLevel } from "../street/building";
import { matRise } from "./doormatShape";
import { stairwellGround } from "./stairwell";

export const groundWithMats = (x: number, z: number) => {
  const floor = stairwellGround(x, z);
  return floor + matRise(x, z, floor);
};

export const firstFloorGround = (x: number, z: number) =>
  floorLevel(1) + matRise(x, z, floorLevel(1));
