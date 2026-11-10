import { expect, test } from "vitest";
import { BED } from "../building/bedroomShape";
import { armIntoTorso, torsoProfile } from "../characters/skeleton";
import { headSurface } from "./headShape";
import { ARM_TUCK, RIG, TIBIK_REST } from "./rig";

const TOE_RISE = 0.05;

test("his legs are long enough that the bottom of his body stands within a toe-rise of his bed's mattress, so he can sit back onto its edge instead of hopping up", () => {
  const seat = RIG.hipHeight + Math.min(...torsoProfile(RIG).map((p) => p.y));
  expect(seat).toBeGreaterThanOrEqual(BED.top - TOE_RISE - 1e-9);
  expect(seat).toBeLessThan(BED.top);
});

test("his thigh and shin are equally long", () => {
  expect(RIG.thigh.length).toBeCloseTo(RIG.shin.length, 9);
});

const THE_OWNERS_HEIGHT = 1.79;

test("standing, the top of his head is no higher than the film's owner (1.79 m); only his frog eyes rise above it", () => {
  const top = Math.max(...headSurface({ position: [0, 0, 0], rotationY: 0, pose: TIBIK_REST }).map((p) => p.y));
  expect(top).toBeLessThanOrEqual(THE_OWNERS_HEIGHT);
});

test("his tucked arm, held in to pass a door frame, rests in front of his belly instead of sinking into it, on either side, and stays clear even held a little lower", () => {
  for (const which of ["leftArm", "rightArm"] as const)
    for (const spare of [0, 0.03]) expect(armIntoTorso(RIG, { ...TIBIK_REST, [which]: { ...ARM_TUCK, raise: ARM_TUCK.raise - spare } }, which), `${which} ${spare}`).toBe(0);
});
