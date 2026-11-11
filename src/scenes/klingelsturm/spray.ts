import { bothOf, sceneSpray } from "../../Karen/sceneSpray";
import { LINES, phoneObb } from "./choreography";
import { spokenSpans } from "../../dialogue/voiced";
import { klingelsturmSolids, solveKlingelsturmIn } from "./solve";
import type { Language } from "../../language";
import { KLINGELSTURM_CLOCKS } from "./hold";

const sprayIn = (language: Language) => {
  const solve = solveKlingelsturmIn(language);
  return sceneSpray({
    lines: LINES,
    spanOf: spokenSpans("klingelsturm", LINES, language, KLINGELSTURM_CLOCKS[language]),
    karenAt: (t) => solve(t).karen,
    still: () => [],
    moving: (t) => {
      const s = solve(t);
      return [
        ...klingelsturmSolids(s),
        ...(s.phone ? [phoneObb(s.karen, s.phone)] : []),
      ];
    },
    people: (t) => {
      const s = solve(t);
      return bothOf(s.tibik, s.karen);
    },
    cardboard: () => [],
  });
};

const SPRAYS: Readonly<Record<Language, ReturnType<typeof sprayIn>>> = { de: sprayIn("de"), en: sprayIn("en") };

export const klingelsturmSprayIn = (language: Language) => SPRAYS[language];

const SPRAY = SPRAYS.de;

export const klingelsturmFlights = SPRAY.flights;
export const klingelsturmSprayTargets = SPRAY.targets;
export const klingelsturmSprayOn = SPRAY.surfaceAt;
export const klingelsturmSprayAt = SPRAY.frameAt;
export const klingelsturmLoudest = SPRAY.loudest;
export const klingelsturmSpittleAt = SPRAY.spittleAt;
