import { Vector3 } from "three";
import { TONNE } from "../../street/tonneShape";
import { cameraAt } from "./cameras";
import { lidAt } from "./choreography";
import { flyAt } from "./flyPaths";

export const BUZZ_LOUDNESS = { near: 0.08, full: 0.3, shut: 0.2, flung: 1.5 };

export const flyBuzzSound = (fly: number) => `fly-buzz-${fly}`;

export const buzzVolume = (fly: number, t: number) => {
  const { position } = flyAt(fly, t);
  const distance = new Vector3(...position).distanceTo(
    new Vector3(...cameraAt(t).position),
  );
  const open = Math.min(1, lidAt(t) / BUZZ_LOUDNESS.flung);
  const muffled =
    position[1] < TONNE.height
      ? BUZZ_LOUDNESS.shut + (1 - BUZZ_LOUDNESS.shut) * open
      : 1;
  return (
    BUZZ_LOUDNESS.full * Math.min(1, BUZZ_LOUDNESS.near / distance) * muffled
  );
};
