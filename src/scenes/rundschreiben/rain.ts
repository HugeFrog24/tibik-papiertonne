import { allColliders } from "../../characters/skeleton";
import { letterSolids } from "../../props/letterShape";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { rainAt } from "../../weather/rainDrops";
import { cameraAt } from "./cameras";
import { rundschreibenSolids, type RundschreibenState } from "./solve";

export const rundschreibenRain = (t: number, state: RundschreibenState) =>
  rainAt(
    t,
    cameraAt(t).position,
    [...rundschreibenSolids(state), ...(state.letter ? letterSolids(state.letter) : [])],
    allColliders(RIG, asCharacter(state.tibik)),
    { fov: cameraAt(t).fov },
  );
