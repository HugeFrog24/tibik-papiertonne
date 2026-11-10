import { expect, test } from "vitest";
import { MOUTH_LEAD } from "../dialogue/voiced";
import { takeIdOf } from "./recordingScript";
import { LINES as HAUSMUELL_LINES } from "./hausmuell/choreography";
import { solveHausmuell } from "./hausmuell/solve";
import { LINES as KLINGELSTURM_LINES } from "./klingelsturm/choreography";
import { solveKlingelsturm } from "./klingelsturm/solve";
import { takeOf } from "./voices";

const SCENES = [
  { name: "Hausmuell", lines: HAUSMUELL_LINES, mouthAt: (t: number) => solveHausmuell(t).karen.mouthOpen },
  { name: "Klingelsturm", lines: KLINGELSTURM_LINES, mouthAt: (t: number) => solveKlingelsturm(t).karen.mouthOpen },
];

const SHOUTING = 0.55;

test.each(SCENES)("$name: Karen's mouth opens two frames before each of her takes is heard and shuts when its speech ends, not when its subtitle does", ({ lines, mouthAt }) => {
  expect(MOUTH_LEAD).toBeCloseTo(2 / 30, 9);
  const wrong: string[] = [];
  for (const line of lines.filter((l) => l.speaker === "karen" && !l.far)) {
    const take = takeOf("de", takeIdOf(line)!);
    if (take?.speech.length !== 1) continue;
    const ends = line.from + take.speech[0][1] - take.speech[0][0];
    if (mouthAt(line.from - MOUTH_LEAD + 0.005) < SHOUTING) wrong.push(`${line.name}: shut as the sound starts`);
    if (mouthAt((line.from + ends) / 2) < SHOUTING) wrong.push(`${line.name}: shut mid-line`);
    const after = ends + 0.04;
    const nextStarts = Math.min(...lines.filter((l) => l.from > line.from).map((l) => l.from - MOUTH_LEAD));
    if (after < nextStarts && mouthAt(after) >= SHOUTING) wrong.push(`${line.name}: still shouting ${(line.to - ends).toFixed(2)} s after the voice stopped`);
  }
  expect(wrong).toEqual([]);
}, 120_000);
