import { expect, test } from "vitest";
import type { ArmPose } from "../characters/skeleton";
import { ARM_REST, ARM_TUCK } from "../Tibik/rig";
import { FPS } from "../frameRate";
import type { TibikFrame } from "../Tibik/character";
import { ENTRY as HOME_AT_DUSK, WALK_ROUND } from "./nachtruhe/timeline";
import { solveNachtruhe } from "./nachtruhe/solve";
import { ENTRY as HOME_IN_THE_RAIN } from "./rundschreiben/choreography";
import { solveRundschreiben } from "./rundschreiben/solve";
import { LEAVING, STORY_END } from "./treppenhaus/choreography";
import { solveTreppenhaus } from "./treppenhaus/solve";
import { PAPIERTONNEN_DOOR } from "./papiertonnen/choreography";
import { solvePapiertonnen } from "./papiertonnen/solve";

const STEADY = { in: 0.3, out: 0.5 };
const THROUGH_THE_DOOR = (entry: typeof HOME_IN_THE_RAIN) => entry.walkingIn;
const HANGING = { raise: 0.6, elbow: 0.7 };
const SPARE = 0.05;
const TUCKED_UP = (ARM_REST.raise + ARM_TUCK.raise) / 2;

const strideOf = ([from, to]: readonly [number, number]) => {
  const first = Math.ceil((from + STEADY.in) * FPS);
  const last = Math.floor((to - STEADY.out) * FPS);
  return Array.from({ length: last - first + 1 }, (_, i) => (first + i) / FPS);
};

const hanging = (arm: ArmPose) => arm.raise <= HANGING.raise && arm.elbow <= HANGING.elbow;

const tuckedFrames = (walk: readonly [number, number], at: (t: number) => TibikFrame) =>
  strideOf(walk).flatMap((t) => {
    const { leftArm, rightArm } = at(t).pose;
    return hanging(leftArm) && hanging(rightArm) ? [] : [`${t.toFixed(2)} s: left raise ${leftArm.raise.toFixed(2)} elbow ${leftArm.elbow.toFixed(2)}, right raise ${rightArm.raise.toFixed(2)} elbow ${rightArm.elbow.toFixed(2)}`];
  });

test("walking in through the Haustür in the rain, his arms hang at his sides and swing, never tucked up in front of him", { timeout: 300_000 }, () => {
  expect(tuckedFrames(THROUGH_THE_DOOR(HOME_IN_THE_RAIN), (t) => solveRundschreiben(t).tibik).slice(0, 6)).toEqual([]);
});

test("walking in through the Haustür at dusk, his arms hang at his sides and swing, never tucked up in front of him", { timeout: 300_000 }, () => {
  expect(tuckedFrames(THROUGH_THE_DOOR(HOME_AT_DUSK), (t) => solveNachtruhe(t).tibik).slice(0, 6)).toEqual([]);
});

test("walking round the bed to the curtain in the morning, his arms hang at his sides and swing, never tucked up in front of him", { timeout: 300_000 }, () => {
  expect(tuckedFrames(WALK_ROUND, (t) => solveNachtruhe(t).tibik).slice(0, 6)).toEqual([]);
});

test("inside, in the 1.3 m lane between the wall and the balustrade at the foot of the stairs, his hands rest on his belly, never tucked up in front of his chest", { timeout: 300_000 }, () => {
  for (const [entry, at] of [[HOME_IN_THE_RAIN, (t: number) => solveRundschreiben(t).tibik], [HOME_AT_DUSK, (t: number) => solveNachtruhe(t).tibik]] as const) {
    const times = strideOf([entry.walkingIn[1] - STEADY.in, entry.inWalk[1] + STEADY.out]);
    expect(times.length).toBeGreaterThan(5);
    for (const which of ["leftArm", "rightArm"] as const)
      expect(times.filter((t) => at(t).pose[which].raise > TUCKED_UP).map((t) => `${which} ${t.toFixed(2)}`)).toEqual([]);
  }
});

test("walking out through the Haustür, holding it open with his right hand, his left hand rests on his belly, never tucked up in front of his chest; outside, once he has let go of the door, both arms hang until he walks along the bins", { timeout: 300_000 }, () => {
  const inside = strideOf([LEAVING.walkOut[0], STORY_END + STEADY.out]).filter((t) => solveTreppenhaus(t).tibik.pose.leftArm.raise > ARM_REST.raise + SPARE);
  expect(inside.map((t) => t.toFixed(2))).toEqual([]);
  expect(tuckedFrames([PAPIERTONNEN_DOOR.letGo - STEADY.in, PAPIERTONNEN_DOOR.alongTheBins + STEADY.out], (t) => solvePapiertonnen(t).tibik).slice(0, 6)).toEqual([]);
});

test("turning from the light switch to the top of the stairs, his free left arm hangs; only his right, passing his door's knob and the stair wall and about to take the handrail, is held in", { timeout: 300_000 }, () => {
  const times = strideOf([LEAVING.towardTheStairs[0] - STEADY.in + 0.15, LEAVING.towardTheStairs[1] + STEADY.out]);
  expect(times.length).toBeGreaterThan(10);
  expect(times.filter((t) => !hanging(solveTreppenhaus(t).tibik.pose.leftArm)).map((t) => t.toFixed(2))).toEqual([]);
});

test("leaving his flat, his arms are never tucked up in front of his chest: his left hangs until it takes the door knob, his right hangs once it is off the lever as he sidles out, and his left rests on his belly once he lets the door swing shut beside him", { timeout: 300_000 }, () => {
  const arm = (t: number, which: "leftArm" | "rightArm") => solveTreppenhaus(t).tibik.pose[which];
  const [, sidled] = LEAVING.sidle;
  const [, shut] = LEAVING.shut;
  expect(strideOf([0, sidled - 0.3]).filter((t) => !hanging(arm(t, "leftArm"))).map((t) => t.toFixed(2))).toEqual([]);
  expect(strideOf([LEAVING.sidle[0] + 0.7 - STEADY.in, shut + STEADY.out]).filter((t) => !hanging(arm(t, "rightArm"))).map((t) => t.toFixed(2))).toEqual([]);
  expect(strideOf([shut - 0.4 - STEADY.in, shut + STEADY.out]).filter((t) => arm(t, "leftArm").raise > ARM_REST.raise + SPARE).map((t) => t.toFixed(2))).toEqual([]);
});
