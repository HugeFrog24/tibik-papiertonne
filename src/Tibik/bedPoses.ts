import { Quaternion, Vector3 } from "three";
import { BED, BED_RECT, BEDROOM, PILLOWS, bedroomSolids } from "../building/bedroomShape";
import { guardGround } from "../physics/guards";
import { OUTLINE } from "../toon/primitives";
import { solveLeg } from "../characters/legs";
import { allColliders, bodyColliders, lowestPoint, type Pose, type Side } from "../characters/skeleton";
import { ARM_REST, ARM_TUCK, RIG, TIBIK_REST } from "./rig";


export const BACK_DEPTH = (() => {
  const torso = bodyColliders(RIG, { position: [0, 0, 0], rotationY: 0, pose: TIBIK_REST }).torso;
  return -Math.min(...torso.map((s) => s.center.z - s.radius));
})();

const SIT_LEG = { splay: 0.02, reach: 0.2, drop: 0.1 };
export const SITTING_EDGE = 0.08;
const SIT_LEAN = 0.1;

const seatDrop = lowestPoint(bodyColliders(RIG, { position: [0, 0, 0], rotationY: 0, pose: { ...TIBIK_REST, lean: SIT_LEAN } }).lowerTorso);
const LIE_LEG = { splay: 0.04, along: 0.1, heel: 0.06 };

const leg = (side: Side, ankle: Vector3) => solveLeg(RIG, side, ankle, new Quaternion());

const sittingLeg = (side: Side) =>
  leg(side, new Vector3(side * (RIG.hipX + SIT_LEG.splay), RIG.hipHeight - SIT_LEG.drop, SIT_LEG.reach));

const lyingLeg = (side: Side) =>
  leg(side, new Vector3(side * (RIG.hipX + LIE_LEG.splay), RIG.hipHeight - LIE_LEG.along, LIE_LEG.heel - BACK_DEPTH));

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

export const HEAD_DRAWN = 0.03;
const HEADBOARD_GAP = 0.02;

type Ball = { readonly name: string; readonly center: { readonly x: number; readonly y: number }; readonly radius: number };

const pillowTop = BED_RECT.top + PILLOWS[0].size[1];
const BED_GROUND = bedroomSolids({ door: 0, curtain: [0, 0] }).filter((s) => s.name === "mattress" || s.name === "pillow");
const pillowEnd = PILLOWS[0].center[0] + PILLOWS[0].size[0] / 2;

const probeAt = (tilt: number, x = 0) =>
  allColliders(RIG, { position: [x, 0, 0], rotationY: Math.PI / 2, pose: LYING, tilt }) as readonly Ball[];

const needs = (spheres: readonly Ball[]) => {
  let pillow = -Infinity;
  let mattress = -Infinity;
  for (const s of spheres) {
    const head = s.name === "head" || s.name.includes("eye") || s.name.includes("iris");
    if (s.center.x < pillowEnd) pillow = Math.max(pillow, pillowTop + (head ? HEAD_DRAWN : 0) - (s.center.y - s.radius));
    else mattress = Math.max(mattress, BED_RECT.top - (s.center.y - s.radius));
  }
  return { pillow, mattress };
};

const headX = (tilt: number) => {
  const head = probeAt(tilt).filter((s) => s.name === "head" || s.name.includes("eye") || s.name.includes("iris"));
  return BED_RECT.x0 + HEADBOARD_GAP + HEAD_DRAWN + OUTLINE / 2 - Math.min(...head.map((s) => s.center.x - s.radius));
};

const balance = (tilt: number) => {
  const { pillow, mattress } = needs(probeAt(tilt, headX(tilt)));
  return pillow - mattress;
};

export const LYING_TILT = (() => {
  let [flat, raised] = [Math.PI / 2, 1.2];
  for (let i = 0; i < 40; i++) {
    const mid = (flat + raised) / 2;
    if (balance(mid) > 0) flat = mid;
    else raised = mid;
  }
  return raised;
})();

export const lyingInBed = (side: 1 | -1) => {
  const x = headX(LYING_TILT);
  const { pillow, mattress } = needs(probeAt(LYING_TILT, x));
  const middle = (BED_RECT.z0 + BED_RECT.z1) / 2;
  const onPillow = PILLOWS.find((p) => Math.sign(p.center[2] - middle) === side)!;
  return guardGround(
    {
      skeleton: RIG,
      position: [x, BEDROOM.floor, onPillow.center[2]] as [number, number, number],
      rotationY: Math.PI / 2,
      pose: { ...LYING, bob: Math.max(pillow, mattress) - BEDROOM.floor },
      tilt: LYING_TILT,
    },
    BED_GROUND,
  );
};

export const sittingOnBed = (x: number) => ({
  skeleton: RIG,
  position: [x, BEDROOM.floor, BED_RECT.z0 + SITTING_EDGE] as [number, number, number],
  rotationY: Math.PI,
  pose: SITTING,
});
