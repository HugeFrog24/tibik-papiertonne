import { expect, test } from "vitest";
import { armColliders, type Skeleton } from "../characters/skeleton";
import { asKaren } from "../Karen/character";
import { asCharacter } from "../Tibik/character";
import { OVERHEAD } from "../physics/grip";
import { TIMELINE_FPS } from "../timeline";
import { HAUSMUELL_DURATION } from "./hausmuell/choreography";
import { solveHausmuell } from "./hausmuell/solve";
import { KLINGELSTURM_DURATION } from "./klingelsturm/choreography";
import { solveKlingelsturm } from "./klingelsturm/solve";
import { PAPIERTONNEN_DURATION } from "./papiertonnen/choreography";
import { solvePapiertonnen } from "./papiertonnen/solve";
import { STORY_END } from "./treppenhaus/choreography";
import { solveTreppenhaus } from "./treppenhaus/solve";

type Posed = Parameters<typeof armColliders>[1] & { skeleton: Skeleton };


const arms = (who: string, c: Posed, at: string) =>
  (["leftArm", "rightArm"] as const).flatMap((arm) => {
    if (c.pose[arm].raise <= OVERHEAD) return [];
    const spheres = armColliders(c.skeleton, c, arm);
    const shoulder = spheres[0].center;
    const hand = spheres[spheres.length - 1].center;
    return hand.y >= shoulder.y
      ? []
      : [
          `${at}: ${who}'s ${arm} swung over his head to a hand ${((shoulder.y - hand.y) * 100).toFixed(0)} cm below the shoulder`,
        ];
  });

const sweep = (duration: number, cast: (t: number) => [string, Posed][]) => {
  const problems: string[] = [];
  for (let f = 0; f < Math.round(duration * TIMELINE_FPS); f += 2) {
    const t = f / TIMELINE_FPS;
    for (const [who, c] of cast(t))
      problems.push(...arms(who, c, `${t.toFixed(2)} s`));
  }
  return problems;
};

const SCENES: [string, () => string[]][] = [
  [
    "Treppenhaus",
    () =>
      sweep(STORY_END, (t) => [
        ["Tibik", asCharacter(solveTreppenhaus(t).tibik)],
      ]),
  ],
  [
    "Papiertonnen",
    () =>
      sweep(PAPIERTONNEN_DURATION, (t) => [
        ["Tibik", asCharacter(solvePapiertonnen(t).tibik)],
      ]),
  ],
  [
    "Hausmuell",
    () =>
      sweep(HAUSMUELL_DURATION, (t) => {
        const s = solveHausmuell(t);
        return [
          ["Tibik", asCharacter(s.tibik)],
          ["Karen", asKaren(s.karen)],
        ];
      }),
  ],
  [
    "Klingelsturm",
    () =>
      sweep(KLINGELSTURM_DURATION, (t) => {
        const s = solveKlingelsturm(t);
        return [
          ["Tibik", asCharacter(s.tibik)],
          ["Karen", asKaren(s.karen)],
        ];
      }),
  ],
];

test.each(SCENES)(
  "%s: nobody reaches down by swinging an arm over the head",
  { timeout: 600_000 },
  (_name, run) => {
    expect(run().slice(0, 8)).toEqual([]);
  },
);
