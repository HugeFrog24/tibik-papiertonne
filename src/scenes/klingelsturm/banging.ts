import { Vector3 } from "three";
import { doorFrame, doorLeaf } from "../../building/doors";
import { TIBIK_DOOR, doorLanding, landingNormal } from "../../building/stairwell";
import { round6 } from "../../characters/scalar";
import type { ArmPose } from "../../characters/skeleton";
import { FPS } from "../../frameRate";
import { KAREN_SKELETON } from "../../Karen/rig";
import type { Hold } from "../../physics/holds";
import { floorLevel } from "../../street/building";

export const LATER_FRAMES = 207;

export const LATER = LATER_FRAMES / FPS;

export const later = (t: number) => round6(t + LATER);

export const BANGING = {
  tuck: [29.4, 29.8] as const,
  wideCut: 29.6,
  turn: [29.6, 30.2] as const,
  walk: [29.6, 31.2] as const,
  blows: [31.4, 31.8, 32.2, 32.6, 33.6, 34.0] as const,
  flurCut: [33.2, 35.2] as const,
  back: [34.2, 35.8] as const,
  turnBack: [34.3, 35.2] as const,
  raise: [35.8, 36.2] as const,
  dial: later(29.7),
};

export const BLOW = { height: 1.35, fromLatchEdge: 0.08, lead: 0.2, tail: 0.17, aside: 0 };

export const SHIVER = { edge: 0.002, settle: 0.1 };

export const BANG_READY: ArmPose = { raise: 1.7, out: 0.5, elbow: 2.3, inward: 0.3 };

const BLOW_ARM: ArmPose = { raise: 1.44, out: 0.55, elbow: 1.82, inward: 0.75 };

const shiverOf = (u: number) => (u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0);

export const doorShiverAt = (t: number) =>
  BANGING.blows.reduce(
    (sum, at) => sum + (SHIVER.edge / TIBIK_DOOR.width) * shiverOf((t - at) / SHIVER.settle),
    0,
  );

const leafFrame = (t: number) => doorFrame(TIBIK_DOOR, doorShiverAt(t));

export const blowPoint = (t: number): Vector3 =>
  new Vector3(
    TIBIK_DOOR.width - BLOW.fromLatchEdge,
    floorLevel(1) + BLOW.height - TIBIK_DOOR.hinge[1],
    (doorLanding(TIBIK_DOOR) * TIBIK_DOOR.thickness) / 2,
  ).applyMatrix4(leafFrame(t));


const HAND_RADIUS = Math.max(...KAREN_SKELETON.hand.size);

const ON_THE_LEAF = -0.001;

const swingingIn = (u: number) => u * u;

export const BLOW_HOLDS: readonly Hold[] = BANGING.blows.map((at, i) => ({
  name: `her fist on his door, blow ${i + 1}`,
  arm: "leftArm",
  reach: round6(at - BLOW.lead),
  grip: at,
  release: round6(at + 1 / FPS),
  done: round6(at + BLOW.tail),
  target: (t: number) => doorLeaf(TIBIK_DOOR, doorShiverAt(t)),
  near: (t: number) => blowPoint(t).addScaledVector(landingNormal(TIBIK_DOOR, doorShiverAt(t)), HAND_RADIUS + ON_THE_LEAF),
  pose: BLOW_ARM,
  exact: true,
  approach: swingingIn,
}));
