import { Vector3 } from "three";
import { HANDRAIL, STAIRWELL_RAILINGS, stairwellSolids } from "../../building/stairwell";
import { armColliders, type ArmPose } from "../../characters/skeleton";
import { sphereObbGap, type Contact, type Solid } from "../../physics/collision";
import { reachArm } from "../../physics/grip";
import { characterViolations, guardArm, guardLean } from "../../physics/guards";
import { memoByFrame } from "../../physics/memoSolve";
import { worldSolids } from "../../street/layout";
import { RIG } from "../../Tibik/rig";
import type { TibikFrame } from "../papiertonnen/choreography";
import { asCharacter, solvePapiertonnen } from "../papiertonnen/solve";
import { RAIL_SPAN, STORY_END, haustuerAt, lightsAt, tibikAt, tibikDoorAt } from "./choreography";

export type TreppenhausState = {
  readonly tibik: TibikFrame;
  readonly tibikDoor: number;
  readonly haustuer: number;
  readonly lights: number;
};

const EG_RAIL = STAIRWELL_RAILINGS.filter((r) => r.name === "handrail")[0];
const EG_RAIL_LINE = HANDRAIL[0];

const solidsFor = (tibikDoor: number, haustuer: number): Solid[] => [
  ...worldSolids(solvePapiertonnen(0).lids, haustuer),
  ...stairwellSolids({ tibik: tibikDoor }),
];

const RAIL_GRIPS: ArmPose[] = [
  { raise: 2.8, out: 0.9, elbow: 1.5, inward: 0.1 },
  { raise: 2.4, out: 1.0, elbow: 1.6, inward: 0.0 },
  { raise: 2.6, out: 0.7, elbow: 1.3, inward: 0.2 },
];
const OFF_WALL = new Vector3(0.008, 0, 0);
const RAIL_END = 0.03;

const onRail = (t: number) => t >= RAIL_SPAN[0] && t <= RAIL_SPAN[1];

const railTarget = (tibik: TibikFrame) => {
  const shoulder = armColliders(RIG, asCharacter(tibik), "rightArm")[0].center;
  const from = new Vector3(...EG_RAIL_LINE.from);
  const to = new Vector3(...EG_RAIL_LINE.to);
  const along = to.clone().sub(from);
  const u = Math.min(1 - RAIL_END, Math.max(RAIL_END, shoulder.clone().sub(from).dot(along) / along.lengthSq()));
  const handRadius = Math.max(...RIG.hand.size);
  const direction = along.clone().normalize();
  const up = new Vector3(0, 1, 0);
  const normal = up.clone().addScaledVector(direction, -up.dot(direction)).normalize();
  return from.addScaledVector(along, u).addScaledVector(normal, 0.025 + handRadius).add(OFF_WALL);
};

const solve = (t: number): TreppenhausState => {
  const tibikDoor = tibikDoorAt(t);
  const haustuer = haustuerAt(t);
  const solids = solidsFor(tibikDoor, haustuer);
  let tibik = asCharacter(tibikAt(t));
  tibik = guardLean(tibik, solids);
  tibik = guardArm(tibik, solids, "leftArm");
  tibik = onRail(t)
    ? reachArm(tibik, "rightArm", { touch: EG_RAIL, near: railTarget(tibik) }, solids, null, RAIL_GRIPS)
    : guardArm(tibik, solids, "rightArm");
  const { position, rotationY, pose, holdingBox } = tibik;
  return { tibik: { position, rotationY, pose, holdingBox }, tibikDoor, haustuer, lights: lightsAt(t) };
};

export const solveTreppenhaus = memoByFrame(solve);

export const treppenhausEnd = () => solveTreppenhaus(STORY_END);

export const treppenhausSolids = (state: TreppenhausState): Solid[] => solidsFor(state.tibikDoor, state.haustuer);

export const treppenhausViolations = (state: TreppenhausState): Contact[] =>
  characterViolations(asCharacter(state.tibik), treppenhausSolids(state));

export const railGap = (state: TreppenhausState) => {
  const spheres = armColliders(RIG, asCharacter(state.tibik), "rightArm");
  return sphereObbGap(spheres[spheres.length - 1], EG_RAIL);
};
