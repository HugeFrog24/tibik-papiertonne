import { WALK_X } from "./streetChecks";
import { expect, test } from "vitest";
import { collide, partObb } from "../physics/collision";
import { BIKE, STAND, STAND_XS, bikeParts, standZ } from "./bikes";
import { FACADE_Z, KERB_Z } from "./building";

test("the bike stands are standard Anlehnbügel: 1.2 m long, 0.7–0.8 m high, 0.8 m off the wall, 1.2–1.5 m apart", () => {
  expect(STAND.length).toBeCloseTo(1.2, 6);
  expect(STAND.height).toBeGreaterThanOrEqual(0.7);
  expect(STAND.height).toBeLessThanOrEqual(0.8);
  expect(standZ(0) - FACADE_Z).toBeGreaterThanOrEqual(0.8 - 1e-9);
  expect(standZ(1)).toBeLessThan(KERB_Z - 1.5);
  const gap = Math.abs(STAND_XS[0] - STAND_XS[1]);
  expect(gap).toBeGreaterThanOrEqual(1.2);
  expect(gap).toBeLessThanOrEqual(1.5);
});

test("they stand well clear of where Tibik and Karen walk", () => {
  for (const part of bikeParts())
    expect(part.center[0] + part.size[0] / 2).toBeLessThan(WALK_X[0] - 4);
});

test("the parked bike leans beside its stand without passing through it", () => {
  const [stand, , bike] = bikeParts();
  expect(collide(partObb(bike), partObb(stand))).toBeNull();
  expect(BIKE.x - BIKE.width / 2 - (STAND_XS[0] + STAND.tube)).toBeLessThan(
    0.05,
  );
});
