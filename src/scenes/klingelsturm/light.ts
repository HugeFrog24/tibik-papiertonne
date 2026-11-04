import { kf } from "../../characters/animate";
import { LEAVING } from "../treppenhaus/choreography";
import { filmTime } from "./exit";
export const LIGHT = {
  timer: 180,
  out: 47.6,
};

export const LIGHT_BACK: readonly [number, number] = [
  filmTime(LEAVING.lightsUp[0]),
  filmTime(LEAVING.lightsUp[1]),
];

export const lightsAt = (t: number) =>
  t < LIGHT.out ? 1 : kf(t, LIGHT_BACK, [0, 1]);
