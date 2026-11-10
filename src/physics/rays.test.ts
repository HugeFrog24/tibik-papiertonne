import { Matrix4, Vector3 } from "three";
import { expect, test } from "vitest";
import { obb } from "./collision";
import { ballInTheWay, boxInTheWay, sightLine } from "./rays";

const EYE = new Vector3(0, 0, 0);
const POINT = new Vector3(0, 0, -4);

test("a sight line runs from the eye toward the point, one unit long per step, as far as the point", () => {
  const sight = sightLine(EYE, POINT);
  expect(sight.distance).toBeCloseTo(4, 12);
  expect(sight.dir.toArray()).toEqual([0, 0, -1]);
  expect(sight.eye).toBe(EYE);
});

test("a box is in the way only where the line enters it short of the point by more than the margin", () => {
  const box = (z: number) => obb("box", new Matrix4().makeTranslation(0, 0, z), [1, 1, 1]);
  const sight = sightLine(EYE, POINT);
  expect(boxInTheWay(sight, box(-2))).toBe(true);
  expect(boxInTheWay(sight, box(-6))).toBe(false);
  expect(boxInTheWay(sight, box(-4.48), 0.03)).toBe(false);
  expect(boxInTheWay(sight, box(-4.4), 0.03)).toBe(true);
  expect(boxInTheWay(sight, obb("aside", new Matrix4().makeTranslation(3, 0, -2), [1, 1, 1]))).toBe(false);
});

test("a ball is in the way when the line passes within its radius of the centre, with the centre between the eye and the point less the margin", () => {
  const sight = sightLine(EYE, POINT);
  expect(ballInTheWay(sight, new Vector3(0.2, 0, -2), 0.3)).toBe(true);
  expect(ballInTheWay(sight, new Vector3(0.4, 0, -2), 0.3)).toBe(false);
  expect(ballInTheWay(sight, new Vector3(0, 0, 1), 0.3)).toBe(false);
  expect(ballInTheWay(sight, new Vector3(0, 0, -3.97), 0.3, 0.05)).toBe(false);
  expect(ballInTheWay(sight, new Vector3(0, 0, -3.97), 0.3)).toBe(true);
});
