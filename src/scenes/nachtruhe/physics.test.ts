import { Vector3 } from "three";
import { expect, test } from "vitest";
import { BED_RECT, BEDROOM, bedroomSolids } from "../../building/bedroomShape";
import { bodyColliders } from "../../characters/skeleton";
import { SITTING } from "../../Tibik/bedPoses";
import { FPS } from "../../frameRate";
import { characterViolations } from "../../physics/guards";
import { DOORSTEP, FACADE_Z } from "../../street/building";
import { entranceGround } from "../../street/layout";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { TIBIK_FOOT, sunkSoles } from "../drawnSoles";
import { DOOR_STAND } from "../enterHouse";
import { expectGoesIn, expectKeyTurnsByHand, keysAwayFromFist } from "../entryChecks";
import { lensProblems, penetrations, seconds } from "../sceneChecks";
import { streetSolids } from "../streetSolids";
import { cameraAt } from "./cameras";
import { BED_SEAT, duskRootAt } from "./choreography";
import { solveNachtruhe, type NachtruheState } from "./solve";
import { DRONE, DUSK, ENTRY, HOP_UP, LIE_DOWN, NACHTRUHE_DURATION } from "./timeline";

const dusk = Array.from({ length: Math.round(DUSK[1] * FPS) }, (_, f) => f / FPS);
const frames = Array.from({ length: Math.round(NACHTRUHE_DURATION * FPS) }, (_, f) => f / FPS);
const between = (from: number, to: number) => frames.filter((t) => t >= from && t < to);
const bedroomOf = (state: NachtruheState) => bedroomSolids({ door: state.bedroomDoor, curtain: state.curtains });
const UP_TO_LYING = between(DUSK[1], LIE_DOWN[0]);

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

test("in the evening Tibik passes through nothing in the bedroom, outlines included, until he lies down", { timeout: 300_000 }, () => {
  const violations = penetrations(
    UP_TO_LYING,
    (t) => {
      const state = solveNachtruhe(t);
      return characterViolations(asCharacter(state.tibik), bedroomOf(state));
    },
    seconds,
  );
  expect(violations.slice(0, 8)).toEqual([]);
});

test("in the evening his drawn soles never dip below the bedroom floor", { timeout: 300_000 }, () => {
  expect(sunkSoles(TIBIK_FOOT, (t) => ({ ...solveNachtruhe(t).tibik, skeleton: RIG }), DUSK[1], HOP_UP[0], () => BEDROOM.floor).slice(0, 6)).toEqual([]);
});

test("he comes in through the bedroom door, walks along his side of the bed and hops up onto its edge", () => {
  expect(solveNachtruhe(DUSK[1]).tibik.position[2]).toBeLessThan(BEDROOM.z0 + 0.6);
  for (const t of between(DUSK[1], HOP_UP[0])) expect(solveNachtruhe(t).tibik.position[2], t.toFixed(2)).toBeLessThan(BED_RECT.z0 - 0.3);
  const sat = solveNachtruhe(HOP_UP[1] + 0.2).tibik;
  sat.position.forEach((v, i) => expect(Math.abs(v - BED_SEAT.position[i]), `axis ${i}`).toBeLessThan(0.01));
  expect(sat.rotationY).toBeCloseTo(Math.PI, 3);
  expect(sat.pose.bob).toBeCloseTo(SITTING.bob, 3);
});

test("the doorway camera keeps 30 cm off Tibik and out of every solid while he goes to bed", { timeout: 300_000 }, () => {
  const problems = UP_TO_LYING.flatMap((t) => {
    const state = solveNachtruhe(t);
    const body = bodyColliders(RIG, asCharacter(state.tibik));
    return lensProblems(t, new Vector3(...cameraAt(t).position), 0.05, bedroomOf(state), [...body.torso, ...body.head, ...body.leftArm, ...body.rightArm, ...body.legs], 0.3);
  });
  expect(problems.slice(0, 8)).toEqual([]);
});
