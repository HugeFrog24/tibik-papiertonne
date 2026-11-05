import { expect, test } from "vitest";
import { FPS } from "../../frameRate";
import { characterViolations } from "../../physics/guards";
import { DOORSTEP, FACADE_Z } from "../../street/building";
import { entranceGround } from "../../street/layout";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { TIBIK_FOOT, sunkSoles } from "../drawnSoles";
import { DOOR_STAND } from "../enterHouse";
import { expectGoesIn, expectKeyTurnsByHand, keysAwayFromFist } from "../entryChecks";
import { penetrations, seconds } from "../sceneChecks";
import { streetSolids } from "../streetSolids";
import { duskRootAt } from "./choreography";
import { solveNachtruhe } from "./solve";
import { DRONE, DUSK, ENTRY } from "./timeline";

const dusk = Array.from({ length: Math.round(DUSK[1] * FPS) }, (_, f) => f / FPS);

test("the dusk continues Klingelsturm's world: he is on the pavement with nothing in his hands but his keys, the Haustür shut", () => {
  const first = solveNachtruhe(0);
  expect(first.haustuer).toBe(0);
  expect(first.tibik.position[2]).toBeGreaterThan(FACADE_Z + DOORSTEP.depth + 0.3);
  for (const t of dusk) expect(solveNachtruhe(t).tibik.holdingBox, t.toFixed(2)).toBe(false);
  expect(keysAwayFromFist(solveNachtruhe, dusk, () => "house").slice(0, 8)).toEqual([]);
});

test("he walks home from the west, already in step on the first frame", () => {
  const [a, b] = [duskRootAt(0), duskRootAt(1 / FPS)];
  expect(Math.hypot(b.x - a.x, b.z - a.z) * FPS).toBeGreaterThan(0.6);
  expect(b.x).toBeGreaterThan(a.x);
  expect(a.x).toBeLessThan(DOOR_STAND.x - 3);
});

test("at dusk Tibik passes through nothing, outlines included", { timeout: 300_000 }, () => {
  const violations = penetrations(
    dusk,
    (t) => {
      const state = solveNachtruhe(t);
      return characterViolations(asCharacter(state.tibik), streetSolids(state));
    },
    seconds,
  );
  expect(violations.slice(0, 8)).toEqual([]);
});

test("at dusk his drawn soles never dip below the pavement, the step or the mat", { timeout: 300_000 }, () => {
  expect(sunkSoles(TIBIK_FOOT, (t) => ({ ...solveNachtruhe(t).tibik, skeleton: RIG }), 0, DUSK[1], entranceGround).slice(0, 6)).toEqual([]);
});

test("he unlocks the Haustür from outside with his house key and goes in; the closer has shut it before the drone rises", { timeout: 300_000 }, () => {
  expectGoesIn(ENTRY, solveNachtruhe, dusk);
  expectKeyTurnsByHand(ENTRY, solveNachtruhe, dusk);
  expect(ENTRY.doorShut).toBeLessThan(DRONE[0]);
  expect(solveNachtruhe(DRONE[0]).haustuer).toBe(0);
});
