import { expect, test } from "vitest";
import { FPS } from "../../frameRate";
import { CALL_LINES, CLICK, KEYS } from "./calls";
import { EXIT } from "./exit";
import { LIGHT } from "./light";
import { Vector3 } from "three";
import { doorFrame, doorLeaf, viewerLens } from "../../building/doors";
import { TIBIK_DOOR } from "../../building/stairwell";
import { handSphere } from "../../characters/skeleton";
import { mouthInWorld, seenBy } from "../../dialogue/screen";
import { RIG } from "../../Tibik/rig";
import { asKaren } from "../../Karen/character";
import { KAREN_SKELETON } from "../../Karen/rig";
import { sphereObbGap } from "../../physics/collision";
import { floorLevel } from "../../street/building";
import { GENTLE_ARM, TOLERANCE, armJumpsOver, framesFrom, karenIn, mm, seconds } from "../sceneChecks";
import { cameraAt, shotAt } from "./cameras";
import { KAREN_HOME, karenAt, phoneGrip, phoneObb } from "./choreography";
import { phoneAt, phonePlaceAt } from "./calls";
import { PHONE_AT_POCKET } from "../../Karen/phoneShape";
import { footfallOffset } from "../../Karen/footfall";
import { tibikAt, tibikDoorAt } from "./door";
import { parcelBody } from "./parcel";
import { klingelsturmViolations, solveKlingelsturm } from "./solve";
import { BANGING, BLOW, LATER, SHIVER, blowPoint, doorShiverAt, later } from "./banging";

test("everything after the hang-up keeps its spacing and starts LATER s later, on whole frames", () => {
  expect(LATER * FPS).toBeCloseTo(207, 9);
  expect(KEYS[2].at - KEYS[1].at).toBeCloseTo(0.35 + LATER, 9);
  expect(KEYS[5].at - KEYS[2].at).toBeCloseTo(1.2, 9);
  expect(CLICK - KEYS[5].at).toBeCloseTo(11.4, 9);
  expect(LIGHT.out - CLICK).toBeCloseTo(2.0, 9);
  expect(EXIT.end - LIGHT.out).toBeCloseTo(10.1, 9);
  expect(EXIT.offset * FPS).toBeCloseTo(1576, 6);
  expect(CALL_LINES.find((l) => l.text.startsWith("MEIN NACHBAR"))!.from).toBeCloseTo(later(34.9), 9);
  const herFirst = CALL_LINES.find((l) => l.text.startsWith("MEIN NACHBAR"))!.from;
  expect(herFirst - later(31.45)).toBeGreaterThan(0);
  expect(herFirst - later(31.45)).toBeLessThan(0.3);
});

const onFrame = (t: number) => Math.abs(t * FPS - Math.round(t * FPS)) < 1e-6;
const frameOf = (t: number) => Math.round(t * FPS) / FPS;
const leftHand = (t: number) => handSphere(KAREN_SKELETON, asKaren(solveKlingelsturm(t).karen), "leftArm");
const leafAt = (t: number) => doorLeaf(TIBIK_DOOR, tibikDoorAt(t));
const framesOf = ([from, to]: readonly [number, number]) =>
  Array.from({ length: Math.round((to - from) * FPS) + 1 }, (_, i) => from + i / FPS);

test("four blows 0.4 s apart, a beat of 1.0 s, two more, all on whole frames", () => {
  const b = BANGING.blows;
  expect(b).toHaveLength(6);
  [1, 2, 3, 5].forEach((i) => { expect(b[i] - b[i - 1]).toBeCloseTo(0.4, 9); });
  expect(b[4] - b[3]).toBeCloseTo(1.0, 9);
  const times = [...b, BANGING.wideCut, BANGING.dial, ...BANGING.tuck, ...BANGING.walk, ...BANGING.flurCut, ...BANGING.back, ...BANGING.raise];
  times.forEach((t) => { expect(onFrame(t), String(t)).toBe(true); });
  expect(BANGING.dial).toBeCloseTo(later(29.7), 9);
  expect(BANGING.dial - BANGING.raise[1]).toBeCloseTo(0.4, 9);
});

test("each blow lands on his door leaf: at the contact frame her left hand is 0-2 mm off the leaf's landing face", () => {
  for (const at of BANGING.blows) {
    const gap = sphereObbGap(leftHand(frameOf(at)), leafAt(frameOf(at)));
    expect(gap, `blow @${at}`).toBeGreaterThanOrEqual(0);
    expect(gap, `blow @${at}`).toBeLessThanOrEqual(0.002);
  }
});

test("in no frame from the walk to the walk back does any part of her pass into his door, its frame or the doormat", () => {
  for (const t of framesOf([BANGING.walk[0], BANGING.back[1]])) {
    const found = klingelsturmViolations(solveKlingelsturm(t)).filter((c) => c.depth > TOLERANCE);
    expect(found.map((c) => `${c.a}/${c.b} ${mm(c.depth)}`), seconds(t)).toEqual([]);
    expect(sphereObbGap(leftHand(t), leafAt(t)), seconds(t)).toBeGreaterThanOrEqual(0);
  }
});

test("the fist strikes 1.35 m above the landing, 8 cm in from the latch edge, at least 0.15 m from the spyhole", () => {
  for (const at of BANGING.blows) {
    const p = blowPoint(at);
    expect(p.y - floorLevel(1)).toBeCloseTo(BLOW.height, 6);
    const local = p.clone().applyMatrix4(doorFrame(TIBIK_DOOR, tibikDoorAt(at)).clone().invert());
    expect(TIBIK_DOOR.width - local.x).toBeCloseTo(BLOW.fromLatchEdge, 6);
    expect(p.distanceTo(viewerLens(TIBIK_DOOR))).toBeGreaterThanOrEqual(0.15);
  }
});

test("her fist itself lands there: on each blow the solved hand meets the leaf 1.35 m up and 8 cm in from the latch edge", () => {
  for (const at of BANGING.blows) {
    const hand = leftHand(at);
    const local = hand.center.clone().applyMatrix4(doorFrame(TIBIK_DOOR, tibikDoorAt(at)).clone().invert());
    expect(Math.abs(hand.center.y - floorLevel(1) - BLOW.height), `height @${at}`).toBeLessThan(0.005);
    expect(Math.abs(TIBIK_DOOR.width - local.x - BLOW.fromLatchEdge), `from the latch edge @${at}`).toBeLessThan(0.005);
    expect(hand.center.distanceTo(viewerLens(TIBIK_DOOR))).toBeGreaterThanOrEqual(0.15);
  }
});

const latchEdge = (t: number) => new Vector3(TIBIK_DOOR.width, 1, 0).applyMatrix4(doorFrame(TIBIK_DOOR, tibikDoorAt(t)));

test("the leaf gives at most 2 mm at its latch edge on each blow and is still again 0.1 s later", () => {
  const shut = latchEdge(0);
  for (const at of BANGING.blows) {
    expect(latchEdge(at + 1 / FPS).distanceTo(shut), `just after @${at}`).toBeGreaterThan(0);
    for (const t of framesOf([at, at + SHIVER.settle]))
      expect(latchEdge(t).distanceTo(shut), seconds(t)).toBeLessThanOrEqual(SHIVER.edge + 1e-9);
    expect(latchEdge(at + SHIVER.settle + 1e-6).distanceTo(shut)).toBe(0);
    expect(doorShiverAt(at + SHIVER.settle + 1e-6)).toBe(0);
  }
});

test("the Wide shows the first four blows, the Flur the last two, and she dials in the Medium", () => {
  BANGING.blows.slice(0, 4).forEach((at) => { expect(shotAt(at).name).toBe("Wide: the banging"); });
  BANGING.blows.slice(4).forEach((at) => { expect(shotAt(at).name).toBe("Flur: the banging"); });
  expect(shotAt(BANGING.dial).name).toBe("Medium: back to the phone");
  expect(shotAt(BANGING.wideCut - 1 / FPS).name).toBe("Medium: the answering machine");
});

test("the fist on the door in the Wide, and the parcel and his face in the Flur, are in the 9:16 frame", () => {
  const inTall = (point: Vector3, at: number) => seenBy(point, cameraAt(at, "tall"), 0, "tall");
  BANGING.blows.slice(0, 4).forEach((at) => { expect(inTall(blowPoint(at), at), `blow @${at}`).toBe(true); });
  BANGING.blows.slice(4).forEach((at) => {
    expect(inTall(parcelBody().center, at), `parcel @${at}`).toBe(true);
    expect(inTall(mouthInWorld(RIG, tibikAt(at)), at), `his face @${at}`).toBe(true);
  });
});

test("for the trip she lowers the phone to her hip, it leaves her hand on the cut to the wide and is back in it before she dials, her hand on its grip whenever she holds it", () => {
  expect(phonePlaceAt(BANGING.tuck[1])).toEqual(PHONE_AT_POCKET);
  expect(phonePlaceAt(BANGING.raise[0])).toEqual(PHONE_AT_POCKET);
  for (const t of framesOf([BANGING.tuck[0], BANGING.raise[1]])) {
    const state = solveKlingelsturm(t);
    const away = t > BANGING.wideCut - 1e-9 && t < BANGING.raise[0] - 1e-9;
    expect(state.phone === null, seconds(t)).toBe(away);
    if (away) continue;
    const hand = handSphere(KAREN_SKELETON, asKaren(state.karen), "rightArm").center;
    expect(hand.distanceTo(phoneGrip(state.karen, phoneAt(t), t)), seconds(t)).toBeLessThan(0.01);
    const drawn = phoneObb(state.karen, state.phone!).center;
    expect(drawn.distanceTo(phoneObb(state.karen, phoneAt(t)).center), seconds(t)).toBeLessThan(0.01);
  }
});

test("each blow is a strike: the fist swings at least 20 cm and meets the leaf at 1.5 m/s or more", () => {
  for (const at of BANGING.blows) {
    const contact = frameOf(at);
    const start = leftHand(frameOf(at - BLOW.lead)).center;
    const before = leftHand(contact - 1 / FPS).center;
    const hit = leftHand(contact).center;
    expect(start.distanceTo(hit), `swing @${at}`).toBeGreaterThanOrEqual(0.2);
    expect(before.distanceTo(hit) * FPS, `speed @${at}`).toBeGreaterThanOrEqual(1.5);
  }
});

test("at his door she squares up in the beat: from the last two blows on she stands in her wide stance on both feet, as when she rang", () => {
  const standing = footfallOffset(karenAt(KAREN_HOME.side[0] - 0.5), 1);
  for (const t of framesOf([BANGING.blows[4] - 0.3, BANGING.blows[5]]))
    for (const side of [1, -1] as const)
      expect(footfallOffset(karenAt(t), side), `${seconds(t)} foot ${side}`).toBeCloseTo(standing, 2);
});

test("she brings her fist up to bang as she steps up to his door and lowers it after the last blow at an arm's natural pace: her arm never jerks between frames", { timeout: 300_000 }, () => {
  const windows: readonly (readonly [number, number])[] = [
    [BANGING.walk[1] - 1, BANGING.walk[1] + 0.1],
    [BANGING.blows[5] + 0.2, BANGING.blows[5] + 1],
  ];
  for (const [from, to] of windows) {
    expect(armJumpsOver(framesFrom(from, to - from), karenIn(solveKlingelsturm))).toEqual([]);
  }
});

test("raising her fist to his door her arm goes up in one smooth move, past his door knob without catching on it", { timeout: 300_000 }, () => {
  expect(armJumpsOver(framesFrom(BANGING.walk[1] - 0.7, 0.6), karenIn(solveKlingelsturm), [], GENTLE_ARM)).toEqual([]);
});
