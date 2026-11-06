import { PerspectiveCamera, Vector3 } from "three";
import { expect, test } from "vitest";
import { indoorSolids } from "../../building/flurShape";
import { insideKarenHead, karenMouthEmitter } from "../../Karen/mouthEmitter";
import { boxGap, nearby, sphereObbGap } from "../../physics/collision";
import { FPS } from "../../frameRate";
import { curlExtent, curlsAt } from "../../smoke/smoke";
import { aimLens } from "../../toon/shots";
import { bodyColliders } from "../../characters/skeleton";
import { asKaren } from "../../Karen/character";
import { KAREN_SKELETON } from "../../Karen/rig";
import { FRAME, cameraAt } from "./cameras";
import { seconds } from "../sceneChecks";
import { karenAt } from "./choreography";
import { CODA } from "./cigarette";
import { HAZE, SMOKE_SOURCES, codaCurlsAt, codaSmokeScene, karenBodyAt } from "./codaSmoke";

const SOLIDS = indoorSolids({ tibik: 0, tibikLever: 0 });

test("no curl passes into the ceiling, walls, doors, stair flight or Karen", { timeout: 600_000 }, () => {
  const problems: string[] = [];
  for (let f = Math.round(CODA.lit * FPS); f < Math.round(CODA.end * FPS); f += 6) {
    const t = f / FPS;
    const body = karenBodyAt(t);
    for (const curl of codaCurlsAt(t)) {
      const box = curlExtent(curl);
      for (const solid of nearby(SOLIDS, curl.center, 1)) if (boxGap(box, solid) < -0.001) problems.push(`${seconds(t)}: curl in ${solid.name}`);
      for (const part of body) if (sphereObbGap(part, box) < -0.001) problems.push(`${seconds(t)}: curl in Karen's ${part.name}`);
    }
  }
  expect(problems.slice(0, 6)).toEqual([]);
});

test("no curl born before the jump cut is left after it; only the haze hangs there, opacity at most 0.15", () => {
  const after = codaCurlsAt(CODA.jumpCut + 0.5);
  expect(after.filter((c) => c.born < CODA.jumpCut)).toEqual([]);
  const haze = after.filter((c) => c.born === CODA.jumpCut && c.flat === 1);
  expect(haze).toHaveLength(HAZE.spots.length);
  for (const curl of haze) expect(curl.opacity).toBeLessThanOrEqual(0.15);
  expect(codaCurlsAt(CODA.jumpCut - 0.1).some((c) => c.born < CODA.jumpCut)).toBe(true);
});

test("the wisp rises only while it is lit; an exhale's curls are born within 15 mm in front of her lips", () => {
  const [wisp, exhale] = SMOKE_SOURCES;
  expect(wisp.windows[0][0]).toBe(CODA.lit);
  expect(codaCurlsAt(CODA.lit - 1 / FPS)).toEqual([]);
  for (const [from] of exhale.windows) {
    const born = exhale.origin(from);
    const karen = karenAt(from);
    expect(insideKarenHead(born, karen)).toBe(false);
    const back = born.clone().addScaledVector(karenMouthEmitter(karen).forward, -0.015);
    expect(insideKarenHead(back, karen)).toBe(true);
    expect(exhale.direction!(from).dot(new Vector3(0, 1, 0))).toBeGreaterThan(0);
  }
});

const wispAt = (t: number) => curlsAt(t, { ...codaSmokeScene(), sources: [SMOKE_SOURCES[0]] });

test("after the jump the wisp is a steady column at once: the first frame of 'Wide: later' carries about as many wisp curls as the last of the close-up", () => {
  const before = wispAt(CODA.jumpCut - 1 / FPS).length;
  expect(before).toBeGreaterThan(10);
  for (const t of [CODA.jumpCut, CODA.jumpCut + 1 / FPS]) expect(wispAt(t).length, seconds(t)).toBeGreaterThanOrEqual(0.8 * before);
});

test("after the jump a few faint flat wisps hang in the frame in 'Wide: later' at her head's height, where exhaled smoke settles in still air", () => {
  const head = Math.max(...bodyColliders(KAREN_SKELETON, asKaren(karenAt(CODA.jumpCut))).head.map((s) => s.center.y + s.radius));
  const mouth = karenMouthEmitter(karenAt(CODA.jumpCut)).origin.y;
  for (const t of [CODA.jumpCut + 0.5, CODA.outAgain - 0.1]) {
    const lens = aimLens(new PerspectiveCamera(), cameraAt(t), { aspect: FRAME.width / FRAME.height, near: 0.05, far: 100 });
    const haze = codaCurlsAt(t).filter((c) => c.born === CODA.jumpCut && c.flat === 1);
    expect(haze).toHaveLength(HAZE.spots.length);
    for (const curl of haze) {
      const seen = curl.center.clone().project(lens);
      expect(Math.abs(seen.x), seconds(t)).toBeLessThan(1);
      expect(seen.y, seconds(t)).toBeGreaterThan(0);
      expect(seen.y, seconds(t)).toBeLessThan(1);
      expect(curl.center.y).toBeGreaterThan(mouth);
      expect(curl.center.y).toBeLessThan(head);
    }
  }
});

test("on consecutive frames the coda's smoke costs well under 50 ms a frame", () => {
  const from = Math.round((CODA.darkExhale[1] - 0.3) * FPS);
  codaCurlsAt(from / FPS);
  const started = performance.now();
  const frames = 30;
  for (let f = from + 1; f <= from + frames; f++) codaCurlsAt(f / FPS);
  expect((performance.now() - started) / frames).toBeLessThan(50);
});
