import { BED, BED_RECT, BEDROOM, BEDROOM_DOOR, BEDROOM_DOORWAY, CORD_SWITCH, cordSwitchSolid } from "../../building/bedroomShape";
import { DOOR_FRAME } from "../../building/doorwayFrame";
import { ROOM_DOOR } from "../../building/doors";
import { Euler, Matrix4, Vector3 } from "three";
import { armKf, blinkAt, kf } from "../../characters/animate";
import { STEP_OVERLAP, rhythmicSteps, strideAt, walkCadence } from "../../characters/gait";
import { blendPose } from "../../characters/poseBlend";
import { clamp, easeUnit, inWindow, lerp } from "../../characters/scalar";
import { allColliders, armColliders, type ArmName } from "../../characters/skeleton";
import { frame, obb } from "../../physics/collision";
import type { Hold } from "../../physics/holds";
import { blanketEdge, blanketSurface } from "../../props/blanketShape";
import { walkFacing, type Walk } from "../../characters/walkPath";
import { BACK_DEPTH, SITTING, SITTING_UP, lyingInBed, sittingOnBed, sittingUpInBed } from "../../Tibik/bedPoses";
import { plantedTibik, tibikGaitOf, type TibikFrame } from "../../Tibik/character";
import { RIG, TIBIK_REST, type TibikPose } from "../../Tibik/rig";
import { WALK_SWAY, WALK_SWING, swungArms, walkArmKeys, walkingOn } from "../../Tibik/walkingArms";
import { OUTLINE, type Vec3 } from "../../toon/primitives";
import { FACING_THE_WALL, pinEnd } from "../enterHouse";
import { HOP_UP, LAMP_OFF, LIE_DOWN, PULL_OVER, SWING_IN, WALK_TO_BED } from "./timeline";

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

const toBedGait = tibikGaitOf(
  toBedRoot,
  () => {
    const cadence = walkCadence(toBedRoot);
    return pinEnd(rhythmicSteps({ from: WALK_TO_BED[0], to: WALK_TO_BED[1], first: -1, cadence, overlap: STEP_OVERLAP }), [STAND, STAND]);
  },
  HOP_UP[0],
  floorAt,
);

const walkingIn = (t: number): TibikFrame => {
  const { x, y, z, yaw } = toBedRoot(t);
  const walking = Math.max(...walkingOn(t, [WALK_TO_BED]));
  const step = strideAt(toBedGait(), t);
  const tucked = 1 - easeUnit((z - TUCKED_UNTIL) / 0.4);
  const keys = walkArmKeys([WALK_TO_BED]);
  const arms = armKf(t, keys.times, keys.poses);
  const pose = {
    ...TIBIK_REST,
    sway: step * WALK_SWAY * walking * (1 - tucked),
    blink: blinkAt(t, EVENING_BLINKS),
    ...swungArms(arms, WALK_SWING * walking * step * (1 - tucked), tucked),
  };
  return plantedTibik(toBedGait(), t, { position: [x, y, z], rotationY: yaw, pose });
};

const hoppingUp = (t: number): TibikFrame => {
  const k = clamp((t - HOP_UP[0]) / (HOP_UP[1] - HOP_UP[0]), 0, 1);
  const from = walkingIn(HOP_UP[0]);
  const back = easeUnit((k - HOP.back[0]) / (HOP.back[1] - HOP.back[0]));
  const pose = blendPose(from.pose, SITTING, easeUnit(k));
  const position: Vec3 = [
    lerp(from.position[0], BED_SEAT.position[0], back),
    BEDROOM.floor,
    lerp(from.position[2], BED_SEAT.position[2], back),
  ];
  return {
    position,
    rotationY: BED_SEAT.rotationY,
    pose: { ...pose, bob: lerp(from.pose.bob, SITTING.bob, easeUnit(k / HOP.rise)), blink: blinkAt(t, EVENING_BLINKS) },
    holdingBox: false,
  };
};

const placed = (
  t: number,
  { position, rotationY, pose, tilt = 0 }: { readonly position: readonly number[]; readonly rotationY: number; readonly pose: TibikPose; readonly tilt?: number },
): TibikFrame => ({
  position: [position[0], position[1], position[2]],
  rotationY,
  pose: { ...pose, blink: blinkAt(t, EVENING_BLINKS) },
  holdingBox: false,
  tilt,
});

const UP = sittingUpInBed(-1);
const IN_BED = lyingInBed(-1);
const SWING = { legs: 0.5, turn: [0.25, 1] as const };

const swingingIn = (t: number): TibikFrame => {
  const k = clamp((t - SWING_IN[0]) / (SWING_IN[1] - SWING_IN[0]), 0, 1);
  const turn = easeUnit((k - SWING.turn[0]) / (SWING.turn[1] - SWING.turn[0]));
  return placed(t, {
    position: BED_SEAT.position.map((v, i) => lerp(v, UP.position[i], turn)),
    rotationY: lerp(BED_SEAT.rotationY, UP.rotationY, turn),
    pose: blendPose(SITTING, SITTING_UP, easeUnit(k / SWING.legs)),
  });
};

const SWITCH_PRESS = { reach: LAMP_OFF - 0.45, grip: LAMP_OFF - 0.08, release: LAMP_OFF + 0.12, done: LAMP_OFF + 0.55 };
const TOWARD_THE_SWITCH = 0.15;

const lyingDown = (t: number): TibikFrame => {
  const w = inWindow(t, LIE_DOWN);
  const twist = kf(t, [SWITCH_PRESS.reach, SWITCH_PRESS.grip, SWITCH_PRESS.release, SWITCH_PRESS.done], [0, TOWARD_THE_SWITCH, TOWARD_THE_SWITCH, 0]);
  return placed(t, {
    position: UP.position.map((v, i) => lerp(v, IN_BED.position[i], w)),
    rotationY: UP.rotationY,
    pose: { ...blendPose(SITTING_UP, IN_BED.pose, w), twist },
    tilt: lerp(0, IN_BED.tilt, w),
  });
};

const authoredEvening = (t: number): TibikFrame =>
  t < HOP_UP[0]
    ? walkingIn(t)
    : t < HOP_UP[1]
      ? hoppingUp(t)
      : t < SWING_IN[0]
        ? placed(t, BED_SEAT)
        : t < SWING_IN[1]
          ? swingingIn(t)
          : t < LIE_DOWN[0]
            ? placed(t, UP)
            : lyingDown(t);

export const bedroomEveningAt = authoredEvening;

export const ASIDE = 0.68;
export const LAID_EDGE = blanketEdge(BED_RECT, allColliders(RIG, IN_BED), 1);
export const blanketLie = (covered: number) => ({ cover: 1, aside: ASIDE * (1 - covered), edge: LAID_EDGE });

const middle = IN_BED.position[2];
const PULL = { right: [0, 0.5], left: [0.65, 1.1] } as const;
const TURNED_BACK = [ASIDE, middle + 0.1 - BED_RECT.z0, middle - 0.09 - BED_RECT.z0, middle - 0.26 - BED_RECT.z0, 0];
const pullKeys = [PULL_OVER[0], PULL_OVER[0] + PULL.right[1], PULL_OVER[0] + PULL.left[0], PULL_OVER[0] + PULL.left[1], PULL_OVER[1]];

export const eveningCovered = (t: number) => kf(t, pullKeys, TURNED_BACK.map((aside) => 1 - aside / ASIDE));

const HAND = Math.max(...RIG.hand.size) / 2;
const AT_THE_CHEST = LAID_EDGE + 0.08;

const FROM_OUTSIDE = -(HAND + 0.01);

const foldPoint = (t: number, outside = 0) => {
  const { cover, aside, edge } = blanketLie(eveningCovered(t));
  const fold = BED_RECT.z0 + aside;
  const placement = authoredEvening(t);
  const arms = new Set([...armColliders(RIG, placement, "leftArm"), ...armColliders(RIG, placement, "rightArm")].map((s) => s.name));
  const body = allColliders(RIG, placement).filter((s) => !arms.has(s.name));
  return new Vector3(AT_THE_CHEST, blanketSurface(BED_RECT, body, cover, aside, edge)(AT_THE_CHEST, fold) + HAND, fold + outside);
};

const foldHold = (arm: ArmName, [from, to]: readonly [number, number], outside: number): Hold => ({
  name: `the turned-back blanket's fold in his ${arm === "leftArm" ? "left" : "right"} hand`,
  arm,
  reach: PULL_OVER[0] + from - 0.3,
  grip: PULL_OVER[0] + from,
  release: PULL_OVER[0] + to,
  done: PULL_OVER[0] + to + 0.4,
  target: (t) => obb("blanket fold", frame(new Matrix4(), foldPoint(t, outside).toArray(), new Euler()), [0.1, 0.01, 0.02]),
  near: (t) => foldPoint(t, outside),
  exact: true,
});

const PRESS_POINT = new Vector3(CORD_SWITCH.center[0], CORD_SWITCH.center[1] + CORD_SWITCH.size[1] / 2 + HAND, CORD_SWITCH.center[2]);

const switchHold: Hold = {
  name: "his lamp's cord switch, pressed",
  arm: "leftArm",
  ...SWITCH_PRESS,
  target: cordSwitchSolid,
  near: () => PRESS_POINT,
};

export const EVENING_HOLDS: readonly Hold[] = [foldHold("rightArm", PULL.right, 0), foldHold("leftArm", PULL.left, FROM_OUTSIDE), switchHold];
export const PULLING = { right: [PULL_OVER[0] + PULL.right[0], PULL_OVER[0] + PULL.right[1]], left: [PULL_OVER[0] + PULL.left[0], PULL_OVER[0] + PULL.left[1]] } as const;
