import { BED, BED_RECT, BEDROOM, BEDROOM_DOOR, BEDROOM_DOORWAY } from "../../building/bedroomShape";
import { DOOR_FRAME } from "../../building/doorwayFrame";
import { ROOM_DOOR } from "../../building/doors";
import { armKf, blinkAt } from "../../characters/animate";
import { STEP_OVERLAP, rhythmicSteps, strideAt, walkCadence } from "../../characters/gait";
import { blendPose } from "../../characters/poseBlend";
import { clamp, easeUnit, lerp } from "../../characters/scalar";
import { walkFacing, type Walk } from "../../characters/walkPath";
import { BACK_DEPTH, SITTING, sittingOnBed } from "../../Tibik/bedPoses";
import { plantedTibik, tibikGaitOf, type TibikFrame } from "../../Tibik/character";
import { TIBIK_REST } from "../../Tibik/rig";
import { WALK_SWAY, WALK_SWING, swungArms, walkArmKeys, walkingOn } from "../../Tibik/walkingArms";
import { OUTLINE, type Vec3 } from "../../toon/primitives";
import { FACING_THE_WALL, pinEnd } from "../enterHouse";
import { HOP_UP, WALK_TO_BED } from "./timeline";

export const BED_SEAT = sittingOnBed(BED_RECT.x0 + 1.3);

const STAND = { x: BED_SEAT.position[0], z: BED_RECT.z0 - BED.frame - BACK_DEPTH - OUTLINE - 0.02 };
const CLEAR = { latch: BEDROOM_DOORWAY.x0 + DOOR_FRAME.lining, leaf: BEDROOM_DOOR.hinge[0] - ROOM_DOOR.thickness };
const DOORWAY_X = (CLEAR.latch + CLEAR.leaf) / 2;
const TUCKED_UNTIL = BEDROOM.z0 + BACK_DEPTH + 0.1;
const FROM_THE_HALL = 0;
const HOP = { rise: 0.55, back: [0.3, 1] as const };
const EVENING_BLINKS = [10.9, 12.9, 14.5, 16.0];

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

const sitting = (t: number): TibikFrame => ({
  position: [...BED_SEAT.position],
  rotationY: BED_SEAT.rotationY,
  pose: { ...BED_SEAT.pose, blink: blinkAt(t, EVENING_BLINKS) },
  holdingBox: false,
});

export const bedroomEveningAt = (t: number): TibikFrame => (t < HOP_UP[0] ? walkingIn(t) : t < HOP_UP[1] ? hoppingUp(t) : sitting(t));
