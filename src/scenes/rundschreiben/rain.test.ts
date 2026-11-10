import { Vector3 } from "three";
import { expect, test } from "vitest";
import { allColliders } from "../../characters/skeleton";
import { DL, ENVELOPE, envelopeFlap, envelopeSag, flapPieces, letterSolids } from "../../props/letterShape";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { FPS } from "../../frameRate";
import { ENVELOPE_OUT, KLOPPEN, READ, THANKS, UNFOLD } from "./choreography";
import { rundschreibenRain } from "./rain";
import { RAIN_DIR } from "../../weather/rainDrops";
import { DOORWAY, ENTRANCE_PARTS } from "../../street/facade";
import { FACADE_Z } from "../../street/building";
import { RUNDSCHREIBEN_DURATION } from "./choreography";
import { solveRundschreiben } from "./solve";

const inside = (p: Vector3, box: ReturnType<typeof letterSolids>[number]) =>
  box.axes.every((axis, i) => Math.abs(p.clone().sub(box.center).dot(axis)) < box.half[i]);

const frames = (from: number, to: number, every = 10) =>
  Array.from({ length: Math.floor(((to - from) * FPS) / every) }, (_, i) => from + (i * every) / FPS);

test("no raindrop passes through the letter he holds, while he unfolds and reads it", { timeout: 300_000 }, () => {
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

test("no raindrop ends inside Tibik", { timeout: 300_000 }, () => {
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

const inPolygon = (x: number, y: number, outline: readonly (readonly [number, number])[]) => {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [xi, yi] = outline[i];
    const [xj, yj] = outline[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

test("no raindrop passes through the envelope he holds or its torn flap, bow and all", { timeout: 300_000 }, () => {
  const through: string[] = [];
  for (const t of frames(ENVELOPE_OUT[1], KLOPPEN[0], 6)) {
    const state = solveRundschreiben(t);
    const envelope = state.envelope!;
    const toEnvelope = envelope.matrix.clone().invert();
    const toFlap = envelope.matrix.clone().multiply(envelopeFlap(envelope.flap)).invert();
    for (const drop of rundschreibenRain(t, state)) {
      const head = new Vector3(...drop.head);
      const tail = new Vector3(...drop.tail);
      for (let k = 0; k <= 40; k++) {
        const p = tail.clone().lerp(head, k / 40);
        const e = p.clone().applyMatrix4(toEnvelope);
        const sag = envelopeSag(e.x, e.y, envelope.bow, envelope.twist);
        if (e.x > 0 && e.x < DL[0] && e.y > 0 && e.y < DL[1] && e.z < sag + 0.001 && e.z > sag - ENVELOPE.thickness - 0.001) {
          through.push(`${t.toFixed(2)} s: drop ${drop.id} through the envelope`);
          break;
        }
        const f = p.clone().applyMatrix4(toFlap);
        if (Math.abs(f.z) < 0.001 && inPolygon(f.x, f.y, flapPieces().lifted)) {
          through.push(`${t.toFixed(2)} s: drop ${drop.id} through the flap`);
          break;
        }
      }
    }
  }
  expect(through.slice(0, 6)).toEqual([]);
});

test("the Haustür's door head keeps the rain off what lies in its lee: a drop under it came in on its slant from in front of it", { timeout: 300_000 }, () => {
  const head = ENTRANCE_PARTS.find((p) => p.name === "door head")!;
  const front = head.center[2] + head.size[2] / 2;
  const sheltered: string[] = [];
  for (const t of frames(0, RUNDSCHREIBEN_DURATION, 6)) {
    for (const drop of rundschreibenRain(t, solveRundschreiben(t))) {
      const headPoint = new Vector3(...drop.head);
      const tail = new Vector3(...drop.tail);
      for (let k = 0; k <= 20; k++) {
        const p = tail.clone().lerp(headPoint, k / 20);
        const under = p.x > DOORWAY.x0 && p.x < DOORWAY.x1 && p.y < DOORWAY.y1 && p.z >= FACADE_Z && p.z < front;
        if (!under) continue;
        const back = p.clone().addScaledVector(RAIN_DIR, (DOORWAY.y1 - p.y) / RAIN_DIR.y);
        if (back.z < front - 1e-6) {
          sheltered.push(`${t.toFixed(2)} s: drop ${drop.id} at ${p.toArray().map((v) => v.toFixed(3)).join(",")}`);
          break;
        }
      }
    }
  }
  expect(sheltered.slice(0, 6)).toEqual([]);
});
