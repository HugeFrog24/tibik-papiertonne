import { Vector3 } from "three";
import { expect, test } from "vitest";
import { allColliders } from "../../characters/skeleton";
import { letterSolids } from "../../props/letterShape";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { FPS } from "../../frameRate";
import { READ, THANKS, UNFOLD } from "./choreography";
import { rundschreibenRain } from "./rain";
import { solveRundschreiben } from "./solve";

const inside = (p: Vector3, box: ReturnType<typeof letterSolids>[number]) =>
  box.axes.every((axis, i) => Math.abs(p.clone().sub(box.center).dot(axis)) < box.half[i]);

const frames = (from: number, to: number, every = 10) =>
  Array.from({ length: Math.floor(((to - from) * FPS) / every) }, (_, i) => from + (i * every) / FPS);

test("no raindrop passes through the letter he holds, while he unfolds and reads it", () => {
  const through: string[] = [];
  for (const t of frames(UNFOLD[0], THANKS[1])) {
    const state = solveRundschreiben(t);
    const sheets = letterSolids(state.letter!);
    for (const drop of rundschreibenRain(t, state)) {
      const head = new Vector3(...drop.head);
      const tail = new Vector3(...drop.tail);
      for (let k = 0; k <= 50; k++) {
        const p = tail.clone().lerp(head, k / 50);
        const sheet = sheets.find((s) => inside(p, s));
        if (sheet) through.push(`${t.toFixed(2)} s: drop ${drop.id} through ${sheet.name}`);
      }
    }
  }
  expect(through.slice(0, 6)).toEqual([]);
});

test("no raindrop ends inside Tibik", () => {
  const sunk: string[] = [];
  for (const t of frames(0, READ[0], 15)) {
    const state = solveRundschreiben(t);
    const body = allColliders(RIG, asCharacter(state.tibik));
    for (const drop of rundschreibenRain(t, state)) {
      const head = new Vector3(...drop.head);
      const s = body.find((b) => head.distanceTo(b.center) < b.radius - 0.002);
      if (s) sunk.push(`${t.toFixed(2)} s: drop ${drop.id} inside ${s.name}`);
    }
  }
  expect(sunk.slice(0, 6)).toEqual([]);
});
