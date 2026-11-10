import { expect, test } from "vitest";
import { doorLeaf } from "../../building/doors";
import { seenBy } from "../../dialogue/screen";
import { FPS } from "../../frameRate";
import { obbCorners } from "../../physics/collision";
import { phoneAt } from "./calls";
import { cameraAt, shotAt, storyTime } from "./cameras";
import { KLINGELSTURM_DURATION } from "./choreography";
import { TIBIK_DOOR } from "../../building/stairwell";
import type { Vec3 } from "../../toon/primitives";
import { later } from "./banging";
import { phoneObb } from "./choreography";
import {
  phoneViolations,
  solveKlingelsturm,
  type KlingelsturmState,
} from "./solve";

const intoHisDoor = (state: KlingelsturmState) => {
  const leaf = doorLeaf(TIBIK_DOOR, state.tibikDoor);
  const phone = phoneObb(state.karen, state.phone!);
  const shift = leaf.center.clone().sub(phone.center).toArray();
  return phoneViolations({
    ...state,
    karen: {
      ...state.karen,
      position: state.karen.position.map((v, i) => v + shift[i]) as Vec3,
    },
  }).filter((c) => c.b === TIBIK_DOOR.name);
};

test("her phone is checked against the landing as it is at that moment, his open door included", { timeout: 120_000 }, () => {
  const state = solveKlingelsturm(later(50.9));
  expect(state.phone).not.toBeNull();
  expect(state.tibikDoor).toBeGreaterThan(1);
  expect(intoHisDoor(state).length).toBeGreaterThan(0);
});

const OUTLINE_MARGIN = -0.01;

test("her phone comes into and leaves her hand only where no camera sees it happen: on a cut, or out of frame, outline included", () => {
  const frames = Math.round(KLINGELSTURM_DURATION * FPS);
  const inHand = (f: number) => phoneAt(storyTime(f / FPS)).inHand;
  const seenHappening: string[] = [];
  for (let f = 1; f <= frames; f++) {
    if (inHand(f) === inHand(f - 1)) continue;
    const cut = shotAt(f / FPS).name !== shotAt((f - 1) / FPS).name;
    if (cut) continue;
    const held = inHand(f) ? f : f - 1;
    const state = solveKlingelsturm(storyTime(held / FPS));
    const seen = obbCorners(phoneObb(state.karen, state.phone!)).filter((c) => seenBy(c, cameraAt(held / FPS), OUTLINE_MARGIN));
    if (seen.length > 0) seenHappening.push(`${inHand(f) ? "appears" : "vanishes"} at ${(f / FPS).toFixed(3)} s in "${shotAt(f / FPS).name}"`);
  }
  expect(seenHappening).toEqual([]);
});
