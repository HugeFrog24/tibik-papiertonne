import { later } from "./banging";
import { kf } from "../../characters/animate";
import { LEAVING } from "../treppenhaus/choreography";
import { filmTime } from "./exit";
import { CODA } from "./cigarette";
import { round6 } from "../../characters/scalar";
export const LIGHT = {
  timer: 180,
  out: later(47.6),
};

export const LIGHT_BACK: readonly [number, number] = [
  filmTime(LEAVING.lightsUp[0]),
  filmTime(LEAVING.lightsUp[1]),
];

export const STORY_SKIP = round6(LIGHT_BACK[0] + LIGHT.timer - CODA.outAgain);

export const lightsAt = (t: number) =>
  t < LIGHT.out ? 1 : t < CODA.outAgain ? kf(t, LIGHT_BACK, [0, 1]) : 0;
