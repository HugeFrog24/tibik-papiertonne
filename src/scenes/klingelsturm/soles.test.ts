import { expect, test } from "vitest";
import { groundWithMats } from "../../building/ground";
import { RIG } from "../../Tibik/rig";
import { KAREN_SKELETON } from "../../Karen/rig";
import { KAREN_SHOE, TIBIK_FOOT, sunkSoles } from "../drawnSoles";
import { KLINGELSTURM_DURATION } from "./choreography";
import { EXIT } from "./exit";
import { solveKlingelsturm } from "./solve";
test(
  "Karen's drawn shoes, outline included, never dip into a doormat or the floor, also where they straddle a mat's edge",
  { timeout: 300_000 },
  () => {
    const problems = sunkSoles(
      KAREN_SHOE,
      (t) => ({ ...solveKlingelsturm(t).karen, skeleton: KAREN_SKELETON }),
      0,
      KLINGELSTURM_DURATION,
      groundWithMats,
    );
    expect(problems.slice(0, 6)).toEqual([]);
  },
);

test(
  "as he leaves, Tibik's drawn soles, outline included, stay on top of the mats, the landing and the treads",
  { timeout: 300_000 },
  () => {
    const problems = sunkSoles(
      TIBIK_FOOT,
      (t) => ({ ...solveKlingelsturm(t).tibik, skeleton: RIG }),
      EXIT.walk,
      KLINGELSTURM_DURATION,
      groundWithMats,
    );
    expect(problems.slice(0, 6)).toEqual([]);
  },
);
