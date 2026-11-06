import { BED, BED_RECT, BEDROOM, BEDROOM_DOOR, BEDROOM_DOORWAY, CORD_SWITCH, cordSwitchSolid, curtainPanels } from "../../building/bedroomShape";
import { DOOR_FRAME } from "../../building/doorwayFrame";
import { ROOM_DOOR } from "../../building/doors";
import { Euler, Matrix4, Vector3 } from "three";
import { blinkAt, kf } from "../../characters/animate";
import { STEP_OVERLAP, rhythmicSteps, strideAt, touchdownTimes, walkCadence, type RootAt } from "../../characters/gait";
import { blendPose } from "../../characters/poseBlend";
import { easeUnit, inWindow, lerp, windowUnit } from "../../characters/scalar";
import { allColliders, armColliders, type ArmName } from "../../characters/skeleton";
import { frame, obb } from "../../physics/collision";
import { handHold, type Hold } from "../../physics/holds";
import { BLANKET, blanketEdge, blanketSurface } from "../../props/blanketShape";
import { walkFacing, type Walk } from "../../characters/walkPath";
import { BACK_DEPTH, SITTING, SITTING_UP, lyingInBed, settledInBed, sittingOnBed, sittingUpInBed } from "../../Tibik/bedPoses";
import { plantedTibik, tibikGaitOf, type TibikFrame } from "../../Tibik/character";
import { RIG, TIBIK_REST, type TibikPose } from "../../Tibik/rig";
import { walkingOn, walkingPose } from "../../Tibik/walkingArms";
import { OUTLINE } from "../../toon/primitives";
import { FACING_THE_WALL, pinEnd, type Stand } from "../enterHouse";
import { BLANKET_BACK, CURTAIN_PULLS, EYES_OPEN, HOP_DOWN, HOP_UP, LAMP_OFF, LIE_DOWN, MORNING, PULL_OVER, SIT_UP, SWING_IN, SWING_OUT, WALK_ROUND, WALK_TO_BED } from "./timeline";

export const BED_SEAT = sittingOnBed(BED_RECT.x0 + 1.3);

const STAND = { x: BED_SEAT.position[0], z: BED_RECT.z0 - BED.frame - BACK_DEPTH - OUTLINE - 0.02 };
const CLEAR = { latch: BEDROOM_DOORWAY.x0 + DOOR_FRAME.lining, leaf: BEDROOM_DOOR.hinge[0] - ROOM_DOOR.thickness };
const DOORWAY_X = (CLEAR.latch + CLEAR.leaf) / 2;
const TUCKED_UNTIL = BEDROOM.z0 + BACK_DEPTH + 0.1;
const FROM_THE_HALL = 0;
const HOP = { rise: 0.55, back: [0.3, 1] as const };
const EVENING_BLINKS = [10.9, 12.9, 14.2, 16.8, 18.1];

const toBed: Walk = {
  from: WALK_TO_BED[0],
  to: WALK_TO_BED[1],
  via: [
    [DOORWAY_X, BEDROOM.z0 - 0.75],
    [DOORWAY_X, BEDROOM.z0 + 0.9],
    [STAND.x + 0.7, STAND.z],
    [STAND.x, STAND.z],
  ],
};

const toBedRoot = (t: number) => ({ ...walkFacing(toBed, t, FACING_THE_WALL, true, FROM_THE_HALL), y: BEDROOM.floor });

const floorAt = () => BEDROOM.floor;

const legGait = (root: RootAt, leg: readonly [number, number], stands: readonly Stand[], facing: number, until: number) =>
  tibikGaitOf(
    root,
    () => pinEnd(rhythmicSteps({ from: leg[0], to: leg[1], first: -1, cadence: walkCadence(root), overlap: STEP_OVERLAP }), stands, facing),
    until,
    floorAt,
  );

const toBedGait = legGait(toBedRoot, WALK_TO_BED, [STAND, STAND], FACING_THE_WALL, HOP_UP[0]);

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
  { position, rotationY, pose, tilt = 0 }: { readonly position: readonly number[]; readonly rotationY: number; readonly pose: TibikPose; readonly tilt?: number },
): TibikFrame => ({
  position: [position[0], position[1], position[2]],
  rotationY,
  pose: { ...pose, blink: blinkFor(t) },
  holdingBox: false,
  tilt,
});

const standing = () => walkingIn(HOP_UP[0]);

const hopAt = (t: number, k: number): TibikFrame => {
  const from = standing();
  const back = easeUnit((k - HOP.back[0]) / (HOP.back[1] - HOP.back[0]));
  return placed(t, {
    position: [lerp(from.position[0], BED_SEAT.position[0], back), BEDROOM.floor, lerp(from.position[2], BED_SEAT.position[2], back)],
    rotationY: BED_SEAT.rotationY,
    pose: { ...blendPose(from.pose, SITTING, easeUnit(k)), bob: lerp(from.pose.bob, SITTING.bob, easeUnit(k / HOP.rise)) },
  });
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

const evening = (t: number): TibikFrame =>
  t < HOP_UP[0]
    ? walkingIn(t)
    : t < HOP_UP[1]
      ? hopAt(t, windowUnit(t, HOP_UP))
      : t < SWING_IN[0]
        ? placed(t, BED_SEAT)
        : t < SWING_IN[1]
          ? swingAt(t, windowUnit(t, SWING_IN))
          : t < LIE_DOWN[0]
            ? placed(t, UP)
            : lieAt(t, inWindow(t, LIE_DOWN));

const drawn = curtainPanels([0, 0])[1];
const FACING_THE_STACK = Math.PI / 2;
const GRIP_AHEAD = 0.02;
const STROKE = 0.25;
const SIDE_REACH = RIG.shoulder.x + 0.42;
const FABRIC_PULLED = 0.03;

export const CORNER = {
  x: (BED_RECT.x1 + BED.frame + BEDROOM.x1) / 2,
  z: drawn.z - drawn.amplitude - FABRIC_PULLED - SIDE_REACH,
};

const toWindow: Walk = {
  from: WALK_ROUND[0],
  to: WALK_ROUND[1],
  via: [
    [STAND.x, STAND.z],
    [STAND.x + 0.4, STAND.z - 0.6],
    [(BED_RECT.x1 + BED.frame + BEDROOM.x1) / 2, STAND.z - 0.2],
    [CORNER.x, CORNER.z],
  ],
};

const toWindowRoot = (t: number) => ({ ...walkFacing(toWindow, t, FACING_THE_STACK, true, FACING_THE_WALL), y: BEDROOM.floor });

const toWindowGait = legGait(toWindowRoot, WALK_ROUND, [CORNER, CORNER], FACING_THE_STACK, MORNING[1]);

const walkingRound = (t: number): TibikFrame => {
  const { x, y, z, yaw } = toWindowRoot(t);
  const inTheGap = easeUnit((x - (BED_RECT.x1 + BED.frame)) / 0.4) * Math.max(...walkingOn(t, [WALK_ROUND]));
  const pose = { ...TIBIK_REST, blink: blinkFor(t), ...walkingPose(t, [WALK_ROUND], strideAt(toWindowGait(), t), inTheGap) };
  return plantedTibik(toWindowGait(), t, { position: [x, y, z], rotationY: yaw, pose });
};

const morning = (t: number): TibikFrame =>
  t < SIT_UP[0]
    ? lieAt(t, 1)
    : t < SIT_UP[1]
      ? lieAt(t, 1 - inWindow(t, SIT_UP))
      : t < SWING_OUT[0]
        ? placed(t, UP)
        : t < SWING_OUT[1]
          ? swingAt(t, 1 - windowUnit(t, SWING_OUT))
          : t < HOP_DOWN[0]
            ? placed(t, BED_SEAT)
            : t < HOP_DOWN[1]
              ? hopAt(t, 1 - windowUnit(t, HOP_DOWN))
              : t < WALK_ROUND[0]
                ? placed(t, standing())
                : walkingRound(t);

export const bedroomAt = (t: number): TibikFrame => (t < MORNING[0] ? evening(t) : morning(t));

export { STAND };

export const ASIDE = 0.68;
export const LAID_EDGE = blanketEdge(BED_RECT, allColliders(RIG, IN_BED), 1);
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

const foldHold = (arm: ArmName, window: readonly [number, number], outside: number): Hold =>
  handHold({
    name: `the turned-back blanket's fold in his ${arm === "leftArm" ? "left" : "right"} hand`,
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

export const BEDROOM_HOLDS_IN_BED: readonly Hold[] = [
  foldHold("rightArm", PULLING.right, FROM_BENEATH),
  foldHold("leftArm", PULLING.left, FROM_OUTSIDE),
  foldHold("leftArm", PUSHING.left, FROM_BENEATH),
  foldHold("rightArm", PUSHING.right, FROM_BENEATH),
  ...PRESSES.map(switchHold),
];

const opened = curtainPanels([0, 1])[1];
const EDGE_TRAVEL = opened.x0 - drawn.x0;
const TAKES_HOLD = CORNER.x + GRIP_AHEAD;

export const CURTAIN_OPENS_TO = (STROKE * CURTAIN_PULLS.length) / EDGE_TRAVEL;

const pulled = (t: number) => CURTAIN_PULLS.reduce((sum, pull) => sum + inWindow(t, pull), 0);

export const curtainOpenAt = (t: number) => (STROKE * pulled(t)) / EDGE_TRAVEL;

const GRIP = { height: 1, size: [0.04, 0.06, 0.01] as const };
const REACH_BACK = { first: 0.35, again: 0.25 };
const LET_GO = { between: 0.2, last: 0.4 };

const gripOf = (k: number) => (t: number) => {
  const panel = curtainPanels([0, curtainOpenAt(t)])[1];
  const x = TAKES_HOLD + STROKE * inWindow(t, CURTAIN_PULLS[k]);
  return obb("curtain grip", frame(new Matrix4(), [x, BEDROOM.floor + GRIP.height, panel.z - panel.amplitude - FABRIC_PULLED], new Euler()), [...GRIP.size]);
};

const strokeAt = (t: number) => CURTAIN_PULLS.reduce((k, [from], i) => (t >= from - REACH_BACK.again ? i : k), 0);

export const curtainGrip = (t: number) => gripOf(strokeAt(t))(t);

export const MORNING_HOLDS: readonly Hold[] = CURTAIN_PULLS.map((pull, k) =>
  handHold({
    name: `the near curtain panel in his right hand, pull ${k + 1}`,
    arm: "rightArm",
    window: pull,
    lead: k === 0 ? REACH_BACK.first : REACH_BACK.again,
    tail: k === CURTAIN_PULLS.length - 1 ? LET_GO.last : LET_GO.between,
    target: gripOf(k),
    near: (t) => gripOf(k)(t).center.clone().add(new Vector3(0, 0, -(GRIP.size[2] / 2 + HAND))),
  }),
);

export const bedroomStepTimes = (fps: number) => [...touchdownTimes(toBedGait(), HOP_UP[0], fps), ...touchdownTimes(toWindowGait(), MORNING[1], fps)];
