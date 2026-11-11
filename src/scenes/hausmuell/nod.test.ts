import { expect, test } from "vitest";
import { bodyColliders } from "../../characters/skeleton";
import { contacts, deepest } from "../../physics/collision";
import { asCharacter, kartonFlapsOf, CHIN_CLEARANCE } from "../papiertonnen/solve";
import { LINES } from "./choreography";
import { solveHausmuell } from "./solve";
import { spokenSpans } from "../../dialogue/voiced";
import { TIMELINE_FPS } from "../../frameRate";

const spans = spokenSpans("hausmuell", LINES);
const HIS = LINES.filter((line) => line.speaker === "tibik");

const chinDepth = (t: number, headPitch?: number) => {
  const { tibik, karton } = solveHausmuell(t);
  const posed = asCharacter(headPitch === undefined ? tibik : { ...tibik, pose: { ...tibik.pose, headPitch, lean: 0 } });
  const body = bodyColliders(posed.skeleton, posed);
  return deepest(contacts([...body.upperTorso, ...body.head], kartonFlapsOf(tibik, karton, CHIN_CLEARANCE)));
};

const framesOf = ([from, to]: readonly [number, number]) =>
  Array.from({ length: Math.floor((to - from) * TIMELINE_FPS) }, (_, i) => from + i / TIMELINE_FPS);

test("Tibik's talking nod reaches the screen in Hausmüll: while he speaks each line his head moves, lifting his chin off the box on the beats", () => {
  for (const line of HIS) {
    const pitches = framesOf(spans(line)).map((t) => solveHausmuell(t).tibik.pose.headPitch);
    expect(Math.min(...pitches), line.name).toBeLessThan(-0.03);
  }
});

test("his head never tips down toward the open box past level, so the nod's downward half stays level", () => {
  for (const line of HIS) for (const t of framesOf(spans(line))) expect(solveHausmuell(t).tibik.pose.headPitch, `${line.name} @${t.toFixed(2)}`).toBeLessThanOrEqual(1e-4);
});

test("his chin never comes nearer the box's flaps than it is with his head level, though it starts within their clearance", () => {
  let within = 0;
  for (const line of HIS) {
    for (const t of framesOf(spans(line))) {
      const level = chinDepth(t, 0);
      if (level > 0) within++;
      expect(chinDepth(t), `${line.name} @${t.toFixed(2)}`).toBeLessThanOrEqual(level + 1e-6);
    }
  }
  expect(within).toBeGreaterThan(0);
});
