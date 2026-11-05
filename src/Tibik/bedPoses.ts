import { Quaternion, Vector3 } from "three";
import { BED } from "../building/bedroomShape";
import { solveLeg } from "../characters/legs";
import { bodyColliders, type Pose, type Side } from "../characters/skeleton";
import { ARM_REST, ARM_TUCK, RIG, TIBIK_REST } from "./rig";


const backDepth = (() => {
  const torso = bodyColliders(RIG, { position: [0, 0, 0], rotationY: 0, pose: TIBIK_REST }).torso;
  return -Math.min(...torso.map((s) => s.center.z - s.radius));
})();

const SIT_LEG = { splay: 0.02, reach: 0.2, drop: 0.1 };
export const SITTING_EDGE = 0.08;
const SIT_LEAN = 0.1;

const seatDrop = (() => {
  const torso = bodyColliders(RIG, { position: [0, 0, 0], rotationY: 0, pose: { ...TIBIK_REST, lean: SIT_LEAN } }).lowerTorso;
  return Math.min(...torso.map((s) => s.center.y - s.radius));
})();
export const LYING_TILT = 1.35;
const LIE_LEG = { splay: 0.04, along: 0.1, heel: 0.06 };

const leg = (side: Side, ankle: Vector3) => solveLeg(RIG, side, ankle, new Quaternion());

const sittingLeg = (side: Side) =>
  leg(side, new Vector3(side * (RIG.hipX + SIT_LEG.splay), RIG.hipHeight - SIT_LEG.drop, SIT_LEG.reach));

const lyingLeg = (side: Side) =>
  leg(side, new Vector3(side * (RIG.hipX + LIE_LEG.splay), RIG.hipHeight - LIE_LEG.along, LIE_LEG.heel - backDepth));

export const SITTING: Pose = {
  ...TIBIK_REST,
  bob: BED.top - seatDrop,
  lean: SIT_LEAN,
  leftArm: ARM_REST,
  rightArm: ARM_REST,
  leftLeg: sittingLeg(1),
  rightLeg: sittingLeg(-1),
};

export const LYING: Pose = {
  ...TIBIK_REST,
  leftArm: ARM_TUCK,
  rightArm: ARM_TUCK,
  leftLeg: lyingLeg(1),
  rightLeg: lyingLeg(-1),
};
