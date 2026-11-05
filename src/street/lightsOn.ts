import { random } from "remotion";
import { OPENINGS } from "./building";

export const LIT_SHARE = 0.22;

export const switchedOn = (seed: string, share: number) => random(seed) < LIT_SHARE * share;

export const neighbourWindowsOn = (house: string, share: number) =>
  OPENINGS.flatMap((opening, k) =>
    opening.kind !== "stairs" && switchedOn(`distant-light/${house}/${k}`, share) ? [k] : [],
  );
