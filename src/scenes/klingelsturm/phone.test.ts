import { expect, test } from "vitest";
import { doorLeaf } from "../../building/doors";
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

test("her phone is checked against the landing as it is at that moment, his open door included", () => {
  const state = solveKlingelsturm(later(50.9));
  expect(state.phone).not.toBeNull();
  expect(state.tibikDoor).toBeGreaterThan(1);
  expect(intoHisDoor(state).length).toBeGreaterThan(0);
});
