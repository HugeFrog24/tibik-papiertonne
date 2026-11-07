import { Vector3 } from "three";
import { expect, test } from "vitest";
import { DOORMATS, doorOfMat, doormatRect, matRise } from "../../building/doormatShape";
import { doorLeaf } from "../../building/doors";
import { CORE, EG_TOP, FLIGHTS, LANE_SPLIT, STAIRWELL_RAILINGS, riserZ } from "../../building/stairwell";
import { allColliders, bodyColliders } from "../../characters/skeleton";
import { onScreen, seenBy } from "../../dialogue/screen";
import { FPS } from "../../frameRate";
import { asKaren } from "../../Karen/character";
import { contacts, obbCorners, sphere, type Sphere } from "../../physics/collision";
import { raySphere } from "../../physics/rays";
import { cigaretteParts, cigaretteTip } from "../../props/cigaretteShape";
import { floorLevel } from "../../street/building";
import { VERTICAL_CROP, ndcX, seconds } from "../sceneChecks";
import { SHOTS, cameraAt } from "./cameras";
import { KLINGELSTURM_DURATION } from "./choreography";
import { ASH, CODA } from "./cigarette";
import { smokedAt } from "./smoking";
import { klingelsturmSolids, solveKlingelsturm } from "./solve";

const FLOOR = floorLevel(1);
const framesIn = (from: number, to: number) => {
  const frames: number[] = [];
  for (let f = Math.ceil(from * FPS - 1e-6); f < to * FPS - 1e-6; f++) frames.push(f / FPS);
  return frames;
};
const INSERT = () => SHOTS.find((s) => s.name === "Insert: the ash")!;

const tipAt = (t: number) => {
  const { cigarette } = solveKlingelsturm(t);
  return cigaretteTip(cigarette!.frame, cigarette!.burned);
};

const piecePoints = (t: number) =>
  (solveKlingelsturm(t).ash ?? []).flatMap((piece) =>
    [-0.5, 0, 0.5].map((k) => new Vector3(0, 0, k * piece.length).applyQuaternion(piece.rotation).add(piece.center)).map((center) => ({ center, radius: piece.radius })),
  );

test("after her dark exhale she holds the cigarette out from her body and taps it twice with a flick of her wrist; the ash breaks off at the bottom of the first", () => {
  expect(CODA.aside[0]).toBeGreaterThanOrEqual(CODA.darkExhale[1]);
  expect(CODA.taps).toHaveLength(2);
  const rest = tipAt(CODA.taps[0][0]).y;
  for (const [from, to] of CODA.taps) {
    const lowest = Math.min(...framesIn(from, to).map((t) => tipAt(t).y));
    expect(rest - lowest, `tap at ${from}`).toBeGreaterThan(0.01);
    expect(Math.abs(tipAt(to).y - rest), `back after the tap at ${from}`).toBeLessThan(0.005);
  }
  expect(CODA.ashOff).toBeGreaterThan(CODA.taps[0][0]);
  expect(CODA.ashOff).toBeLessThan(CODA.taps[0][1]);
  expect(smokedAt(CODA.ashOff - 1 / FPS).ash).toBeCloseTo(ASH.hold, 4);
  expect(smokedAt(CODA.ashOff).ash).toBeLessThan(0.0005);
  expect(smokedAt(KLINGELSTURM_DURATION - 1 / FPS).ash).toBeLessThan(0.0005);
});

test("the ash leaves the cigarette where it broke off and falls under gravity onto the landing floor, through nothing on the way: not her, not the balustrade, not the stairs", () => {
  expect(solveKlingelsturm(CODA.ashOff - 1 / FPS).ash).toBeNull();
  const { cigarette, ash } = solveKlingelsturm(CODA.ashOff);
  const { emberAt } = cigaretteParts({ burned: cigarette!.burned, ash: ASH.hold });
  const onTheCigarette = new Vector3(0, 0, emberAt + ASH.hold / 2).applyMatrix4(cigarette!.frame);
  expect(ash![0].center.distanceTo(onTheCigarette)).toBeLessThan(0.001);
  const frames = framesIn(CODA.ashOff, KLINGELSTURM_DURATION);
  const heights = frames.map((t) => solveKlingelsturm(t).ash![0].center.y);
  heights.slice(1).forEach((y, i) => expect(y, seconds(frames[i + 1])).toBeLessThanOrEqual(heights[i] + 1e-9));
  const landed = frames.find((t) => solveKlingelsturm(t).ash![0].center.y - solveKlingelsturm(t).ash![0].radius < FLOOR + 0.0005)!;
  expect(landed - CODA.ashOff).toBeGreaterThan(0.3);
  expect(landed - CODA.ashOff).toBeLessThan(0.6);
  const problems = frames.flatMap((t) => {
    const state = solveKlingelsturm(t);
    const spheres = piecePoints(t).map((p, i) => sphere(`ash ${i}`, p.center, p.radius));
    const solids = [...klingelsturmSolids(state), ...allColliders(asKaren(state.karen).skeleton, asKaren(state.karen))];
    return contacts(spheres, solids)
      .filter((c) => c.depth > 0.0003)
      .map((c) => `${seconds(t)}: ${c.a} ${(c.depth * 1000).toFixed(1)} mm into ${c.b}`);
  });
  expect(problems.slice(0, 6)).toEqual([]);
  const lying = solveKlingelsturm(KLINGELSTURM_DURATION - 1 / FPS).ash!;
  expect(lying.length).toBeGreaterThan(2);
  for (const piece of lying) {
    expect(piece.center.y - piece.radius).toBeCloseTo(FLOOR, 3);
    expect(matRise(piece.center.x, piece.center.z, FLOOR)).toBe(0);
    expect(piece.center.z < EG_TOP - 0.05 || piece.center.x > LANE_SPLIT + 0.05, `${piece.center.toArray()}`).toBe(true);
  }
});

const hiddenBy = (eye: Vector3, target: Vector3, blockers: readonly Sphere[]) => {
  const reach = eye.distanceTo(target) - 0.01;
  const along = target.clone().sub(eye).normalize();
  return blockers.some((s) => raySphere(eye, along, s) < reach);
};

const pixelsBetween = (a: Vector3, b: Vector3, t: number) => {
  const [ax, ay] = onScreen(a, cameraAt(t));
  const [bx, by] = onScreen(b, cameraAt(t));
  return Math.hypot(ax - bx, ay - by);
};

const HIS_MAT = DOORMATS.find((m) => m.storey === 1 && m.side === "links")!;
const HIS_MAT_RECT = doormatRect(HIS_MAT);

test("the ash flies off with the flick's own speed, not the hold's small corrections: it lands within 3 cm sideways of where it broke off", () => {
  const [released] = solveKlingelsturm(CODA.ashOff).ash!;
  const [landed] = solveKlingelsturm(KLINGELSTURM_DURATION - 1 / FPS).ash!;
  expect(Math.hypot(landed.center.x - released.center.x, landed.center.z - released.center.z)).toBeLessThan(0.03);
});

const STAIRWELL_MARKS = [
  ...STAIRWELL_RAILINGS.filter((r) => r.name === "balustrade").flatMap(obbCorners),
  ...obbCorners(doorLeaf(doorOfMat(HIS_MAT), 0)),
  ...[HIS_MAT_RECT.x0, HIS_MAT_RECT.x1].flatMap((x) => [HIS_MAT_RECT.z0, HIS_MAT_RECT.z1].map((z) => new Vector3(x, HIS_MAT_RECT.y, z))),
  ...[14, 15, 16].map((k) => new Vector3((CORE.x0 + LANE_SPLIT) / 2, FLIGHTS[0].from + (k + 1) * FLIGHTS[0].rise, riserZ(FLIGHTS[0], k))),
].filter((p) => Math.abs(p.y - FLOOR) < 1.2 && p.distanceTo(new Vector3(-1.9, FLOOR, -8.7)) < 2.5);

test("the insert shows her fist and its ember up close against the stairwell, never her face, then follows the ash down onto the landing floor, all within the 9:16 centre band", () => {
  const insert = INSERT();
  expect(insert).toBeDefined();
  expect(insert.from).toBe(CODA.aside[0]);
  expect(insert.to).toBe(KLINGELSTURM_DURATION);
  expect(STAIRWELL_MARKS.length).toBeGreaterThan(3);
  const problems = framesIn(insert.from, insert.to).flatMap((t) => {
    const setup = cameraAt(t);
    const state = solveKlingelsturm(t);
    const karen = asKaren(state.karen);
    const found: string[] = [];
    const head = bodyColliders(karen.skeleton, karen).head.flatMap((s) =>
      [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0, 0, 0]].map(([x, y, z]) => s.center.clone().add(new Vector3(x, y, z).multiplyScalar(s.radius))),
    );
    if (head.some((p) => seenBy(p, setup, 0))) found.push(`${seconds(t)}: her head is in frame`);
    const eye = new Vector3(...setup.position);
    const blockers = allColliders(karen.skeleton, karen).filter((s) => !s.name.includes("hand"));
    if (!STAIRWELL_MARKS.some((p) => seenBy(p, setup, 0.02) && !hiddenBy(eye, p, blockers))) found.push(`${seconds(t)}: no stairwell in view past her`);
    if (t < CODA.ashOff) {
      const tip = tipAt(t);
      const hand = new Vector3().setFromMatrixPosition(state.cigarette!.frame);
      if (!seenBy(tip, setup, 0.1) || !seenBy(hand, setup, 0.1)) found.push(`${seconds(t)}: fist or ember off screen`);
      if (hiddenBy(eye, tip, blockers) || hiddenBy(eye, hand, blockers)) found.push(`${seconds(t)}: her body hides her fist or the ember`);
      if (new Vector3(...setup.position).distanceTo(hand) > 1.5) found.push(`${seconds(t)}: not close on her fist`);
      if (Math.abs(ndcX(tip, cameraAt(t))) > VERTICAL_CROP) found.push(`${seconds(t)}: ember outside the 9:16 band`);
    } else {
      for (const piece of state.ash!) {
        if (!seenBy(piece.center, setup, 0.05)) found.push(`${seconds(t)}: the ash off screen`);
        if (hiddenBy(eye, piece.center, blockers)) found.push(`${seconds(t)}: her body hides the ash`);
        if (Math.abs(ndcX(piece.center, cameraAt(t))) > VERTICAL_CROP) found.push(`${seconds(t)}: the ash outside the 9:16 band`);
      }
    }
    return found;
  });
  expect(problems.slice(0, 8)).toEqual([]);
  const last = KLINGELSTURM_DURATION - 1 / FPS;
  const ends = solveKlingelsturm(last).ash!.flatMap((piece) => [1, -1].map((k) => piece.center.clone().add(new Vector3(0, 0, (k * piece.length) / 2).applyQuaternion(piece.rotation))));
  expect(Math.max(...ends.flatMap((a) => ends.map((b) => pixelsBetween(a, b, last))))).toBeGreaterThan(30);
});
