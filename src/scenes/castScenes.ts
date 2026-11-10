import type { Character } from "../physics/guards";
import { asKaren } from "../Karen/character";
import { asCharacter } from "../Tibik/character";
import { storyJumpsIn } from "../toon/shots";
import { HAUSMUELL_DURATION } from "./hausmuell/choreography";
import { solveHausmuell } from "./hausmuell/solve";
import { SHOTS as KLINGELSTURM_SHOTS } from "./klingelsturm/cameras";
import { KLINGELSTURM_DURATION } from "./klingelsturm/choreography";
import { solveKlingelsturm } from "./klingelsturm/solve";
import { solveNachtruhe } from "./nachtruhe/solve";
import { NACHTRUHE_DURATION, STORY_JUMPS } from "./nachtruhe/timeline";
import { PAPIERTONNEN_DURATION } from "./papiertonnen/choreography";
import { solvePapiertonnen } from "./papiertonnen/solve";
import { RUNDSCHREIBEN_DURATION } from "./rundschreiben/choreography";
import { solveRundschreiben } from "./rundschreiben/solve";
import { tibikIn } from "./sceneChecks";
import { STORY_END } from "./treppenhaus/choreography";
import { solveTreppenhaus } from "./treppenhaus/solve";

export type CastScene = {
  readonly name: string;
  readonly duration: number;
  readonly characters: (t: number) => Record<string, Character>;
  readonly cuts?: readonly number[];
};

export const klingelsturmCast = (t: number): Record<string, Character> => {
  const s = solveKlingelsturm(t);
  return { Karen: asKaren(s.karen), ...(s.tibikHere ? { Tibik: asCharacter(s.tibik) } : {}) };
};

export const CAST_SCENES: readonly CastScene[] = [
  { name: "Treppenhaus", duration: STORY_END, characters: tibikIn(solveTreppenhaus) },
  { name: "Papiertonnen", duration: PAPIERTONNEN_DURATION, characters: tibikIn(solvePapiertonnen) },
  {
    name: "Hausmuell",
    duration: HAUSMUELL_DURATION,
    characters: (t) => {
      const s = solveHausmuell(t);
      return { Tibik: asCharacter(s.tibik), Karen: asKaren(s.karen) };
    },
  },
  {
    name: "Klingelsturm",
    duration: KLINGELSTURM_DURATION,
    characters: klingelsturmCast,
    cuts: storyJumpsIn(KLINGELSTURM_SHOTS),
  },
  { name: "Nachtruhe", duration: NACHTRUHE_DURATION, characters: tibikIn(solveNachtruhe), cuts: STORY_JUMPS },
  { name: "Rundschreiben", duration: RUNDSCHREIBEN_DURATION, characters: tibikIn(solveRundschreiben) },
];
