import { Matrix4, PerspectiveCamera, Vector3 } from "three";
import { expect, test } from "vitest";
import { allColliders, armColliders, armIntoTorso, armRootReach, bodyColliders, handSphere, torsoDepthAt, torsoMatrix } from "../../characters/skeleton";
import { OUTLINE } from "../../toon/primitives";
import { asKaren } from "../../Karen/character";
import { insideKarenHead, karenFaceSurface, karenMouthEmitter, toKarenHead } from "../../Karen/mouthEmitter";
import { KAREN_SKELETON } from "../../Karen/rig";
import { sphereObbGap } from "../../physics/collision";
import { CIGARETTE, cigaretteObb, cigaretteTip } from "../../props/cigaretteShape";
import { frameHeightAt } from "../../toon/frameHeight";
import { FLAME, SPARKS, flameTip, lighterObb, sparksAt } from "../../props/lighterShape";
import { TIMELINE_FPS, FORMATS, aspectOf } from "../../frameRate";
import { armJumpsOver, framesFrom, GENTLE_ARM, karenIn, seconds } from "../sceneChecks";
import { seenBy } from "../../dialogue/screen";
import { PHONE_AT_POCKET } from "../../Karen/phoneShape";
import { phonePlaceAt } from "./calls";
import { cameraAt, shotAt, storyTime } from "./cameras";
import { aimLens } from "../../toon/shots";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { tibikAt } from "./door";
import { EXIT_SOUNDS } from "./exit";
import { KLINGELSTURM_DURATION, karenAt } from "./choreography";
import { ASH, BURN, CODA, GLOW, ashAt, burnedAt, cigaretteFrame, emberGlowAt, lighterFrame, sinceStruckAt } from "./cigarette";
import { STORY_SKIP } from "./light";
import { karenBodyAt } from "./codaSmoke";
import { solveKlingelsturm } from "./solve";

const HELD = 0.003;

const onFrame = (t: number) => Math.abs(t * TIMELINE_FPS - Math.round(t * TIMELINE_FPS)) < 1e-6;
const framesOf = ([from, to]: readonly [number, number], step = 1) =>
  Array.from({ length: Math.floor(((to - from) * TIMELINE_FPS) / step) + 1 }, (_, i) => from + (i * step) / TIMELINE_FPS);
const codaTimes = Object.values(CODA).flat(2);

test("story time equals film time up to the jump cut and runs STORY_SKIP ahead after it", () => {
  expect(storyTime(CODA.jumpCut - 1 / TIMELINE_FPS)).toBeCloseTo(CODA.jumpCut - 1 / TIMELINE_FPS, 9);
  expect(storyTime(CODA.jumpCut + 1)).toBeCloseTo(CODA.jumpCut + 1 + STORY_SKIP, 9);
  expect(STORY_SKIP).toBeGreaterThan(160);
  expect(STORY_SKIP).toBeLessThan(180);
});

test("every coda time is on a whole frame and the scene ends about 72 s in: about three of her panting breaths shorter since the police greeting was cut, and her lighter's failed first strike longer", () => {
  codaTimes.forEach((t) => { expect(onFrame(t), String(t)).toBe(true); });
  expect(KLINGELSTURM_DURATION).toBe(CODA.end);
  expect(CODA.end).toBeGreaterThan(71.5);
  expect(CODA.end).toBeLessThan(72.5);
});

test("no cigarette or lighter before the cut into the Medium; the phone rests at her hip until that cut and leaves her hand on it", { timeout: 120_000 }, () => {
  const before = solveKlingelsturm(CODA.mediumCut - 1 / TIMELINE_FPS);
  expect(before.cigarette).toBeNull();
  expect(before.lighter).toBeNull();
  const at = solveKlingelsturm(CODA.mediumCut);
  expect(at.cigarette).not.toBeNull();
  expect(at.lighter).not.toBeNull();
  expect(shotAt(CODA.mediumCut).name).toBe("Close-up: the cigarette");
  expect(phonePlaceAt(CODA.mediumCut - 1 / TIMELINE_FPS)).toEqual(PHONE_AT_POCKET);
  expect(solveKlingelsturm(CODA.mediumCut - 1 / TIMELINE_FPS).phone).not.toBeNull();
  expect(solveKlingelsturm(CODA.mediumCut).phone).toBeNull();
});

const lipsWindows: readonly (readonly [number, number])[] = [[CODA.mediumCut, CODA.takeOut[0]], CODA.laterDraw];

test("while she lights it and while she draws on it the cigarette sits in the corner of her mouth: the filter between her lips, at most 10 mm inside, the rest outside her head", () => {
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
  expect(solveKlingelsturm(CODA.lighterDown[1] + 1 / TIMELINE_FPS).lighter).toBeNull();
  for (const t of framesOf([CODA.mediumCut, CODA.lighterDown[1]], 1)) {
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

const MEASURED_BURN = { slowest: 0.004 / 60, fastest: 0.005 / 60 };

test("the cigarette burns at the measured 4-5 mm a minute (free-burning to puffed) over the story time since it was lit, about 13 mm by the second timeout, and the ash is never longer", () => {
  expect(burnedAt(CODA.lit - 0.5)).toBe(0);
  const out = storyTime(CODA.outAgain);
  expect(burnedAt(out)).toBeCloseTo(BURN.rate * (out - CODA.lit), 9);
  expect(BURN.rate).toBeGreaterThanOrEqual(MEASURED_BURN.slowest);
  expect(BURN.rate).toBeLessThanOrEqual(MEASURED_BURN.fastest);
  expect(burnedAt(out)).toBeGreaterThan(0.011);
  expect(burnedAt(out)).toBeLessThan(0.015);
  for (const t of framesOf([CODA.lit, CODA.end], 3)) {
    expect(ashAt(storyTime(t))).toBeLessThanOrEqual(burnedAt(storyTime(t)));
    expect(ashAt(storyTime(t))).toBeLessThanOrEqual(ASH.hold);
  }
});

test("the ember catches on the first draw and is brighter during each later draw than at rest", () => {
  expect(emberGlowAt(CODA.lit - 1 / TIMELINE_FPS)).toBe(0);
  expect(emberGlowAt(CODA.draws[0][1])).toBeGreaterThan(GLOW.rest);
  for (const [, end] of [CODA.draws[1], CODA.laterDraw]) expect(emberGlowAt(end), String(end)).toBeGreaterThan(GLOW.rest + 0.3);
  expect(emberGlowAt(CODA.jumpCut + 0.3)).toBeCloseTo(GLOW.rest, 6);
});

test("Tibik is down the stairs and out of every shot from the cut into the close-up, and gone after the jump", () => {
  expect(solveKlingelsturm(CODA.mediumCut - 1 / TIMELINE_FPS).tibikHere).toBe(true);
  expect(solveKlingelsturm(CODA.mediumCut).tibikHere).toBe(false);
  expect(solveKlingelsturm(CODA.jumpCut + 1).tibikHere).toBe(false);
});

const tibikInShot = (t: number) => {
  const lens = aimLens(new PerspectiveCamera(), cameraAt(t), { aspect: aspectOf("wide"), near: 0.05, far: 100 });
  return allColliders(RIG, asCharacter(tibikAt(t)))
    .filter((part) => {
      const seen = part.center.clone().project(lens);
      return seen.z < 1 && Math.abs(seen.x) < 1 && Math.abs(seen.y) < 1;
    })
    .map((part) => part.name);
};

test("where he really is on his way down, Tibik is out of every shot from the cut into the close-up to the jump", () => {
  expect(tibikInShot(EXIT_SOUNDS.lightSwitch).length).toBeGreaterThan(0);
  for (const t of framesOf([CODA.mediumCut, CODA.jumpCut - 1 / TIMELINE_FPS], 3)) expect(tibikInShot(t), seconds(t)).toEqual([]);
});

test("while she lights it the lighter turns with her: whichever way she faces it sits the same in her hand", () => {
  const karen = karenAt(CODA.flick);
  const turned = { ...karen, rotationY: karen.rotationY + Math.PI / 2 };
  const about = new Vector3(...karen.position);
  const turning = new Matrix4().makeTranslation(about.x, about.y, about.z).multiply(new Matrix4().makeRotationY(Math.PI / 2)).multiply(new Matrix4().makeTranslation(-about.x, -about.y, -about.z));
  const burned = 0;
  const facing = lighterFrame(karen, CODA.flick, cigaretteFrame(karen, CODA.flick), burned);
  const expected = turning.clone().multiply(facing);
  const actual = lighterFrame(turned, CODA.flick, cigaretteFrame(turned, CODA.flick), burned);
  actual.elements.forEach((v, i) => { expect(v, `element ${i}`).toBeCloseTo(expected.elements[i], 6); });
});

test("the flame in the Medium and the ember in the Wide: later sit within the 9:16 centre band", () => {
  const t = (CODA.flame[0] + CODA.flame[1]) / 2;
  const { lighter } = solveKlingelsturm(t);
  expect(seenBy(flameTip(lighter!.frame, t), cameraAt(t, "tall"), 0, "tall")).toBe(true);
  const later = CODA.outAgain + 0.5;
  const lit = solveKlingelsturm(later).cigarette!;
  expect(seenBy(cigaretteTip(lit.frame, lit.burned), cameraAt(later, "tall"), 0, "tall")).toBe(true);
});

test("the tip catches over a few frames rather than popping alight", () => {
  for (let f = Math.round(CODA.lit * TIMELINE_FPS) - 2; f <= Math.round(CODA.lit * TIMELINE_FPS) + 8; f++)
    expect(Math.abs(emberGlowAt(f / TIMELINE_FPS) - emberGlowAt((f - 1) / TIMELINE_FPS)), `frame ${f}`).toBeLessThanOrEqual(0.15);
});

test("the lighter doesn't catch first time: the first strike, with the lighter already under the cigarette, throws its sparks and only a micro flame that dies within a few frames well short of the cigarette, and the second strike lights it", () => {
  const [first, second] = CODA.strikes;
  expect(second).toBe(CODA.flick);
  expect(second - first).toBeGreaterThanOrEqual(0.3);
  expect(second - first).toBeLessThanOrEqual(0.6);
  const raised = solveKlingelsturm(first);
  expect(flameTip(raised.lighter!.frame, first, 1).distanceTo(cigaretteTip(raised.cigarette!.frame, raised.cigarette!.burned))).toBeLessThan(0.004);
  const burning = framesOf([first, second - 1 / TIMELINE_FPS], 1)
    .map((t) => ({ t, ...solveKlingelsturm(t) }))
    .filter((s) => s.lighter!.flame > 0);
  expect(burning.length).toBeGreaterThan(0);
  expect(burning.length).toBeLessThanOrEqual(5);
  for (const s of burning) {
    expect(s.lighter!.flame, seconds(s.t)).toBeLessThanOrEqual(0.4);
    expect(flameTip(s.lighter!.frame, s.t, s.lighter!.flame).distanceTo(cigaretteTip(s.cigarette!.frame, s.cigarette!.burned)), seconds(s.t)).toBeGreaterThan(0.01);
  }
  expect(sinceStruckAt(first - 1 / TIMELINE_FPS)).toBeUndefined();
  expect(sinceStruckAt(first + 1 / TIMELINE_FPS)).toBeCloseTo(1 / TIMELINE_FPS, 9);
  expect(sinceStruckAt(second + 1 / TIMELINE_FPS)).toBeCloseTo(1 / TIMELINE_FPS, 9);
  expect(emberGlowAt(second)).toBe(0);
  expect(solveKlingelsturm(second + 0.2).lighter!.flame).toBe(1);
});

test("putting the lighter away she turns it over one way only: frame to frame its top tips steadily from upright to pointing down into her pocket, never swinging back", () => {
  const [down, pocketed] = CODA.lighterDown;
  const tops = framesOf([down, pocketed], 1).map((t) => new Vector3().setFromMatrixColumn(solveKlingelsturm(t).lighter!.frame, 1).normalize());
  const steps = tops.slice(1).map((top, i) => top.angleTo(tops[i]));
  expect(Math.max(...steps), steps.map((s) => s.toFixed(2)).join(" ")).toBeLessThan(0.45);
  const fromUpright = tops.map((top) => Math.acos(Math.min(1, Math.max(-1, top.y))));
  fromUpright.slice(1).forEach((tilt, i) => { expect(tilt, `frame ${i + 1}`).toBeGreaterThanOrEqual(fromUpright[i] - 0.05); });
});

test("smoking, she is no longer winded: from the cut into the Medium her panting moves her at most a quarter as far as while she watched him go", () => {
  const swing = (window: readonly [number, number]) => {
    const bobs = framesOf(window, 1).map((t) => karenAt(t).pose.bob);
    return Math.max(...bobs) - Math.min(...bobs);
  };
  const winded = swing([CODA.phoneAway[0] - 2, CODA.phoneAway[0]]);
  expect(winded).toBeGreaterThan(0.01);
  expect(swing([CODA.mediumCut, CODA.end])).toBeLessThanOrEqual(winded / 4);
});

test("the sparks of both strikes stay clear of her head, her hands and the cigarette", () => {
  for (const t of CODA.strikes.flatMap((strike) => [strike, strike + 1 / TIMELINE_FPS])) {
    const state = solveKlingelsturm(t);
    const sparks = sparksAt(sinceStruckAt(t)!).map((p) => p.clone().applyMatrix4(state.lighter!.frame));
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

const IN_HER_FINGERS = { away: 0.12, every: 3 };
const awayFromHerLips = (t: number) => t >= CODA.takeOut[1] && (t < CODA.toLips[0] || t > CODA.fromLips[1]);

test("after lighting it she smokes from her right hand: her fist holds the filter from taking it out to the end, and between draws it is well away from her lips", () => {
  for (const t of framesOf([CODA.takeOut[0], CODA.end - 0.1], IN_HER_FINGERS.every)) {
    const { cigarette, karen } = solveKlingelsturm(t);
    const gap = sphereObbGap(handOf(t, "rightArm"), cigaretteObb(cigarette!.frame, cigarette!.burned, cigarette!.ash));
    expect(gap, seconds(t)).toBeGreaterThanOrEqual(0);
    expect(gap, seconds(t)).toBeLessThanOrEqual(HELD);
    if (awayFromHerLips(t)) {
      const filter = new Vector3(0, 0, 0).applyMatrix4(cigarette!.frame);
      expect(filter.distanceTo(karenMouthEmitter({ ...karen, mouthOpen: 0 }).origin), seconds(t)).toBeGreaterThan(IN_HER_FINGERS.away);
    }
  }
});

test("held in her fingers the cigarette touches nothing of her but the fist that holds it", () => {
  for (const t of framesOf([CODA.takeOut[1], CODA.end - 0.1], IN_HER_FINGERS.every).filter(awayFromHerLips)) {
    const { cigarette, karen } = solveKlingelsturm(t);
    const box = cigaretteObb(cigarette!.frame, cigarette!.burned, cigarette!.ash);
    const parts = allColliders(KAREN_SKELETON, asKaren(karen)).filter((c) => c.name !== "right hand");
    for (const part of parts) expect(sphereObbGap(part, box), `${seconds(t)} ${part.name}`).toBeGreaterThan(0);
  }
});

test("her smoking fist never sinks into her drawn face, her jowls, her hair or her body, not even while she draws on the cigarette", () => {
  for (const t of framesOf([CODA.takeOut[0], CODA.end - 0.1], IN_HER_FINGERS.every)) {
    const { karen } = solveKlingelsturm(t);
    const fist = handOf(t, "rightArm");
    for (const p of karenFaceSurface(karen)) expect(p.distanceTo(fist.center), `${seconds(t)} her face`).toBeGreaterThanOrEqual(fist.radius);
    for (const hair of headOf(t).filter((part) => part.name === "hair"))
      expect(hair.center.distanceTo(fist.center), `${seconds(t)} her hair`).toBeGreaterThan(hair.radius + fist.radius);
    expect(armIntoTorso(KAREN_SKELETON, karen.pose, "rightArm"), seconds(t)).toBeLessThanOrEqual(0.003);
  }
});

test("while she holds the cigarette out between draws her arm keeps an ink width off her bust and belly below the shoulder, so no line of her body shows across her arm", () => {
  for (const t of framesOf([CODA.takeOut[1], CODA.end - 0.1], IN_HER_FINGERS.every).filter(awayFromHerLips)) {
    const karen = asKaren(solveKlingelsturm(t).karen);
    const toTorso = torsoMatrix(KAREN_SKELETON, karen).invert();
    const [shoulder, ...arm] = armColliders(KAREN_SKELETON, karen, "rightArm");
    for (const s of arm.filter((part) => part.center.distanceTo(shoulder.center) > armRootReach(KAREN_SKELETON))) {
      const off = -torsoDepthAt(KAREN_SKELETON, s.center.clone().applyMatrix4(toTorso)) - s.radius;
      expect(off, `${seconds(t)} ${s.name}`).toBeGreaterThanOrEqual(OUTLINE);
    }
  }
});

test("with the lighter put away her hand comes up for the cigarette in an unhurried reach of at least 0.4 s, her right arm never swerving more than a gentle move does", { timeout: 300_000 }, () => {
  const reach = CODA.takeOut[0] - CODA.lighterDown[1];
  expect(reach + 1e-9).toBeGreaterThanOrEqual(0.4);
  expect(armJumpsOver(framesFrom(CODA.lighterDown[1] - 0.1, reach + 0.3), karenIn(solveKlingelsturm), [], GENTLE_ARM)).toEqual([]);
});

test("in the dark of the closing wide her ember reads on a phone: its glow spans at least 10 px of the 1080-line frame", () => {
  const t = (CODA.jumpCut + CODA.aside[0]) / 2;
  expect(shotAt(t).name).toBe("Wide: later");
  const camera = cameraAt(t);
  const ember = cigaretteTip(cigaretteFrame(karenAt(t), t), burnedAt(t));
  const across = (CIGARETTE.halo / frameHeightAt(ember.distanceTo(new Vector3(...camera.position)), camera.fov)) * FORMATS.wide.height;
  expect(across).toBeGreaterThanOrEqual(10);
});
