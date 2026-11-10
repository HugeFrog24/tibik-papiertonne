import type { Vec3 } from "../../toon/primitives";
import { BED, BED_RECT, BEDROOM, BEDROOM_DOOR, BEDROOM_DOORWAY, CORD_SWITCH, MATTRESS, cordSwitchSolid, curtainPanels } from "../../building/bedroomShape";
import { DOOR_FRAME } from "../../building/doorwayFrame";
import { ROOM_DOOR } from "../../building/doors";
import { Euler, Matrix4, Vector3 } from "three";
import { blinkAt, kf } from "../../characters/animate";
import { STEP_OVERLAP, legOnToes, opposite, rhythmicSteps, strideAt, touchdownTimes, walkCadence, type Step } from "../../characters/gait";
import { blendPose, layerPose } from "../../characters/poseBlend";
import { easeUnit, inWindow, lerp, windowUnit } from "../../characters/scalar";
import { allColliders, armColliders, bodyColliders, type ArmName, type Placement, type Side } from "../../characters/skeleton";
import { contacts, deepest, frame, obb, smallestClearing, sphere } from "../../physics/collision";
import { blendArm } from "../../physics/armDescent";
import { handHold, type Hold } from "../../physics/holds";
import { BLANKET, blanketEdge, blanketSurface } from "../../props/blanketShape";
import { walkFacing, type Walk } from "../../characters/walkPath";
import { BACK_DEPTH, SITTING, SITTING_UP, lyingInBed, settledInBed, sittingOnBed, sittingUpInBed } from "../../Tibik/bedPoses";
import { asCharacter, plantedTibik, tibikGaitOf, type TibikFrame } from "../../Tibik/character";
import { ARM_TUCK, RIG, TIBIK_REST, type TibikPose } from "../../Tibik/rig";
import { walkingPose } from "../../Tibik/walkingArms";
import { OUTLINE } from "../../toon/primitives";
import { FACING_THE_WALL, SHUFFLE, pinEnd, shuffleSpan, shuffleSteps, type ShuffleTiming } from "../enterHouse";
import { BACK_UP, BLANKET_BACK, CURTAIN_PULL, EYES_OPEN, GET_DOWN, ONTO_THE_EDGE, SIT_BACK, LAMP_OFF, LIE_DOWN, MORNING, PULL_OVER, SIT_UP, SWING_IN, SWING_OUT, WALK_ROUND, WALK_TO_BED } from "./timeline";

export const BED_SEAT = sittingOnBed(BED_RECT.x0 + 1.3);

const BACK_GAP = 0.01;
const LIFT_ONTO_IT = 0.15;
const BACKS_UP_BY = 0.14;

const intoTheMattress = (placement: Placement, grow = 0) => {
  const body = bodyColliders(RIG, placement);
  return deepest(contacts([...body.torso, ...body.lowerTorso].map((s) => sphere(s.name, s.center, s.radius + grow)), [MATTRESS]));
};

const withBob = (placement: Placement, bob: number) => ({ ...placement, pose: { ...placement.pose, bob } });

const restingOn = (placement: Placement) =>
  placement.pose.bob + smallestClearing((lift) => intoTheMattress(withBob(placement, placement.pose.bob + lift)), LIFT_ONTO_IT, 0.01);

const backTo = (x: number, z: number, rotationY: number, pose: TibikPose) => ({ position: [x, BEDROOM.floor, z] as [number, number, number], rotationY, pose });

const STAND = {
  x: BED_SEAT.position[0],
  z: BED_RECT.z0 - smallestClearing((d) => intoTheMattress(backTo(BED_SEAT.position[0], BED_RECT.z0 - d, BED_SEAT.rotationY, TIBIK_REST), OUTLINE), 0.6, 0.02) - BACK_GAP,
};
const TURN_SPOT = { x: STAND.x, z: STAND.z - BACKS_UP_BY };
const CLEAR = { latch: BEDROOM_DOORWAY.x0 + DOOR_FRAME.lining, leaf: BEDROOM_DOOR.hinge[0] - ROOM_DOOR.thickness };
const DOORWAY_X = (CLEAR.latch + CLEAR.leaf) / 2;
const TUCKED_UNTIL = BEDROOM.z0 + BACK_DEPTH + 0.1;
const FROM_THE_HALL = 0;
const SIT_BACK_MOVES = { toes: windowUnit(ONTO_THE_EDGE, SIT_BACK), legs: 0.55, perch: 0.06 };
const EVENING_BLINKS = [10.9, 12.9, 14.2, 16.8, 18.1];

const toBed: Walk = {
  from: WALK_TO_BED[0],
  to: WALK_TO_BED[1],
  via: [
    [DOORWAY_X, BEDROOM.z0 - 0.75],
    [DOORWAY_X, BEDROOM.z0 + 1.3],
    [TURN_SPOT.x + 0.7, TURN_SPOT.z],
    [TURN_SPOT.x, TURN_SPOT.z],
  ],
};

const toBedRoot = (t: number) =>
  t < BACK_UP[0]
    ? { ...walkFacing(toBed, t, FACING_THE_WALL, true, FROM_THE_HALL), y: BEDROOM.floor }
    : { x: STAND.x, z: lerp(TURN_SPOT.z, STAND.z, easeUnit(windowUnit(t, BACK_UP))), yaw: FACING_THE_WALL, y: BEDROOM.floor };

export const bedroomFloor = () => BEDROOM.floor;

const toBedSteps = () => {
  const walked = pinEnd(rhythmicSteps({ from: WALK_TO_BED[0], to: WALK_TO_BED[1], first: -1, cadence: walkCadence(toBedRoot), overlap: STEP_OVERLAP }), [TURN_SPOT, TURN_SPOT], FACING_THE_WALL);
  return [...walked, ...shuffleSteps(BACK_UP[0], TURN_SPOT, STAND, opposite(walked[walked.length - 1].side), FACING_THE_WALL, SHUFFLE)];
};

export const toBedGait = tibikGaitOf(toBedRoot, toBedSteps, SIT_BACK[0], bedroomFloor);

const walkingIn = (t: number): TibikFrame => {
  const { x, y, z, yaw } = toBedRoot(t);
  const tucked = 1 - easeUnit((z - TUCKED_UNTIL) / 0.4);
  const pose = { ...TIBIK_REST, blink: blinkAt(t, EVENING_BLINKS), ...walkingPose(t, [WALK_TO_BED], strideAt(toBedGait(), t), tucked) };
  return plantedTibik(toBedGait(), t, { position: [x, y, z], rotationY: yaw, pose });
};

const ASLEEP = [LAMP_OFF + 0.6, LAMP_OFF + 0.9] as const;
const MORNING_BLINKS = [EYES_OPEN[1] + 1.4, EYES_OPEN[1] + 3.9, EYES_OPEN[1] + 6.6, EYES_OPEN[1] + 9.2];

const blinkFor = (t: number) =>
  t < MORNING[0]
    ? Math.max(blinkAt(t, EVENING_BLINKS), kf(t, ASLEEP, [0, 1]))
    : t < EYES_OPEN[1]
      ? kf(t, EYES_OPEN, [1, 0])
      : blinkAt(t, MORNING_BLINKS);

const placed = (
  t: number,
  { position, rotationY, pose, tilt = 0 }: { readonly position: readonly number[]; readonly rotationY: number; readonly pose: TibikPose; readonly tilt?: number | undefined },
): TibikFrame => ({
  position: [position[0], position[1], position[2]],
  rotationY,
  pose: { ...pose, blink: blinkFor(t) },
  holdingBox: false,
  tilt,
});

const standing = () => walkingIn(SIT_BACK[0]);

const finalPlant = (side: Side) => {
  const plants = toBedGait().plants[side === 1 ? "leftLeg" : "rightLeg"];
  return plants[plants.length - 1];
};

const onHisToes = (placement: Placement): TibikPose => ({
  ...placement.pose,
  leftLeg: legOnToes(RIG, placement, 1, finalPlant(1)),
  rightLeg: legOnToes(RIG, placement, -1, finalPlant(-1)),
});

const sitBackAt = (t: number, k: number): TibikFrame => {
  const from = standing();
  const { toes, legs, perch } = SIT_BACK_MOVES;
  const upperAt = (w: number) => blendPose(from.pose, SITTING, easeUnit(w));
  const along = (a: number, b: number, w: number) => backTo(lerp(from.position[0], BED_SEAT.position[0], w), lerp(a, b, w), lerp(from.rotationY, BED_SEAT.rotationY, w), upperAt(k));
  const perchZ = from.position[2] + perch;
  const perchAt = backTo(from.position[0], perchZ, from.rotationY, upperAt(toes));
  const perchBob = restingOn(withBob(perchAt, 0));
  if (k < toes) {
    const u = easeUnit(k / toes);
    const at = along(from.position[2], perchZ, u);
    return placed(t, { ...at, pose: onHisToes(withBob(at, restingOn(withBob(at, lerp(0, perchBob, u))))) });
  }
  const v = (k - toes) / (1 - toes);
  const u = easeUnit(v);
  const at = along(perchZ, BED_SEAT.position[2], u);
  const lifted = withBob(at, restingOn(withBob(at, lerp(perchBob, SITTING.bob, u))));
  const swung = blendPose(onHisToes(withBob(perchAt, perchBob)), SITTING, easeUnit(v / legs));
  return placed(t, { ...lifted, pose: { ...lifted.pose, leftLeg: swung.leftLeg, rightLeg: swung.rightLeg } });
};

const UP = sittingUpInBed(-1);
const IN_BED = lyingInBed(-1);
const SWING = { legs: 0.5, turn: [0.25, 1] as const };

const swingAt = (t: number, k: number): TibikFrame => {
  const turn = easeUnit((k - SWING.turn[0]) / (SWING.turn[1] - SWING.turn[0]));
  return placed(t, {
    position: BED_SEAT.position.map((v, i) => lerp(v, UP.position[i], turn)),
    rotationY: lerp(BED_SEAT.rotationY, UP.rotationY, turn),
    pose: blendPose(SITTING, SITTING_UP, easeUnit(k / SWING.legs)),
  });
};

const PRESS = { lead: 0.37, grip: 0.08, release: 0.12, tail: 0.43 };
const PRESSES = [LAMP_OFF].map((click) => ({ reach: click - PRESS.grip - PRESS.lead, grip: click - PRESS.grip, release: click + PRESS.release, done: click + PRESS.release + PRESS.tail }));
const TOWARD_THE_SWITCH = 0.15;
const twistAt = (t: number) => Math.max(...PRESSES.map((p) => kf(t, [p.reach, p.grip, p.release, p.done], [0, TOWARD_THE_SWITCH, TOWARD_THE_SWITCH, 0])));

const lieAt = (t: number, w: number): TibikFrame =>
  settledInBed(
    placed(t, {
      position: UP.position.map((v, i) => lerp(v, IN_BED.position[i], w)),
      rotationY: UP.rotationY,
      pose: { ...blendPose(SITTING_UP, IN_BED.pose, w), twist: twistAt(t) },
      tilt: lerp(0, IN_BED.tilt, w),
    }),
  );

const layered = (base: TibikFrame, to: TibikFrame, from: TibikFrame): TibikFrame => ({
  ...to,
  position: [0, 1, 2].map((i) => base.position[i] + to.position[i] - from.position[i]) as Vec3,
  rotationY: base.rotationY + to.rotationY - from.rotationY,
  tilt: (base.tilt ?? 0) + (to.tilt ?? 0) - (from.tilt ?? 0),
  pose: layerPose(base.pose, to.pose, from.pose),
});

const evening = (t: number): TibikFrame => {
  if (t < SIT_BACK[0]) return walkingIn(t);
  const sat = sitBackAt(t, windowUnit(t, SIT_BACK));
  const swung = layered(sat, swingAt(t, windowUnit(t, SWING_IN)), swingAt(t, 0));
  return layered(swung, lieAt(t, inWindow(t, LIE_DOWN)), lieAt(t, 0));
};

const drawn = curtainPanels([0, 0])[1];
const FACING_THE_WINDOW = 0;
const STROKE = 0.6;
const FABRIC_PULLED = 0.03;
const CURTAIN_Z = drawn.z - drawn.amplitude - FABRIC_PULLED;
const AT_ARMS_LENGTH = 0.38;
const HAND_STARTS = -0.46;
const PASSING = { bed: 0.42, wall: 0.48 };

export const AT_THE_WINDOW = { x: BED_RECT.x1 + BED.frame + PASSING.bed, z: CURTAIN_Z - AT_ARMS_LENGTH };
export const BY_THE_WALL = { x: BEDROOM.x1 - PASSING.wall, z: AT_THE_WINDOW.z };

const TUCKING = 0.4;
const SIDE_STEPS: ShuffleTiming = { every: 0.5, takes: 0.35, way: [0.5, 0.5, 1, 1] };
const LEADS_TO_THE_WALL: Step["side"] = 1;

const toWindow: Walk = {
  from: WALK_ROUND[0],
  to: WALK_ROUND[1],
  via: [
    [STAND.x, STAND.z],
    [STAND.x + 0.55, TURN_SPOT.z - 0.6],
    [(BED_RECT.x1 + BED.frame + BEDROOM.x1) / 2, TURN_SPOT.z - 0.2],
    [AT_THE_WINDOW.x, AT_THE_WINDOW.z],
  ],
};

const drawnSoFar = (t: number) => easeUnit(inWindow(t, CURTAIN_PULL));

const toWindowRoot = (t: number) =>
  t < CURTAIN_PULL[0]
    ? { ...walkFacing(toWindow, t, FACING_THE_WINDOW, true, FACING_THE_WALL), y: BEDROOM.floor }
    : { x: AT_THE_WINDOW.x + (BY_THE_WALL.x - AT_THE_WINDOW.x) * drawnSoFar(t), z: AT_THE_WINDOW.z, yaw: FACING_THE_WINDOW, y: BEDROOM.floor };

const toWindowSteps = () => {
  const cadence = walkCadence(toWindowRoot);
  const round = (first: Step["side"]) =>
    pinEnd(rhythmicSteps({ from: WALK_ROUND[0], to: WALK_ROUND[1], first, cadence, overlap: STEP_OVERLAP }), [AT_THE_WINDOW, AT_THE_WINDOW], FACING_THE_WINDOW);
  const walked = ([-1, 1] as const).map(round).find((steps) => steps[steps.length - 1].side === opposite(LEADS_TO_THE_WALL))!;
  const sideways = shuffleSteps(CURTAIN_PULL[0] + (CURTAIN_PULL[1] - CURTAIN_PULL[0] - shuffleSpan(0, SIDE_STEPS)[1]) / 2, AT_THE_WINDOW, BY_THE_WALL, LEADS_TO_THE_WALL, FACING_THE_WINDOW, SIDE_STEPS);
  return [...walked, ...sideways];
};

export const toWindowGait = tibikGaitOf(toWindowRoot, toWindowSteps, MORNING[1], bedroomFloor);

const walkingRound = (t: number): TibikFrame => {
  const { x, y, z, yaw } = toWindowRoot(t);
  const walking = { ...TIBIK_REST, blink: blinkFor(t), ...walkingPose(t, [WALK_ROUND], strideAt(toWindowGait(), t)) };
  const pose = { ...walking, leftArm: blendArm(walking.leftArm, ARM_TUCK, inWindow(t, [CURTAIN_PULL[0], CURTAIN_PULL[0] + TUCKING])) };
  return plantedTibik(toWindowGait(), t, { position: [x, y, z], rotationY: yaw, pose });
};

const morning = (t: number): TibikFrame => {
  if (t >= GET_DOWN[1]) return t < WALK_ROUND[0] ? placed(t, standing()) : walkingRound(t);
  const sitting = lieAt(t, 1 - inWindow(t, SIT_UP));
  const swung = layered(sitting, swingAt(t, 1 - windowUnit(t, SWING_OUT)), swingAt(t, 1));
  return layered(swung, sitBackAt(t, 1 - windowUnit(t, GET_DOWN)), sitBackAt(t, 1));
};

export const bedroomAt = (t: number): TibikFrame => (t < MORNING[0] ? evening(t) : morning(t));

export { STAND };

export const ASIDE = 0.68;
export const LAID_EDGE = blanketEdge(BED_RECT, allColliders(RIG, IN_BED), 1);
const ON_THE_BED: readonly [number, number] = [SIT_BACK[0], GET_DOWN[1]];

export const underTheFleece = (t: number, tibik: TibikFrame) => (t >= ON_THE_BED[0] && t <= ON_THE_BED[1] ? allColliders(RIG, asCharacter(tibik)) : []);

export const blanketLie = (covered: number) => ({ cover: 1, aside: ASIDE * (1 - covered), edge: LAID_EDGE });

const middle = IN_BED.position[2];
const TURNED_BACK = [ASIDE, middle + 0.1 - BED_RECT.z0, middle - 0.09 - BED_RECT.z0, middle - 0.26 - BED_RECT.z0, 0];
const covering = (aside: number) => 1 - aside / ASIDE;
const PULL = { right: [0, 0.5], left: [0.65, 1.1] } as const;
const PUSH = { flip: 0.2, left: [0.2, 0.6], right: [0.75, 1.2] } as const;
const pullKeys = [PULL_OVER[0], PULL_OVER[0] + PULL.right[1], PULL_OVER[0] + PULL.left[0], PULL_OVER[0] + PULL.left[1], PULL_OVER[1]];
const pushKeys = [
  BLANKET_BACK[0],
  BLANKET_BACK[0] + PUSH.flip,
  BLANKET_BACK[0] + PUSH.left[1],
  BLANKET_BACK[0] + PUSH.right[0],
  BLANKET_BACK[0] + PUSH.right[1],
];

const BESIDE_HIM =
  Math.max(...allColliders(RIG, UP).map((s) => s.center.z + s.radius)) + BLANKET.clearance + OUTLINE - BED_RECT.z0;

const settled = (lying: number) => lerp(covering(BESIDE_HIM), covering(ASIDE), easeUnit((lying - 0.5) / 0.5));

export const coveredAt = (t: number) => {
  if (t < MORNING[0]) return t < LIE_DOWN[1] ? settled(inWindow(t, LIE_DOWN)) : kf(t, pullKeys, TURNED_BACK.map(covering));
  return t < SIT_UP[0] ? kf(t, pushKeys, [...TURNED_BACK].reverse().map(covering)) : settled(1 - inWindow(t, SIT_UP));
};

const HAND = Math.max(...RIG.hand.size) / 2;
const AT_THE_CHEST = LAID_EDGE + 0.08;
const FROM_OUTSIDE = -(HAND + 0.01);
const FROM_BENEATH = 0;

const foldPoint = (t: number, outside: number) => {
  const { cover, aside, edge } = blanketLie(coveredAt(t));
  const fold = BED_RECT.z0 + aside;
  const placement = bedroomAt(t);
  const arms = new Set([...armColliders(RIG, placement, "leftArm"), ...armColliders(RIG, placement, "rightArm")].map((s) => s.name));
  const body = allColliders(RIG, placement).filter((s) => !arms.has(s.name));
  return new Vector3(AT_THE_CHEST, blanketSurface(BED_RECT, body, { cover, aside, edge })(AT_THE_CHEST, fold) + HAND, fold + outside);
};

const at = (start: number, [from, to]: readonly [number, number]) => [start + from, start + to] as const;

export const PULLING = { right: at(PULL_OVER[0], PULL.right), left: at(PULL_OVER[0], PULL.left) } as const;
export const PUSHING = { left: at(BLANKET_BACK[0], PUSH.left), right: at(BLANKET_BACK[0], PUSH.right) } as const;

const foldHold = (arm: ArmName, window: readonly [number, number], outside: number, what: string): Hold =>
  handHold({
    name: `the blanket's fold in his ${arm === "leftArm" ? "left" : "right"} hand, ${what}`,
    arm,
    window,
    target: (t) => obb("blanket fold", frame(new Matrix4(), foldPoint(t, outside).toArray(), new Euler()), [0.1, 0.01, 0.02]),
    near: (t) => foldPoint(t, outside),
    exact: true,
  });

export const SWITCH_PRESS = new Vector3(CORD_SWITCH.center[0], CORD_SWITCH.center[1] + CORD_SWITCH.size[1] / 2 + HAND, CORD_SWITCH.center[2]);

const switchHold = (press: (typeof PRESSES)[number]): Hold =>
  handHold({
    name: "his lamp's cord switch, pressed",
    arm: "leftArm",
    window: [press.grip, press.release],
    lead: PRESS.lead,
    tail: PRESS.tail,
    target: cordSwitchSolid,
    near: () => SWITCH_PRESS,
  });

export const FOLD_HOLDS = {
  overRight: { ...foldHold("rightArm", PULLING.right, FROM_BENEATH, "drawn over him"), reachAround: true },
  overLeft: { ...foldHold("leftArm", PULLING.left, FROM_OUTSIDE, "drawn over him"), reachAround: true },
  backLeft: foldHold("leftArm", PUSHING.left, FROM_BENEATH, "turned back"),
  backRight: { ...foldHold("rightArm", PUSHING.right, FROM_BENEATH, "turned back"), reachAround: true },
} as const;

export const BEDROOM_HOLDS_IN_BED: readonly Hold[] = [
  FOLD_HOLDS.overRight,
  FOLD_HOLDS.overLeft,
  FOLD_HOLDS.backLeft,
  FOLD_HOLDS.backRight,
  ...PRESSES.map(switchHold),
];

const opened = curtainPanels([0, 1])[1];
const EDGE_TRAVEL = opened.x0 - drawn.x0;

export const CURTAIN_OPENS_TO = STROKE / EDGE_TRAVEL;

export const curtainOpenAt = (t: number) => (STROKE * drawnSoFar(t)) / EDGE_TRAVEL;

const BELOW_HIS_SHOULDER = 0.06;
const GRIP = { height: RIG.hipHeight + RIG.shoulder.y - BELOW_HIS_SHOULDER, size: [0.04, 0.06, 0.01] as const };
const REACH = { lead: 0.35, tail: 0.4 };

export const curtainGrip = (t: number) => {
  const panel = curtainPanels([0, curtainOpenAt(t)])[1];
  const x = AT_THE_WINDOW.x + HAND_STARTS + STROKE * drawnSoFar(t);
  return obb("curtain grip", frame(new Matrix4(), [x, BEDROOM.floor + GRIP.height, panel.z - panel.amplitude - FABRIC_PULLED], new Euler()), [...GRIP.size]);
};

export const MORNING_HOLDS: readonly Hold[] = [
  handHold({
    name: "the near curtain panel in his right hand, drawn as he side-steps along the window",
    arm: "rightArm",
    window: CURTAIN_PULL,
    lead: REACH.lead,
    tail: REACH.tail,
    target: curtainGrip,
    near: (t) => curtainGrip(t).center.clone().add(new Vector3(0, 0, -(GRIP.size[2] / 2 + HAND))),
  }),
];

export const bedroomStepTimes = () => [...touchdownTimes(toBedGait(), SIT_BACK[0]), ...touchdownTimes(toWindowGait(), MORNING[1])];
