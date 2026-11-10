import { bothOf, sceneSpray } from "../../Karen/sceneSpray";
import { LINES, phoneObb } from "./choreography";
import { spokenSpans } from "../../dialogue/voiced";
import { klingelsturmSolids, solveKlingelsturm } from "./solve";

const SPRAY = sceneSpray({
  lines: LINES,
  spanOf: spokenSpans("klingelsturm", LINES),
  karenAt: (t) => solveKlingelsturm(t).karen,
  still: () => [],
  moving: (t) => {
    const s = solveKlingelsturm(t);
    return [
      ...klingelsturmSolids(s),
      ...(s.phone ? [phoneObb(s.karen, s.phone)] : []),
    ];
  },
  people: (t) => {
    const s = solveKlingelsturm(t);
    return bothOf(s.tibik, s.karen);
  },
  cardboard: () => [],
});

export const klingelsturmFlights = SPRAY.flights;
export const klingelsturmSprayTargets = SPRAY.targets;
export const klingelsturmSprayOn = SPRAY.surfaceAt;
export const klingelsturmSprayAt = SPRAY.frameAt;
export const klingelsturmLoudest = SPRAY.loudest;
export const klingelsturmSpittleAt = SPRAY.spittleAt;
