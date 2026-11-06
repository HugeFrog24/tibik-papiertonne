import { BANGING, BANG_READY, BLOW, later } from "./banging";
import { Vector3 } from "three";
import { easeUnit, inWindow } from "../../characters/scalar";
import { blinkAt, kf } from "../../characters/animate";
import { torsoMatrix } from "../../characters/skeleton";
import { PHONE, gripPoint, type PhonePlace } from "../../Karen/phoneShape";
import {
  CALL_LINES,
  LOWERED,
  POCKET,
  SETTLED,
  phoneAt,
  readingAt,
} from "./calls";
import { AT_THE_SWITCH_AT, DOWN_THE_STAIRS, EXIT } from "./exit";
import { tibikAt } from "./door";
import { mouthInWorld } from "../../dialogue/screen";
import { RIG } from "../../Tibik/rig";
import { KAREN_TURN, karenTurnedTo } from "../../Karen/aimHead";
import { CODA, LIPS, TO_HER_HAND, exhalingAt, turnedToHerHand } from "./cigarette";
import { obb, type Obb } from "../../physics/collision";
import { planGait, plantFeet } from "../../characters/gait";
import type { Pose, Side } from "../../characters/skeleton";
import { firstFloorGround } from "../../building/ground";
import { doorFrame } from "../../building/doors";
import {
  DOORBELL_BUTTON,
  TIBIK_DOOR,
  doorbellButtonCenter,
  landingNormal,
  doorbellSolid,
} from "../../building/stairwell";
import RHYTHM from "../../../assets/recordings/doorbell-rhythm.model.json";
import STORM from "./bellStorm.json";
import { bellPresses } from "../../../scripts/bell-presses.mjs";
import {
  bubbleBox,
  speakingAmountIn,
  speakingIn,
  type Line,
} from "../../dialogue/line";
import {
  KAREN_ARM_REST,
  KAREN_REST,
  KAREN_SKELETON,
  limitKarenHead,
} from "../../Karen/rig";
import { blendArm, type Hold } from "../../physics/holds";
import { lazy } from "../../physics/lazy";
import { placeFrame } from "../../characters/propPlace";
import { floorLevel } from "../../street/building";
import type { Vec3 } from "../../toon/primitives";
import type { KarenFrame } from "../../Karen/character";
import {
  KAREN_GAIT,
  KAREN_WALK_TRACK,
  facing,
} from "../hausmuell/choreography";
import { round6 } from "../../characters/scalar";

export const KLINGELSTURM_DURATION = CODA.end;

export const BELL_PRESSES: readonly (readonly [number, number])[] = bellPresses(
  STORM,
  RHYTHM,
);
const REACH = 0.25;
const LET_GO = 0.3;
const JAB = 0.008;

export const bellRings = () =>
  BELL_PRESSES.map(([at, until]) => ({ at, length: round6(until - at) }));

export const bellStorm = () => {
  const [first] = BELL_PRESSES[0];
  const [, last] = BELL_PRESSES[BELL_PRESSES.length - 1];
  return { at: first, length: round6(last + STORM.ringOn - first) };
};

const BUTTON = new Vector3(...doorbellButtonCenter(TIBIK_DOOR)).applyMatrix4(
  doorFrame(TIBIK_DOOR, 0),
);
const BELL_ARM = { raise: 1.5, out: 0.8, elbow: 1.55, inward: 0.9 };

const OUTWARD = landingNormal(TIBIK_DOOR);

const PRESSED_HAND =
  Math.max(...KAREN_SKELETON.hand.size) + 0.001 - DOORBELL_BUTTON.size[2] / 2;

const BELOW_THE_BUTTON = new Vector3(0, -0.03, 0);

export const bellLift = (t: number) => {
  for (let i = 0; i + 1 < BELL_PRESSES.length; i++) {
    const [, from] = BELL_PRESSES[i];
    const [to] = BELL_PRESSES[i + 1];
    if (t > from && t < to)
      return JAB * Math.sin((Math.PI * (t - from)) / (to - from)) ** 2;
  }
  return 0;
};

const liftedBell = (t: number): Obb => {
  const bell = doorbellSolid(TIBIK_DOOR);
  return {
    ...bell,
    center: bell.center.clone().addScaledVector(OUTWARD, bellLift(t)),
  };
};

export const BELL_HOLDS: readonly Hold[] = [
  {
    name: "the bell, in her rhythm",
    arm: "leftArm",
    reach: BELL_PRESSES[0][0] - REACH,
    grip: BELL_PRESSES[0][0],
    release: BELL_PRESSES[BELL_PRESSES.length - 1][1],
    done: BELL_PRESSES[BELL_PRESSES.length - 1][1] + LET_GO,
    target: liftedBell,
    near: (t) =>
      BUTTON.clone()
        .addScaledVector(OUTWARD, PRESSED_HAND + bellLift(t))
        .add(BELOW_THE_BUTTON),
    pose: BELL_ARM,
    exact: true,
  },
];

const DOOR_LINES: readonly Line[] = [
  {
    speaker: "tibik",
    from: 6.3,
    to: 7.3,
    text: "Ja bitte?",
    name: "Tibik: Ja bitte",
    tone: "calm",
    box: bubbleBox(80, 40, 520, 220, 56),
  },
  {
    speaker: "karen",
    from: 7.5,
    to: 9.0,
    text: "MACHEN SIE SOFORT AUF!",
    name: "Karen: Machen Sie auf",
    tone: "shout",
    box: bubbleBox(900, 40, 900, 380, 86),
  },
  {
    speaker: "tibik",
    from: 9.45,
    to: 10.65,
    text: "Worum geht es denn?",
    name: "Tibik: Worum geht es",
    tone: "calm",
    box: bubbleBox(460, 150, 480, 230, 54),
  },
  {
    speaker: "karen",
    from: 10.85,
    to: 11.75,
    text: "UM DEN KARTON!",
    name: "Karen: Um den Karton",
    tone: "shout",
    box: bubbleBox(820, 30, 1040, 460, 70),
  },
  {
    speaker: "karen",
    from: 11.95,
    to: 13.95,
    text: "KAUFEN SIE SICH GEFÄLLIGST EINEN NEUEN!",
    name: "Karen: Kaufen Sie sich einen Neuen",
    tone: "shout",
    box: bubbleBox(820, 30, 1040, 460, 70),
  },
  {
    speaker: "tibik",
    from: 14.15,
    to: 15.45,
    text: "Der Umwelt zuliebe nicht.",
    name: "Tibik: Der Umwelt zuliebe",
    tone: "calm",
    box: bubbleBox(400, 140, 560, 240, 54),
  },
];

export const LINES: readonly Line[] = [...DOOR_LINES, ...CALL_LINES];

const SHOUTED = LINES.filter((line) => line.tone === "shout");
const speaking = speakingIn(SHOUTED);
const yellingAmount = speakingAmountIn(SHOUTED);

export const KAREN_AT_DOOR: Vec3 = [-2.76, 0, -9.2];
const DOOR_FACE: Vec3 = [-3.2, 0, -9.2];
const PANT = 0.9;
const RIGHT_HAND_ON_HER_BELLY = { raise: 0.9, out: 0.7, elbow: 1.2, inward: 2.2 };

export const STEP_BACK: readonly [number, number] = [
  STORM.until,
  STORM.until + 0.8,
];
const BACK_OFF = 0.15;
export const KAREN_HOME = {
  turn: [16.05, 16.95] as const,
  side: [15.95, 17.9] as const,
  to: -1.5,
  z: -9.25,
  width: KAREN_WALK_TRACK,
};
const karenX = (t: number) =>
  KAREN_AT_DOOR[0] +
  BACK_OFF * kf(t, STEP_BACK, [0, 1]) +
  (KAREN_HOME.to - KAREN_AT_DOOR[0] - BACK_OFF) *
    kf(t, KAREN_HOME.side, [0, 1]);
const toHisDoor = (t: number) =>
  kf(t, BANGING.walk, [0, 1]) - kf(t, BANGING.back, [0, 1]);
const turnedToHisDoor = (t: number) =>
  kf(t, BANGING.turn, [0, 1]) - kf(t, BANGING.turnBack, [0, 1]);
const karenRoot = (t: number) => ({
  x: karenX(t) + (KAREN_AT_DOOR[0] - KAREN_HOME.to) * toHisDoor(t),
  z:
    KAREN_AT_DOOR[2] +
    (KAREN_HOME.z - KAREN_AT_DOOR[2]) *
      (kf(t, KAREN_HOME.side, [0, 1]) - toHisDoor(t)) +
    BLOW.aside * toHisDoor(t),
  yaw:
    facing(KAREN_AT_DOOR, DOOR_FACE) +
    (Math.PI / 2) * (kf(t, KAREN_HOME.turn, [0, 1]) - turnedToHisDoor(t)),
});

const CADENCE = 0.26;
const STRIDE = 0.24;
const STEPS_SETTLE = 0.15;
const HOME_STEPS = 15.92;
const crossing = (from: number, count: number, wideAtTheEnd = 2) =>
  Array.from({ length: count }, (_, k) => ({
    side: (k % 2 === 0 ? 1 : -1) as Side,
    lift: round6(from + k * CADENCE),
    land: round6(from + k * CADENCE + STRIDE),
    ...(k < count - wideAtTheEnd ? { width: KAREN_HOME.width } : {}),
  }));

const SQUARING_UP = { after: 0.15, length: 0.25 };
const NARROW_STEP_ASIDE = 0.02;

export const karenStandGait = lazy(() =>
  planGait(
    KAREN_SKELETON,
    KAREN_GAIT,
    karenRoot,
    [
      { side: 1, lift: STEP_BACK[0], land: STEP_BACK[0] + 0.37 },
      { side: -1, lift: STEP_BACK[0] + 0.4, land: STEP_BACK[1] },
      ...crossing(HOME_STEPS, 8),
      ...crossing(BANGING.walk[0], 6, 1).map((step, k) => (k === 4 ? { ...step, width: KAREN_HOME.width + NARROW_STEP_ASIDE } : step)),
      {
        side: 1,
        lift: round6(BANGING.blows[3] + SQUARING_UP.after),
        land: round6(BANGING.blows[3] + SQUARING_UP.after + SQUARING_UP.length),
      },
      ...crossing(BANGING.back[0] + STEPS_SETTLE, 6),
    ],
    [-1, KLINGELSTURM_DURATION + 2],
    () => floorLevel(1),
    firstFloorGround,
  ),
);


const WATCHING = { twist: 0.5, head: 0.4, gaze: 0.3 };

const FOLLOWING = { ease: 0.4, settle: 0.2, turn: { ...KAREN_TURN, lean: 0.2 } };

const EXHALE = { pitch: 0.2 };

const smokingMouth = (t: number, otherwise: number) =>
  t < CODA.mediumCut ? otherwise : LIPS.open + (LIPS.exhale - LIPS.open) * exhalingAt(t);

const handsFree = (t: number) =>
  kf(t, [BANGING.tuck[1], BANGING.tuck[1] + 0.3, BANGING.raise[0] - 0.3, BANGING.raise[0]], [0, 1, 1, 0]);

const fistReady = (t: number) =>
  kf(
    t,
    [BANGING.walk[1] - 0.4, BANGING.walk[1] - 0.2, BANGING.blows[5] + BLOW.tail, BANGING.blows[5] + BLOW.tail + 0.25],
    [0, 1, 1, 0],
  );

const hisHeadAt = (t: number) => mouthInWorld(RIG, tibikAt(t));

export const karenAt = (t: number): KarenFrame => {
  const root = karenRoot(t);
  const glaring = Math.max(
    kf(t, [STEP_BACK[0], STEP_BACK[1], 9.0, 9.4], [0, 1, 1, 0]),
    kf(t, [BANGING.blows[0] - 0.3, BANGING.blows[0], BANGING.blows[5], BANGING.back[0] + 0.3], [0, 1, 1, 0]),
  );
  const position: Vec3 = [root.x, floorLevel(1), root.z];
  const pant = Math.sin(2 * Math.PI * PANT * t);
  const yelling = speaking(t, "karen");
  const lookingBack = 1 - kf(t, CODA.phoneAway, [0, 1]);
  const watching = kf(t, [EXIT.offset - 0.1, EXIT.offset + 0.7], [0, 1]) * lookingBack;
  const turning = kf(t, [AT_THE_SWITCH_AT, AT_THE_SWITCH_AT + 0.6], [0, 1]) * lookingBack;
  const following = kf(t, [DOWN_THE_STAIRS - FOLLOWING.ease, DOWN_THE_STAIRS + FOLLOWING.settle], [0, 1]) * lookingBack;
  const exhaling = exhalingAt(t);
  const pose: Pose = limitKarenHead({
    ...KAREN_REST,
    twist: -WATCHING.twist * turning,
    headYaw: -WATCHING.head * watching - TO_HER_HAND.turn * turnedToHerHand(t),
    gazeYaw: -WATCHING.gaze * watching,
    bob: -0.006 + 0.006 * pant,
    lean:
      0.05 + 0.02 * pant + 0.04 * yellingAmount(t, "karen") - 0.06 * glaring,
    headPitch: -0.1 - 0.15 * glaring + 0.1 * readingAt(t) - EXHALE.pitch * exhaling + TO_HER_HAND.nod * turnedToHerHand(t),
    gazePitch: 0.5 * glaring - 0.6 * readingAt(t),
    headRoll: 0.08 * yellingAmount(t, "karen") * Math.sin(t * Math.PI * 3),
    blink: blinkAt(
      t,
      [3.1, 7.2, 9.9, 13.8, 18.6, 22.3, 26.0, later(33.1), later(38.5), later(44.6), later(47.4)],
    ),
    leftArm: blendArm(KAREN_ARM_REST, BANG_READY, fistReady(t)),
    rightArm: blendArm(KAREN_ARM_REST, RIGHT_HAND_ON_HER_BELLY, handsFree(t)),
  });
  const placed = { position, rotationY: root.yaw, pose: limitKarenHead(karenTurnedTo({ position, rotationY: root.yaw, pose }, hisHeadAt(t), following, FOLLOWING.turn)) };
  return {
    ...placed,
    pose: plantFeet(karenStandGait(), t, placed),
    mouthOpen: yelling
      ? 0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI * 4.5))
      : smokingMouth(t, 0.2 + 0.1 * pant),
    pointing: false,
  };
};

const PHONE_ARM = { raise: 1.0, out: 0.35, elbow: 1.7, inward: 0.9 };
const TALKING_ARM = { raise: 1.9, out: 0.21, elbow: 1.55, inward: 1.5 };
const READING_ARM = { raise: 0.98, out: 0.58, elbow: 1.95, inward: 1.19 };

const phoneArm = (t: number) =>
  blendArm(t < SETTLED ? PHONE_ARM : TALKING_ARM, READING_ARM, readingAt(t));

export const phoneFrame = (karen: KarenFrame, phone: PhonePlace) =>
  placeFrame(torsoMatrix(KAREN_SKELETON, karen), phone);

export const phoneObb = (karen: KarenFrame, phone: PhonePlace): Obb =>
  obb("phone", phoneFrame(karen, phone), PHONE.size);

export const GRIP_TURN = 0.35;

const atHer = (t: number) =>
  inWindow(t, BANGING.tuck) - inWindow(t, BANGING.raise) + inWindow(t, LOWERED);

export const gripAt = (t: number) =>
  gripPoint(easeUnit((t - POCKET[1]) / GRIP_TURN) * (1 - atHer(t)));

export const phoneGrip = (karen: KarenFrame, phone: PhonePlace, t: number) =>
  new Vector3(...gripAt(t)).applyMatrix4(phoneFrame(karen, phone));

const POCKET_REACH = POCKET[1] - POCKET[0];
const OFF_THE_PHONE = 0.3;

const phoneHold = (name: string, grip: number, release: number): Hold => ({
  name,
  arm: "rightArm",
  reach: round6(grip - POCKET_REACH),
  grip,
  release,
  done: round6(release + OFF_THE_PHONE),
  target: (t) => phoneObb(karenAt(t), phoneAt(t)),
  near: (t) => phoneGrip(karenAt(t), phoneAt(t), t),
  pose: phoneArm,
  exact: true,
});

export const PHONE_HOLDS: readonly Hold[] = [
  phoneHold("the phone, out of her pocket", POCKET[1], BANGING.tuck[1]),
  phoneHold("the phone, out of her pocket again", BANGING.raise[0], CODA.mediumCut),
];
