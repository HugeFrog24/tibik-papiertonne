import { expect, test } from "vitest";
import { LYING, SITTING } from "../Tibik/bedPoses";
import { blendPose } from "./poseBlend";

test("a pose blend starts at the first pose, ends at the second and runs straight between them", () => {
  expect(blendPose(SITTING, LYING, 0)).toEqual(SITTING);
  expect(blendPose(SITTING, LYING, 1)).toEqual(LYING);
  const half = blendPose(SITTING, LYING, 0.5);
  const mid = (a: number, b: number) => (a + b) / 2;
  expect(half.bob).toBeCloseTo(mid(SITTING.bob, LYING.bob), 12);
  expect(half.lean).toBeCloseTo(mid(SITTING.lean, LYING.lean), 12);
  expect(half.leftArm.elbow).toBeCloseTo(mid(SITTING.leftArm.elbow, LYING.leftArm.elbow), 12);
  expect(half.rightLeg.knee).toBeCloseTo(mid(SITTING.rightLeg.knee, LYING.rightLeg.knee), 12);
  half.leftLeg.hip.forEach((v, i) => expect(v).toBeCloseTo(mid(SITTING.leftLeg.hip[i], LYING.leftLeg.hip[i]), 12));
  half.rightLeg.ankle.forEach((v, i) => expect(v).toBeCloseTo(mid(SITTING.rightLeg.ankle[i], LYING.rightLeg.ankle[i]), 12));
});
