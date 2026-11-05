import { Matrix4 } from "three";
import { expect, test } from "vitest";
import { rundschreibenTibikAt } from "../scenes/rundschreiben/choreography";
import { asCharacter } from "../Tibik/character";
import { obb } from "./collision";
import { GUARD_REACH, guardBody } from "./guards";

const standing = () => asCharacter(rundschreibenTibikAt(0));

const wallThrough = (x: number, z: number) =>
  obb("wall", new Matrix4().makeTranslation(x, 1.5, z), [0.3, 3, 3]);

test("a path run into a wall moves the body by a small, visible push at most, never a jump across the set", () => {
  const before = standing();
  const [x, , z] = before.position;
  const after = guardBody(before, [wallThrough(x + 0.1, z)]);
  const moved = Math.hypot(after.position[0] - x, after.position[2] - z);
  expect(moved).toBeGreaterThan(0);
  expect(moved).toBeLessThanOrEqual(GUARD_REACH + 1e-9);
});

test("a body clear of every solid stays where its path puts it", () => {
  const before = standing();
  const [x, , z] = before.position;
  expect(guardBody(before, [wallThrough(x + 3, z)]).position).toEqual(before.position);
});
