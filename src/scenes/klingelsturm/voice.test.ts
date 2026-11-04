import { Vector3 } from "three";
import { expect, test } from "vitest";
import { mouthInWorld, seenBy } from "../../dialogue/screen";
import { KAREN_SKELETON } from "../../Karen/rig";
import type { Vec3 } from "../../toon/primitives";
import { karenVoice, solveKlingelsturm } from "./solve";

test("her bubble's tail aims at her mouth only when the camera can see it, never at a mouth behind the camera", () => {
  const state = solveKlingelsturm(8);
  const mouth = mouthInWorld(KAREN_SKELETON, state.karen);
  const eye = mouth.clone().add(new Vector3(0, 0, 0.6));
  const away = eye.clone().add(new Vector3(0, 0, 1));
  const behind = {
    position: eye.toArray() as Vec3,
    target: away.toArray() as Vec3,
    fov: 50,
  };
  expect(seenBy(mouth, behind)).toBe(false);
  expect(karenVoice(state, behind).distanceTo(mouth)).toBeGreaterThan(0.1);
  const facing = {
    position: eye.toArray() as Vec3,
    target: mouth.toArray() as Vec3,
    fov: 50,
  };
  expect(karenVoice(state, facing).distanceTo(mouth)).toBe(0);
});
