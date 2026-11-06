import { Matrix4, PerspectiveCamera, Vector3 } from "three";
import { expect, test } from "vitest";
import { allColliders, bodyColliders, handSphere } from "../../characters/skeleton";
import { onScreen } from "../../dialogue/screen";
import { asKaren } from "../../Karen/character";
import { insideKarenHead, toKarenHead } from "../../Karen/mouthEmitter";
import { KAREN_SKELETON } from "../../Karen/rig";
import { sphereObbGap } from "../../physics/collision";
import { cigaretteObb, cigaretteTip } from "../../props/cigaretteShape";
import { FLAME, SPARKS, flameTip, lighterObb, sparksAt } from "../../props/lighterShape";
import { FPS } from "../../frameRate";
import { seconds } from "../sceneChecks";
import { PHONE_AT_POCKET } from "../../Karen/phoneShape";
import { phonePlaceAt } from "./calls";
import { FRAME, cameraAt, shotAt, storyTime } from "./cameras";
import { aimLens } from "../../toon/shots";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { tibikAt } from "./door";
import { EXIT_SOUNDS } from "./exit";
import { KLINGELSTURM_DURATION, karenAt } from "./choreography";
import { ASH, BURN, CODA, GLOW, ashAt, burnedAt, cigaretteFrame, emberGlowAt, lighterFrame } from "./cigarette";
import { STORY_SKIP } from "./light";
import { karenBodyAt } from "./codaSmoke";
import { solveKlingelsturm } from "./solve";

const HELD = 0.003;

const onFrame = (t: number) => Math.abs(t * FPS - Math.round(t * FPS)) < 1e-6;
const framesOf = ([from, to]: readonly [number, number], step = 1) =>
  Array.from({ length: Math.floor(((to - from) * FPS) / step) + 1 }, (_, i) => from + (i * step) / FPS);
const ndcX = (point: Vector3, t: number) => (2 * onScreen(point, cameraAt(t))[0]) / FRAME.width - 1;
const codaTimes = Object.values(CODA).flatMap((v) => (Array.isArray(v) ? v.flat() : [v])) as number[];

test("story time equals film time up to the jump cut and runs STORY_SKIP ahead after it", () => {
  expect(storyTime(CODA.jumpCut - 1 / FPS)).toBeCloseTo(CODA.jumpCut - 1 / FPS, 9);
  expect(storyTime(CODA.jumpCut + 1)).toBeCloseTo(CODA.jumpCut + 1 + STORY_SKIP, 9);
  expect(STORY_SKIP).toBeGreaterThan(160);
  expect(STORY_SKIP).toBeLessThan(180);
});

test("every coda time is on a whole frame and the scene ends about 74 s in", () => {
  codaTimes.forEach((t) => expect(onFrame(t), String(t)).toBe(true));
  expect(KLINGELSTURM_DURATION).toBe(CODA.end);
  expect(CODA.end).toBeGreaterThan(73);
  expect(CODA.end).toBeLessThan(75);
});

test("no cigarette or lighter before the cut into the Medium; the phone leaves her hand only at its pocket", () => {
  const before = solveKlingelsturm(CODA.mediumCut - 1 / FPS);
  expect(before.cigarette).toBeNull();
  expect(before.lighter).toBeNull();
  const at = solveKlingelsturm(CODA.mediumCut);
  expect(at.cigarette).not.toBeNull();
  expect(at.lighter).not.toBeNull();
  expect(shotAt(CODA.mediumCut).name).toBe("Close-up: the cigarette");
  expect(phonePlaceAt(CODA.phoneAway[1])).toEqual(PHONE_AT_POCKET);
  expect(solveKlingelsturm(CODA.phoneAway[1] + 1 / FPS).phone).toBeNull();
  expect(solveKlingelsturm(CODA.phoneAway[0]).phone).not.toBeNull();
});

const lipsWindows: readonly (readonly [number, number])[] = [[CODA.mediumCut, CODA.end - 0.1]];

test("from the cut to the end the cigarette stays in the corner of her mouth: the filter between her lips, at most 10 mm inside, the rest outside her head", () => {
  for (const window of lipsWindows)
    for (const t of framesOf(window, 2)) {
      const { karen, cigarette } = solveKlingelsturm(t);
      const frame = cigarette!.frame;
      expect(insideKarenHead(new Vector3(0, 0, 0).applyMatrix4(frame), karen), `${seconds(t)} filter end inside`).toBe(true);
      expect(insideKarenHead(new Vector3(0, 0, 0.01).applyMatrix4(frame), karen), `${seconds(t)} more than 10 mm in`).toBe(false);
      for (let z = 0.012; z <= 0.06; z += 0.006) {
        const point = new Vector3(0, 0, z).applyMatrix4(frame);
        expect(insideKarenHead(point, karen), `${seconds(t)} z ${z}`).toBe(false);
        expect(toKarenHead(point, karen).z, `${seconds(t)} in front of her face`).toBeGreaterThan(0);
      }
    }
});

const handOf = (t: number, arm: "leftArm" | "rightArm") => handSphere(KAREN_SKELETON, asKaren(solveKlingelsturm(t).karen), arm);
const headOf = (t: number) => bodyColliders(KAREN_SKELETON, asKaren(solveKlingelsturm(t).karen)).head;
const clearOfHead = (t: number, arm: "leftArm" | "rightArm") => {
  const hand = handOf(t, arm);
  for (const part of headOf(t)) expect(hand.center.distanceTo(part.center), `${seconds(t)} ${arm} in her head`).toBeGreaterThan(part.radius + hand.radius);
};

test("the lighter is gripped clear of her body until it goes into her pocket, and the flame's tip reaches the cigarette's end while it burns", () => {
  expect(solveKlingelsturm(CODA.lighterDown[1] + 1 / FPS).lighter).toBeNull();
  for (const t of framesOf([CODA.mediumCut, CODA.lighterDown[1]], 2)) {
    const { lighter, karen } = solveKlingelsturm(t);
    const box = lighterObb(lighter!.frame);
    const gap = sphereObbGap(handOf(t, "rightArm"), box);
    expect(gap, seconds(t)).toBeGreaterThanOrEqual(0);
    expect(gap, seconds(t)).toBeLessThanOrEqual(HELD);
    for (const part of [...bodyColliders(KAREN_SKELETON, asKaren(karen)).torso, ...headOf(t)])
      expect(sphereObbGap(part, box), seconds(t)).toBeGreaterThan(0);
    clearOfHead(t, "rightArm");
  }
  for (const t of framesOf([CODA.flame[0] + 0.1, CODA.flame[1] - 0.1], 1)) {
    const { lighter, cigarette } = solveKlingelsturm(t);
    expect(flameTip(lighter!.frame, t, lighter!.flame).distanceTo(cigaretteTip(cigarette!.frame, cigarette!.burned)), seconds(t)).toBeLessThan(0.004);
  }
});

test("she lights it one-handed: her right hand passes through neither the flame nor her face, and her left hand stays down", () => {
  for (const t of framesOf(CODA.flame, 1)) {
    const { lighter, karen } = solveKlingelsturm(t);
    const hand = handOf(t, "rightArm");
    const flameMid = flameTip(lighter!.frame, t, 1).add(new Vector3(0, -FLAME.height / 2, 0));
    expect(hand.center.distanceTo(flameMid), seconds(t)).toBeGreaterThan(hand.radius + FLAME.radius);
    clearOfHead(t, "rightArm");
    expect(handOf(t, "leftArm").center.y, seconds(t)).toBeLessThan(karen.position[1] + 1.0);
  }
});

test("the burned length follows BURN.rate over the story time since it was lit, about 23 mm at the second timeout, and the ash is never longer", () => {
  expect(burnedAt(CODA.lit - 0.5)).toBe(0);
  const out = storyTime(CODA.outAgain);
  expect(burnedAt(out)).toBeCloseTo(BURN.rate * (out - CODA.lit), 9);
  expect(burnedAt(out)).toBeGreaterThan(0.02);
  expect(burnedAt(out)).toBeLessThan(0.026);
  for (const t of framesOf([CODA.lit, CODA.end], 3)) {
    expect(ashAt(storyTime(t))).toBeLessThanOrEqual(burnedAt(storyTime(t)));
    expect(ashAt(storyTime(t))).toBeLessThanOrEqual(ASH.hold);
  }
});

test("the ember catches on the first draw and is brighter during each later draw than at rest", () => {
  expect(emberGlowAt(CODA.lit - 1 / FPS)).toBe(0);
  expect(emberGlowAt(CODA.draws[0][1])).toBeGreaterThan(GLOW.rest);
  for (const [, end] of [CODA.draws[1], CODA.laterDraw]) expect(emberGlowAt(end), String(end)).toBeGreaterThan(GLOW.rest + 0.3);
  expect(emberGlowAt(CODA.jumpCut + 0.3)).toBeCloseTo(GLOW.rest, 6);
});

test("Tibik is down the stairs and out of every shot from the cut into the close-up, and gone after the jump", () => {
  expect(solveKlingelsturm(CODA.mediumCut - 1 / FPS).tibikHere).toBe(true);
  expect(solveKlingelsturm(CODA.mediumCut).tibikHere).toBe(false);
  expect(solveKlingelsturm(CODA.jumpCut + 1).tibikHere).toBe(false);
});

const tibikInShot = (t: number) => {
  const lens = aimLens(new PerspectiveCamera(), cameraAt(t), { aspect: FRAME.width / FRAME.height, near: 0.05, far: 100 });
  return allColliders(RIG, asCharacter(tibikAt(t)))
    .filter((part) => {
      const seen = part.center.clone().project(lens);
      return seen.z < 1 && Math.abs(seen.x) < 1 && Math.abs(seen.y) < 1;
    })
    .map((part) => part.name);
};

test("where he really is on his way down, Tibik is out of every shot from the cut into the close-up to the jump", () => {
  expect(tibikInShot(EXIT_SOUNDS.lightSwitch).length).toBeGreaterThan(0);
  for (const t of framesOf([CODA.mediumCut, CODA.jumpCut - 1 / FPS], 3)) expect(tibikInShot(t), seconds(t)).toEqual([]);
});

test("while she lights it the lighter turns with her: whichever way she faces it sits the same in her hand", () => {
  const karen = karenAt(CODA.flick);
  const turned = { ...karen, rotationY: karen.rotationY + Math.PI / 2 };
  const about = new Vector3(...karen.position);
  const turning = new Matrix4().makeTranslation(about.x, about.y, about.z).multiply(new Matrix4().makeRotationY(Math.PI / 2)).multiply(new Matrix4().makeTranslation(-about.x, -about.y, -about.z));
  const burned = 0;
  const facing = lighterFrame(karen, CODA.flick, cigaretteFrame(karen), burned);
  const expected = turning.clone().multiply(facing);
  const actual = lighterFrame(turned, CODA.flick, cigaretteFrame(turned), burned);
  actual.elements.forEach((v, i) => expect(v, `element ${i}`).toBeCloseTo(expected.elements[i], 6));
});

test("the flame in the Medium and the ember in the Wide: later sit within the 9:16 centre band", () => {
  const t = (CODA.flame[0] + CODA.flame[1]) / 2;
  const { lighter } = solveKlingelsturm(t);
  expect(Math.abs(ndcX(flameTip(lighter!.frame, t), t))).toBeLessThanOrEqual(0.316);
  const later = CODA.outAgain + 0.5;
  const lit = solveKlingelsturm(later).cigarette!;
  expect(Math.abs(ndcX(cigaretteTip(lit.frame, lit.burned), later))).toBeLessThanOrEqual(0.316);
});

test("the tip catches over a few frames rather than popping alight", () => {
  for (let f = Math.round(CODA.lit * FPS) - 2; f <= Math.round(CODA.lit * FPS) + 8; f++)
    expect(Math.abs(emberGlowAt(f / FPS) - emberGlowAt((f - 1) / FPS)), `frame ${f}`).toBeLessThanOrEqual(0.15);
});

test("the sparks on the flick stay clear of her head, her hands and the cigarette", () => {
  for (const t of [CODA.flick, CODA.flick + 1 / FPS]) {
    const state = solveKlingelsturm(t);
    const sparks = sparksAt(t - CODA.flick).map((p) => p.clone().applyMatrix4(state.lighter!.frame));
    expect(sparks.length, seconds(t)).toBeGreaterThan(0);
    const paper = cigaretteObb(state.cigarette!.frame, state.cigarette!.burned, state.cigarette!.ash);
    for (const center of sparks) {
      const spark = { kind: "sphere" as const, name: "spark", center, radius: SPARKS.radius };
      expect(insideKarenHead(center, state.karen), seconds(t)).toBe(false);
      expect(sphereObbGap(spark, paper), seconds(t)).toBeGreaterThan(0);
      for (const part of karenBodyAt(t)) expect(center.distanceTo(part.center) - part.radius - SPARKS.radius, `${seconds(t)} ${part.name}`).toBeGreaterThan(0);
    }
  }
});
