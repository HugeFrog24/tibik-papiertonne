import { allColliders } from "../../characters/skeleton";
import { letterSolids } from "../../props/letterShape";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { rainSeenBy } from "../../weather/rainDrops";
import { cameraAt } from "./cameras";
import type { Format } from "../../frameRate";
import { rundschreibenSolids, type RundschreibenState } from "./solve";

export const rundschreibenRain = (t: number, state: RundschreibenState, format: Format = "wide") =>
  rainSeenBy(
    t,
    cameraAt(t, format),
    [...rundschreibenSolids(state), ...(state.letter ? letterSolids(state.letter) : [])],
    allColliders(RIG, asCharacter(state.tibik)),
    1,
    format,
  );
