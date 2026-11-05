import { expect, test } from "vitest";
import { bedroomParts, bedroomSolids, BED_RECT, BEDROOM, PILLOWS } from "../building/bedroomShape";
import { contacts, partObb } from "../physics/collision";
import { OUTLINE } from "../toon/primitives";
import { guardGround } from "../physics/guards";
import { solveRundschreiben } from "../scenes/rundschreiben/solve";
import { HEAD_DRAWN, LYING, lyingInBed, sittingOnBed } from "../Tibik/bedPoses";
import { RIG, TIBIK_REST } from "../Tibik/rig";
import { allColliders, bodyColliders, faceDirection, lowestPoint, type Placement } from "./skeleton";

const mattress = bedroomParts().find((p) => p.name === "mattress")!;
const bottomOf = lowestPoint;

test("untilted, every collider is exactly where it was", () => {
  const walking = solveRundschreiben(1.5).tibik;
  const frames: Placement[] = [
    { position: walking.position, rotationY: walking.rotationY, pose: walking.pose },
    { position: [1, 0, -2], rotationY: 0.7, pose: TIBIK_REST },
  ];
  for (const placement of frames) {
    expect(allColliders(RIG, { ...placement, tilt: 0 })).toEqual(allColliders(RIG, placement));
    expect(faceDirection(RIG, { ...placement, tilt: 0 })).toEqual(faceDirection(RIG, placement));
  }
});

test("tilted a quarter turn he lies on his back", () => {
  const body = bodyColliders(RIG, { position: [0, 0, 0], rotationY: Math.PI / 2, pose: LYING, tilt: Math.PI / 2 });
  const head = body.head[0].center;
  const hip = body.lowerTorso[0].center;
  expect(Math.abs(head.y - hip.y)).toBeLessThan(0.05);
  expect(head.x).toBeLessThan(hip.x);
  expect(faceDirection(RIG, { position: [0, 0, 0], rotationY: Math.PI / 2, pose: LYING, tilt: Math.PI / 2 }).y).toBeGreaterThan(0.9);
});

const lying = (sunk: number): Placement & { skeleton: typeof RIG } => {
  const probe = allColliders(RIG, { position: [0, 0, 0], rotationY: Math.PI / 2, pose: LYING, tilt: Math.PI / 2 });
  const lift = BED_RECT.top - bottomOf(probe) - sunk;
  return {
    skeleton: RIG,
    position: [BED_RECT.x0 + 1.0, lift, (BED_RECT.z0 + BED_RECT.z1) / 2],
    rotationY: Math.PI / 2,
    pose: LYING,
    tilt: Math.PI / 2,
  };
};

test("lying on the mattress he rests on it, neither sunk in nor floating", () => {
  for (const sunk of [0.02, 0.06]) {
    const rested = guardGround(lying(sunk), partObb(mattress));
    expect(Math.abs(bottomOf(allColliders(RIG, rested)) - BED_RECT.top), `sunk ${sunk}`).toBeLessThan(0.01);
  }
});

test("lying on his back his heels rest on the mattress as his back does, not held up in the air", () => {
  const rested = guardGround(lying(0.03), partObb(mattress));
  const heels = bottomOf(bodyColliders(RIG, rested).legs) - BED_RECT.top;
  expect(heels).toBeGreaterThanOrEqual(-0.005);
  expect(heels).toBeLessThan(0.025);
});

test("sitting on the bed's edge his seat rests on the mattress and his short legs hang free of the floor", () => {
  const sitting = bodyColliders(RIG, sittingOnBed(BED_RECT.x0 + 1.3));
  expect(Math.abs(bottomOf(sitting.lowerTorso) - BED_RECT.top)).toBeLessThan(0.01);
  expect(bottomOf(sitting.legs)).toBeGreaterThan(BEDROOM.floor + 0.05);
  const knees = sitting.legs.filter((s) => s.name.includes("thigh"));
  for (const k of knees) expect(k.center.y).toBeGreaterThan(BED_RECT.top - 0.05);
});

const grown = <S extends { radius: number }>(spheres: readonly S[]) => spheres.map((s) => ({ ...s, radius: s.radius + OUTLINE / 2 }));
const bedSolids = bedroomSolids({ door: 0, curtain: 0 }).filter((s) => ["mattress", "bed rail", "bed foot rail", "headboard", "pillow"].includes(s.name));

test("sitting at the edge his legs hang over it, clear of the mattress and the bed rail, outlines included", () => {
  const legs = bodyColliders(RIG, sittingOnBed(BED_RECT.x0 + 1.3)).legs;
  expect(contacts(grown(legs.filter((s) => !s.name.includes("thigh"))), bedSolids).map((c) => `${c.a} / ${c.b}`)).toEqual([]);
});

const headboard = bedSolids.find((s) => s.name === "headboard")!;
const pillows = bedSolids.filter((s) => s.name === "pillow");
const pillowTop = BED_RECT.top + PILLOWS[0].size[1];

test("in bed his head rests on his pillow and his back on the mattress, the drawn head clear of the headboard", () => {
  for (const side of [1, -1] as const) {
    const inBed = lyingInBed(side);
    const body = bodyColliders(RIG, inBed);
    const rest = [...body.torso, ...body.legs, ...body.leftArm, ...body.rightArm];
    expect(Math.max(0, ...contacts(allColliders(RIG, inBed), [partObb(mattress), ...pillows]).map((c) => c.depth)), `side ${side}`).toBeLessThan(0.002);
    const headGap = bottomOf(body.head) - pillowTop;
    expect(headGap).toBeGreaterThanOrEqual(HEAD_DRAWN - 0.002);
    expect(headGap).toBeLessThan(HEAD_DRAWN + 0.02);
    expect(bottomOf(rest) - BED_RECT.top).toBeGreaterThanOrEqual(-0.002);
    expect(bottomOf(rest) - BED_RECT.top).toBeLessThan(0.03);
    const face = headboard.kind === "obb" ? headboard.center.x + headboard.half[0] : 0;
    for (const s of body.head) expect(s.center.x - s.radius - HEAD_DRAWN - OUTLINE / 2, s.name).toBeGreaterThanOrEqual(face);
    expect(faceDirection(RIG, inBed).y).toBeGreaterThan(0.95);
    const heads = body.head.filter((s) => s.name === "head");
    const headZ = heads.reduce((sum, s) => sum + s.center.z, 0) / heads.length;
    expect(Math.abs(headZ - (BED_RECT.z0 + BED_RECT.z1) / 2 - side * 0.39)).toBeLessThan(0.1);
  }
});

test("a sideways touch never lifts him while he lies: pressed to the headboard he is not raised off the mattress", () => {
  const start = { ...lyingInBed(1), position: [lyingInBed(1).position[0] - 0.08, lyingInBed(1).position[1], lyingInBed(1).position[2]] as [number, number, number] };
  const without = guardGround(start, [partObb(mattress), ...pillows]);
  const against = guardGround(start, [partObb(mattress), ...pillows, headboard]);
  expect(against.pose.bob).toBeCloseTo(without.pose.bob, 6);
});

test("sitting on the bed's edge past the pillows, nothing of him passes into a pillow, the headboard or the rail, outlines included", () => {
  const sitting = sittingOnBed(BED_RECT.x0 + 1.3);
  const body = bodyColliders(RIG, sitting);
  const others = bedSolids.filter((s) => s.name !== "mattress");
  expect(contacts(grown([...body.torso, ...body.head, ...body.leftArm, ...body.rightArm, ...body.legs]), others).map((c) => `${c.a} / ${c.b}`)).toEqual([]);
  expect(Math.abs(bottomOf(body.lowerTorso) - BED_RECT.top)).toBeLessThan(0.01);
  expect(sitting.position[1]).toBe(BEDROOM.floor);
});
