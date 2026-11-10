import { expect, test } from "vitest";
import { boxGap, obbCorners } from "../physics/collision";
import { BINS, binItemColliders } from "./layout";
import { restingLids } from "./restingLids";
import { TONNE, tonneLid } from "./tonneShape";

test("an overfull Papiertonne's lid rests propped on the cardboard sticking out of it, neither floating above it nor sinking into it, and a bin with nothing above its rim stays shut", () => {
  const lids = restingLids();
  const problems = BINS.flatMap((bin, i) => {
    const items = binItemColliders(bin).filter((_, k) => bin.contents[k].material !== "paper");
    const top = Math.max(-Infinity, ...items.flatMap(obbCorners).map((p) => p.y - bin.position[1]));
    if (lids[i] === 0) return top > TONNE.height ? [`${bin.name}: shut, but something reaches ${((top - TONNE.height) * 1000).toFixed(0)} mm above its rim`] : [];
    if (top <= TONNE.height) return [`${bin.name}: lid open with nothing above the rim to hold it`];
    const lid = tonneLid(bin.name, bin.position, lids[i]);
    const gap = Math.min(...items.map((item) => boxGap(lid, item)));
    return gap > 0.01 || gap < -0.003 ? [`${bin.name}: lid ${(gap * 1000).toFixed(1)} mm from what props it`] : [];
  });
  expect(lids.filter((lid) => lid > 0).length).toBeGreaterThanOrEqual(2);
  expect(problems).toEqual([]);
});
