import { expect, test } from "vitest";
import { FINAL_ARM, armHistory } from "./armHistory";
import type { ArmPose } from "../characters/skeleton";

const pose = (raise: number): ArmPose => ({ raise, out: 0, elbow: 0, inward: 0 });

test("a hand that holds something remembers last frame's arm: asked for any frame, it first settles the frames since the hold began, in order, so the answer is the same whatever order frames are solved in", () => {
  const settled: number[] = [];
  const history = armHistory(30, (t) => {
    settled.push(Math.round(t * 30));
    history.remember(t, "leftArm", "knob", pose(Math.round(t * 30)));
  });
  expect(history.before(1 / 30, "leftArm", "knob", 1 / 30)).toBeUndefined();
  expect(history.before(5 / 30, "leftArm", "knob", 1 / 30)).toEqual(pose(4));
  expect(settled).toEqual([1, 2, 3, 4]);
  expect(history.before(3 / 30, "leftArm", "knob", 1 / 30)).toEqual(pose(2));
  expect(settled).toEqual([1, 2, 3, 4]);
});

test("between frames it remembers nothing, so a sub-frame solve never changes what the next frame starts from", () => {
  const history = armHistory(30, () => undefined);
  history.remember(2 / 30, "rightArm", "lever", pose(2));
  history.remember(2.5 / 30, "rightArm", "lever", pose(9));
  expect(history.before(3 / 30, "rightArm", "lever", 0)).toEqual(pose(2));
  expect(history.before(2.5 / 30, "rightArm", "lever", 0)).toEqual(pose(2));
  history.clear();
  expect(history.before(3 / 30, "rightArm", "lever", 0)).toBeUndefined();
});

test("each character keeps its own arm history, so Tibik's left arm never starts from Karen's", () => {
  const history = armHistory(30, () => undefined);
  history.of("Karen").remember(2 / 30, "leftArm", "arm", pose(7));
  history.of("Tibik").remember(2 / 30, "leftArm", "arm", pose(3));
  expect(history.of("Karen").before(3 / 30, "leftArm", "arm", 0)).toEqual(pose(7));
  expect(history.of("Tibik").before(3 / 30, "leftArm", "arm", 0)).toEqual(pose(3));
});

test("across a declared story jump nothing is remembered: the first frame after the cut starts afresh, so an arm is where the new moment puts it at once", () => {
  const history = armHistory(30, (t) => { history.remember(t, "leftArm", "arm", pose(Math.round(t * 30))); }, 0, [10 / 30]);
  expect(history.before(10 / 30, "leftArm", "arm", 0)).toBeUndefined();
  expect(history.before(12 / 30, "leftArm", "arm", 0)).toEqual(pose(11));
  expect(history.before(9 / 30, "leftArm", "arm", 0)).toEqual(pose(8));
});

test("a scene that continues another opens on the earlier scene's last arms: asked for the frame before its first, it answers with what the opening hands it, for that character and arm, and only for the arm itself", () => {
  const opening = (who: string, which: string) => (who === "/Tibik" && which === "rightArm" ? pose(5) : undefined);
  const history = armHistory(30, () => undefined, 0, [], opening);
  expect(history.of("Tibik").before(0, "rightArm", FINAL_ARM, -Infinity)).toEqual(pose(5));
  expect(history.of("Tibik").before(0, "leftArm", FINAL_ARM, -Infinity)).toBeUndefined();
  expect(history.of("Karen").before(0, "rightArm", FINAL_ARM, -Infinity)).toBeUndefined();
  expect(history.of("Tibik").before(0, "rightArm", "knob", -Infinity)).toBeUndefined();
  expect(history.of("Tibik").before(1 / 30, "rightArm", FINAL_ARM, -Infinity)).toBeUndefined();
});
