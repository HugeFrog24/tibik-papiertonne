import { bothOf, sceneSpray } from "../../Karen/sceneSpray";
import { lazy } from "../../physics/lazy";
import { kartonFlapsOf, sceneSolids } from "../papiertonnen/solve";
import { LINES } from "./choreography";
import { spokenSpans } from "../../dialogue/voiced";
import { solveHausmuell, solveHausmuellIn, tibikBox } from "./solve";
import { byLanguage, type Language } from "../../language";

const STREET = lazy(() => sceneSolids(solveHausmuell(0).lids, true));

const SPRAYS = byLanguage((language) => {
  const solve = solveHausmuellIn(language);
  return sceneSpray({
    lines: LINES,
    spanOf: spokenSpans("hausmuell", LINES, language),
    karenAt: (t) => solve(t).karen,
    still: STREET,
    moving: () => [],
    people: (t) => {
      const s = solve(t);
      return bothOf(s.tibik, s.karen);
    },
    cardboard: (t) => {
      const s = solve(t);
      return [tibikBox(s.tibik, s.karton), ...kartonFlapsOf(s.tibik, s.karton)];
    },
  });
});

export const hausmuellSprayIn = (language: Language) => SPRAYS[language];

const SPRAY = SPRAYS.de;

export const hausmuellFlights = SPRAY.flights;
export const sprayTargets = SPRAY.targets;
export const sprayOn = SPRAY.surfaceAt;
export const hausmuellSprayAt = SPRAY.frameAt;
export const hausmuellLoudest = SPRAY.loudest;
export const hausmuellSpittleAt = SPRAY.spittleAt;
