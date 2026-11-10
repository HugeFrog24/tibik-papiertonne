import { bothOf, sceneSpray } from "../../Karen/sceneSpray";
import { lazy } from "../../physics/lazy";
import { kartonFlapsOf, sceneSolids } from "../papiertonnen/solve";
import { LINES } from "./choreography";
import { spokenSpans } from "../../dialogue/voiced";
import { solveHausmuell, tibikBox } from "./solve";

const STREET = lazy(() => sceneSolids(solveHausmuell(0).lids, true));

const SPRAY = sceneSpray({
  lines: LINES,
  spanOf: spokenSpans("hausmuell", LINES),
  karenAt: (t) => solveHausmuell(t).karen,
  still: STREET,
  moving: () => [],
  people: (t) => {
    const s = solveHausmuell(t);
    return bothOf(s.tibik, s.karen);
  },
  cardboard: (t) => {
    const s = solveHausmuell(t);
    return [tibikBox(s.tibik, s.karton), ...kartonFlapsOf(s.tibik, s.karton)];
  },
});

export const hausmuellFlights = SPRAY.flights;
export const sprayTargets = SPRAY.targets;
export const sprayOn = SPRAY.surfaceAt;
export const hausmuellSprayAt = SPRAY.frameAt;
export const hausmuellLoudest = SPRAY.loudest;
export const hausmuellSpittleAt = SPRAY.spittleAt;
