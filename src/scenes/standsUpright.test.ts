import { expect, test } from "vitest";
import type { TibikFrame } from "../Tibik/character";
import { ENTRY as DUSK_ENTRY } from "./nachtruhe/timeline";
import { solveNachtruhe } from "./nachtruhe/solve";
import { ENTRY as EPILOGUE_ENTRY } from "./rundschreiben/choreography";
import { solveRundschreiben } from "./rundschreiben/solve";
import { framesThrough, seconds } from "./sceneChecks";

const SOFT_KNEES = 0.03;

const sunk = (scene: string, [from, to]: readonly [number, number], tibikAt: (t: number) => TibikFrame) =>
  framesThrough(from, to)
    .filter((t) => tibikAt(t).pose.bob < -SOFT_KNEES - 1e-9)
    .slice(0, 3)
    .map((t) => `${scene} ${seconds(t)}: hips ${(-tibikAt(t).pose.bob * 100).toFixed(1)} cm down`);

test("standing 1.79 m, he unlocks the Haustür about a metre up by leaning to it, not crouching: at dusk and two weeks later his knees only soften, his hips staying within 3 cm of standing", { timeout: 120_000 }, () => {
  expect([
    ...sunk("Nachtruhe", [DUSK_ENTRY.unlock[0], DUSK_ENTRY.backStep[0]], (t) => solveNachtruhe(t).tibik),
    ...sunk("Rundschreiben", [EPILOGUE_ENTRY.unlock[0], EPILOGUE_ENTRY.backStep[0]], (t) => solveRundschreiben(t).tibik),
  ]).toEqual([]);
});
