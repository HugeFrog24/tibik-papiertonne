import { expect, test } from "vitest";
import { bedroomParts, bedroomSolids, BED_RECT, BEDROOM } from "../building/bedroomShape";
import { contacts, partObb } from "../physics/collision";
import { OUTLINE } from "../toon/primitives";
import { guardGround } from "../physics/guards";
import { solveRundschreiben } from "../scenes/rundschreiben/solve";
import { LYING, LYING_TILT, SITTING, SITTING_EDGE } from "../Tibik/bedPoses";
import { RIG, TIBIK_REST } from "../Tibik/rig";
import { allColliders, bodyColliders, faceDirection, type Placement } from "./skeleton";

const mattress = bedroomParts().find((p) => p.name === "mattress")!;
const bottomOf = (spheres: readonly { center: { y: number }; radius: number }[]) =>
  Math.min(...spheres.map((s) => s.center.y - s.radius));

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
  const sitting = bodyColliders(RIG, { position: [BED_RECT.x0 + 1.0, BEDROOM.floor, BED_RECT.z0 + SITTING_EDGE], rotationY: Math.PI, pose: SITTING });
  expect(Math.abs(bottomOf(sitting.lowerTorso) - BED_RECT.top)).toBeLessThan(0.01);
  expect(bottomOf(sitting.legs)).toBeGreaterThan(BEDROOM.floor + 0.05);
  const knees = sitting.legs.filter((s) => s.name.includes("thigh"));
  for (const k of knees) expect(k.center.y).toBeGreaterThan(BED_RECT.top - 0.05);
});

const grown = <S extends { radius: number }>(spheres: readonly S[]) => spheres.map((s) => ({ ...s, radius: s.radius + OUTLINE / 2 }));
const bedSolids = bedroomSolids({ door: 0, curtain: 0 }).filter((s) => ["mattress", "bed rail", "bed foot rail", "headboard", "pillow"].includes(s.name));

test("sitting at the edge his legs hang over it, clear of the mattress and the bed rail, outlines included", () => {
  const legs = bodyColliders(RIG, { position: [BED_RECT.x0 + 1.0, BEDROOM.floor, BED_RECT.z0 + SITTING_EDGE], rotationY: Math.PI, pose: SITTING }).legs;
  expect(contacts(grown(legs.filter((s) => !s.name.includes("thigh"))), bedSolids).map((c) => `${c.a} / ${c.b}`)).toEqual([]);
});

test("lying with his head on his pillow he rests on pillow and mattress and passes through neither", () => {
  const pillows = bedSolids.filter((s) => s.name === "pillow");
  const ground = [partObb(mattress), ...pillows];
  const start = { skeleton: RIG, position: [BED_RECT.x0 + 1.05, BED_RECT.top - 0.1, (BED_RECT.z0 + BED_RECT.z1) / 2 + 0.39] as [number, number, number], rotationY: Math.PI / 2, pose: LYING, tilt: LYING_TILT };
  const rested = guardGround(start, ground);
  const body = allColliders(RIG, rested);
  expect(Math.max(0, ...contacts(body, ground).map((c) => c.depth))).toBeLessThan(0.002);
  const touching = contacts(body.map((s) => ({ ...s, radius: s.radius + 0.01 })), ground).map((c) => c.b);
  expect(touching).toContain("pillow");
  expect(touching).toContain("mattress");
  expect(faceDirection(RIG, rested).y).toBeGreaterThan(0.85);
});
