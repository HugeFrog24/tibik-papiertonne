import { WALK_X } from "./streetChecks";
import { expect, test } from "vitest";
import { TONNE } from "./tonneShape";
import { overlap, partFootprint } from "./footprint";
import {
  BINS,
  KERB_DEPTH,
  KERB_Z,
  STREET_PARTS,
  STREET_TREE_XS,
  TREE_PIT,
  TREE_POSITION,
  treePit,
} from "./layout";

const kerbFace = KERB_Z - KERB_DEPTH / 2;
test("every street tree stands in an open tree pit that runs from the kerb into the pavement", () => {
  expect(STREET_TREE_XS).toContain(TREE_POSITION[0]);
  expect(TREE_PIT.along * TREE_PIT.across).toBeGreaterThanOrEqual(2.25);
  for (const x of STREET_TREE_XS) {
    const pit = treePit(x);
    expect(pit.z[1]).toBeCloseTo(kerbFace, 9);
    expect(x - pit.x[0]).toBeGreaterThanOrEqual(0.5);
    expect(pit.x[1] - x).toBeGreaterThanOrEqual(0.5);
    expect(TREE_POSITION[2] - pit.z[0]).toBeGreaterThanOrEqual(0.5);
    expect(pit.z[1] - TREE_POSITION[2]).toBeGreaterThanOrEqual(0.5);
  }
});

test("nothing else stands in a tree pit: lamps, bike stands, bins, the entrance", () => {
  const others = [
    ...STREET_PARTS.filter((p) => p.name !== "tree trunk"),
    ...BINS.map((b) => ({
      center: b.position,
      size: [TONNE.width, TONNE.height, TONNE.depth] as const,
    })),
  ].map(partFootprint);
  for (const x of STREET_TREE_XS)
    for (const other of others)
      expect(overlap(treePit(x), other), `pit at ${x}`).toBe(false);
});

test("the pits stay clear of where Tibik and Karen walk", () => {
  for (const x of STREET_TREE_XS) {
    const pit = treePit(x);
    expect(pit.x[1] < WALK_X[0] || pit.x[0] > WALK_X[1], `pit at ${x}`).toBe(
      true,
    );
  }
});
