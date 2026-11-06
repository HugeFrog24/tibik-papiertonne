import { expect, test } from "vitest";
import { BED } from "../building/bedroomShape";
import { torsoProfile } from "../characters/skeleton";
import { RIG } from "./rig";

const TOE_RISE = 0.05;

test("his legs are long enough that the bottom of his body stands within a toe-rise of his bed's mattress, so he can sit back onto its edge instead of hopping up", () => {
  const seat = RIG.hipHeight + Math.min(...torsoProfile(RIG).map((p) => p.y));
  expect(seat).toBeGreaterThanOrEqual(BED.top - TOE_RISE);
  expect(seat).toBeLessThan(BED.top);
});

test("his thigh and shin are equally long", () => {
  expect(RIG.thigh.length).toBeCloseTo(RIG.shin.length, 9);
});
