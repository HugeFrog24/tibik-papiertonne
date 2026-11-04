import { expect, test } from "vitest";
import { facadeClashes } from "./streetChecks";
import {
  BINS,
  FACADE_Z,
  HYDRANT,
  HYDRANT_SIGN,
  KERB_DEPTH,
  KERB_Z,
  STREET_PARTS,
  STREET_TREE_XS,
  hydrantCap,
  metres,
  treePit,
} from "./layout";
import { TONNE } from "./tonneShape";
import { footprint, overlap as clash, partFootprint } from "./footprint";

test("the hydrant sign hangs on bare wall at eye height, nothing on the facade in front of it", () => {
  expect(HYDRANT_SIGN.center[1]).toBeGreaterThanOrEqual(1.2);
  expect(HYDRANT_SIGN.center[1]).toBeLessThanOrEqual(2.2);
  expect(HYDRANT_SIGN.center[2]).toBeGreaterThan(FACADE_Z);
  expect(HYDRANT_SIGN.center[2]).toBeLessThan(FACADE_Z + 0.01);
  expect(facadeClashes(HYDRANT_SIGN)).toEqual([]);
});

test("the sign reads the way the fire brigade reads it: metres to the side beside the stem, metres straight ahead under the bar", () => {
  expect(metres(1.4)).toBe("1,4");
  expect(metres(3.2)).toBe("3,2");
  expect(metres(0.5)).toBe("0,5");
  const cap = hydrantCap();
  expect(cap.x - HYDRANT_SIGN.center[0]).toBeCloseTo(
    HYDRANT.side * HYDRANT.toward,
    9,
  );
  expect(cap.z - FACADE_Z).toBeCloseTo(HYDRANT.ahead, 9);
});

test("the cap lies in open pavement: not in a tree pit, on the step, under a bin, in the kerb or under anything standing there", () => {
  const cap = hydrantCap();
  const at = footprint(cap.x, cap.z, HYDRANT.cap[0], HYDRANT.cap[1]);
  expect(at.z[1]).toBeLessThan(KERB_Z - KERB_DEPTH / 2);
  for (const x of STREET_TREE_XS)
    expect(clash(at, treePit(x)), `pit ${x}`).toBe(false);
  for (const bin of BINS)
    expect(
      clash(
        at,
        partFootprint({
          center: bin.position,
          size: [TONNE.width, TONNE.height, TONNE.depth],
        }),
      ),
      bin.name,
    ).toBe(false);
  for (const part of STREET_PARTS)
    expect(clash(at, partFootprint(part)), part.name).toBe(false);
});
