import { expect, test } from "vitest";
import { smoothstep } from "./scalar";
import { placesAt, type PropPlace } from "./propPlace";

const A: PropPlace = { position: [0, 0, 0], rotation: [0, 0, 0] };
const B: PropPlace = { position: [1, 2, 0], rotation: [0, 1, 0] };
const at = placesAt([
  { at: 1, place: A },
  { at: 3, place: B },
]);

test("placesAt holds the first place before the first stop, the last after the last, and eases between with smoothstep", () => {
  expect(at(0)).toEqual(A);
  expect(at(5)).toEqual(B);
  expect(at(2).position[0]).toBeCloseTo(0.5, 9);
  expect(at(2).rotation[1]).toBeCloseTo(0.5, 9);
  expect(at(1.5).position[1]).toBeCloseTo(2 * smoothstep(0.25), 9);
});
