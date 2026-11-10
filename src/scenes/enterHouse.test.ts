import { expect, test } from "vitest";
import { DOORSTEP } from "../street/building";
import { ENTRY as DUSK } from "./nachtruhe/timeline";
import { solveNachtruhe } from "./nachtruhe/solve";
import { ENTRY as EPILOGUE, rundschreibenTibikAt, tibikGait as rundschreibenGait } from "./rundschreiben/choreography";
import { duskGait, nachtruheTibikAt } from "./nachtruhe/choreography";
import { solveRundschreiben } from "./rundschreiben/solve";
import { armJumpsOver, framesThrough, mm, shovedOff, tibikIn } from "./sceneChecks";
import { footAt } from "../characters/gait";
import { footColliders } from "../characters/skeleton";
import { DOOR_STEP } from "../building/stairwell";
import { asCharacter } from "../Tibik/character";
import { RIG } from "../Tibik/rig";

test("from taking his key out of the Haustür until he walks in, neither arm jumps as the leaf swings out past him, at dusk and two weeks later", { timeout: 300_000 }, () => {
  expect([
    ...armJumpsOver(framesThrough(DUSK.keysInLock[1] - 0.3, DUSK.inWalk[0]), tibikIn(solveNachtruhe)),
    ...armJumpsOver(framesThrough(EPILOGUE.keysInLock[1] - 0.3, EPILOGUE.inWalk[0]), tibikIn(solveRundschreiben)),
  ]).toEqual([]);
});

test("walking up to the Haustür he stops where his belly clears the door jamb: from the last steps of his approach until he steps back for the leaf, nothing has to shove him off it, at dusk and two weeks later", { timeout: 300_000 }, () => {
  expect([
    ...shovedOff(framesThrough(DUSK.unlock[0] - 1, DUSK.backStep[0]), nachtruheTibikAt, (t) => solveNachtruhe(t).tibik, "dusk "),
    ...shovedOff(framesThrough(EPILOGUE.unlock[0] - 1, EPILOGUE.backStep[0]), rundschreibenTibikAt, (t) => solveRundschreiben(t).tibik, "epilogue "),
  ]).toEqual([]);
});

test("off the doorstep he stands at pavement height and on it at the step's: the lift onto the step runs from where he stands on the pavement to where he stands at the door, at dusk and two weeks later", () => {
  for (const [entry, at] of [[DUSK, nachtruheTibikAt], [EPILOGUE, rundschreibenTibikAt]] as const) {
    expect(at(entry.backStep[1]).position[1], "stepped back onto the pavement").toBe(0);
    expect(at(entry.unlock[0]).position[1], "at the lock").toBeCloseTo(DOORSTEP.height, 9);
  }
});

test("stepping into the doorway his foot lands wholly on the doorstep: from walking round the open leaf until he is inside, no planted foot hangs over the step's front edge, at dusk and two weeks later", { timeout: 300_000 }, () => {
  const over: string[] = [];
  for (const [name, entry, plan, solve] of [["dusk", DUSK, duskGait, solveNachtruhe], ["epilogue", EPILOGUE, rundschreibenGait, solveRundschreiben]] as const) {
    for (const t of framesThrough(entry.roundTheLeaf[0], entry.inWalk[1])) {
      const tibik = asCharacter(solve(t).tibik);
      for (const side of [1, -1] as const) {
        if (!footAt(plan(), side, t).plant) continue;
        const zs = footColliders(RIG, tibik, side).flatMap((s) => [s.center.z - s.radius, s.center.z + s.radius]);
        if (Math.min(...zs) < DOOR_STEP.z1 && Math.max(...zs) > DOOR_STEP.z1) over.push(`${name} ${t.toFixed(2)} s: side ${side} ${mm(Math.max(...zs) - DOOR_STEP.z1)} over the edge`);
      }
    }
  }
  expect(over.slice(0, 6)).toEqual([]);
});
