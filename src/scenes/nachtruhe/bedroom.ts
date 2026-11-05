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
import { OUTLINE } from "../../toon/primitives";
import { FACING_THE_WALL, pinEnd } from "../enterHouse";
import { BLANKET_BACK, EYES_OPEN, HOP_DOWN, HOP_UP, LAMP_OFF, LAMP_ON, LIE_DOWN, MORNING, PULL_OVER, SIT_UP, SWING_IN, SWING_OUT, WALK_TO_BED } from "./timeline";

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

const progress = (t: number, [from, to]: readonly [number, number]) => clamp((t - from) / (to - from), 0, 1);

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

const PRESSES = [LAMP_OFF, LAMP_ON].map((click) => ({ reach: click - 0.45, grip: click - 0.08, release: click + 0.12, done: click + 0.55 }));
const TOWARD_THE_SWITCH = 0.15;
const twistAt = (t: number) => Math.max(...PRESSES.map((p) => kf(t, [p.reach, p.grip, p.release, p.done], [0, TOWARD_THE_SWITCH, TOWARD_THE_SWITCH, 0])));

const lieAt = (t: number, w: number): TibikFrame =>
  placed(t, {
    position: UP.position.map((v, i) => lerp(v, IN_BED.position[i], w)),
    rotationY: UP.rotationY,
    pose: { ...blendPose(SITTING_UP, IN_BED.pose, w), twist: twistAt(t) },
    tilt: lerp(0, IN_BED.tilt, w),
  });

const evening = (t: number): TibikFrame =>
  t < HOP_UP[0]
    ? walkingIn(t)
    : t < HOP_UP[1]
      ? hopAt(t, progress(t, HOP_UP))
      : t < SWING_IN[0]
        ? placed(t, BED_SEAT)
        : t < SWING_IN[1]
          ? swingAt(t, progress(t, SWING_IN))
          : t < LIE_DOWN[0]
            ? placed(t, UP)
            : lieAt(t, inWindow(t, LIE_DOWN));

const morning = (t: number): TibikFrame =>
  t < SIT_UP[0]
    ? lieAt(t, 1)
    : t < SIT_UP[1]
      ? lieAt(t, 1 - inWindow(t, SIT_UP))
      : t < SWING_OUT[0]
        ? placed(t, UP)
        : t < SWING_OUT[1]
          ? swingAt(t, 1 - progress(t, SWING_OUT))
          : t < HOP_DOWN[0]
            ? placed(t, BED_SEAT)
            : t < HOP_DOWN[1]
              ? hopAt(t, 1 - progress(t, HOP_DOWN))
              : placed(t, standing());

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

export const coveredAt = (t: number) =>
  t < MORNING[0] ? kf(t, pullKeys, TURNED_BACK.map(covering)) : kf(t, pushKeys, [...TURNED_BACK].reverse().map(covering));

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
  return new Vector3(AT_THE_CHEST, blanketSurface(BED_RECT, body, cover, aside, edge)(AT_THE_CHEST, fold) + HAND, fold + outside);
};

const at = (start: number, [from, to]: readonly [number, number]) => [start + from, start + to] as const;

export const PULLING = { right: at(PULL_OVER[0], PULL.right), left: at(PULL_OVER[0], PULL.left) } as const;
export const PUSHING = { left: at(BLANKET_BACK[0], PUSH.left), right: at(BLANKET_BACK[0], PUSH.right) } as const;

const foldHold = (arm: ArmName, [grip, release]: readonly [number, number], outside: number): Hold => ({
  name: `the turned-back blanket's fold in his ${arm === "leftArm" ? "left" : "right"} hand`,
  arm,
  reach: grip - 0.3,
  grip,
  release,
  done: release + 0.4,
  target: (t) => obb("blanket fold", frame(new Matrix4(), foldPoint(t, outside).toArray(), new Euler()), [0.1, 0.01, 0.02]),
  near: (t) => foldPoint(t, outside),
  exact: true,
});

const PRESS_POINT = new Vector3(CORD_SWITCH.center[0], CORD_SWITCH.center[1] + CORD_SWITCH.size[1] / 2 + HAND, CORD_SWITCH.center[2]);

const switchHold = (press: (typeof PRESSES)[number]): Hold => ({
  name: "his lamp's cord switch, pressed",
  arm: "leftArm",
  ...press,
  target: cordSwitchSolid,
  near: () => PRESS_POINT,
});

export const BEDROOM_HOLDS: readonly Hold[] = [
  foldHold("rightArm", PULLING.right, FROM_BENEATH),
  foldHold("leftArm", PULLING.left, FROM_OUTSIDE),
  foldHold("leftArm", PUSHING.left, FROM_BENEATH),
  foldHold("rightArm", PUSHING.right, FROM_BENEATH),
  ...PRESSES.map(switchHold),
];
