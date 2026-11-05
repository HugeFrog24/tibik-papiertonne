import { DOOR_STAND, FACING_THE_WALL, enterHouse, pinApproach, walkLeg } from "../enterHouse";
import { SENSOR, sensorLampOn } from "../../street/entranceSensor";
import { mustReadSeconds } from "./letter";
import { Euler, Matrix4, Vector3 } from "three";
import { armKf, blinkAt, kf } from "../../characters/animate";
import {
  STEP_OVERLAP,
  offTheEdges,
  opposite,
  rhythmicSteps,
  strideAt,
  touchdownTimes,
  walkCadence,
  type RootAt,
} from "../../characters/gait";
import { after, easeUnit, inWindow } from "../../characters/scalar";
import { armColliders } from "../../characters/skeleton";
import { frame, obb } from "../../physics/collision";
import { TONNE, TONNE_FLOOR, tonneLidParts } from "../../street/tonneShape";
import {
  A4,
  DL,
  ENVELOPE,
  CREASES,
  envelopeFlap,
  tearY,
} from "../../props/letterShape";
import { aroundCorner } from "../../physics/gripPath";
import { asCharacter } from "../../Tibik/character";
import { blendMatrices } from "../../toon/orient";
import { walkAt, type Walk } from "../../characters/walkPath";
import type { Hold } from "../../physics/holds";
import { KEY_APPROACH, KEY_GRIP, keyBowGrip, keyDepthAt, keyInLock } from "../../props/keyRingShape";
import { MAILBOXES, binByName } from "../../street/layout";
import {
  MAILBOX_DOOR,
  mailboxDoorFrame,
  mailboxDoorSolid,
  mailboxInside,
  mailboxLockLocal,
} from "../../street/mailboxDoorShape";
import { entranceGround } from "../../street/layout";
import { TIBIK_GAIT, tibikGaitOf, plantedTibik, type TibikFrame } from "../../Tibik/character";
import { ARM_REST, ARM_WALK, RIG, TIBIK_REST, type TibikPose } from "../../Tibik/rig";
import { WALK_SWAY, WALK_SWING, swungArms, walkArmKeys, walkingOn } from "../../Tibik/walkingArms";
import type { Vec3 } from "../../toon/primitives";

export const ARRIVE = 0;
export const AT_MAILBOX = 4;
export const KEY_IN = 4.6;
export const BOX_OPEN = [5.0, 5.6] as const;
export const ENVELOPE_OUT = [5.8, 6.6] as const;
export const BOX_SHUT = [7.0, 7.6] as const;
export const FLAP = [9.0, 9.8] as const;
export const UNFOLD = [10.4, 11.6] as const;
const READ_FROM = 12;
const READ_SPARE = 0.5;
const THANKS_HOLD = 5;
export const DEADPAN_HOLD = 1.5;
const readFor = (roles: Parameters<typeof mustReadSeconds>[0]) => Math.ceil((mustReadSeconds(roles) + READ_SPARE) * 2) / 2;
export const READ = [READ_FROM, READ_FROM + readFor(["salutation", "body"])] as const;
export const THANKS = after(READ[1], Math.max(THANKS_HOLD, readFor(["thanks", "signature"]) - DEADPAN_HOLD));
export const REACT = after(THANKS[1], 2);
export const FOLD = after(REACT[1], 1.5);
export const TO_BIN = after(FOLD[1], 3.2);
export const LID_UP = after(TO_BIN[1], 0.7);
export const KLOPPEN = after(LID_UP[1], 0.4);
export const LID_THUD = KLOPPEN[1] + 0.3;
export const TO_DOOR = after(LID_THUD + 0.2, 2);
export const ENTRY = enterHouse(TO_DOOR[1]);
export const UNLOCK = ENTRY.unlock;
export const IN = ENTRY.in;
export const RUNDSCHREIBEN_DURATION = IN[1] + 6.25;
export const BACK_STEP = ENTRY.backStep;
const WALKING_IN = ENTRY.walkingIn;

const LID_OPEN = 0.3;
const LID_LET_GO = KLOPPEN[1] + 0.1;
const TO_READY: readonly [number, number] = [TO_BIN[1] - 0.4, LID_UP[0]];

export const START = { x: -5.9, z: -0.9 };
export const STAND = { x: -2.3, z: -1.39 };
const LEAN_IN = 0.25;
const TURN_IN: readonly [number, number] = [AT_MAILBOX - 0.45, AT_MAILBOX];

const walkHome: Walk = {
  from: ARRIVE,
  to: AT_MAILBOX,
  via: [
    [START.x, START.z],
    [-4.0, START.z],
    [STAND.x, -1.0],
    [STAND.x, STAND.z],
  ],
};

export const PAPER_BIN = binByName("Papier 1");
export const BIN_FLOOR = PAPER_BIN.position[1] + TONNE_FLOOR;
const BIN_STAND = { x: PAPER_BIN.position[0] + 0.15, z: -0.85 };
const BIN_LEAN = 0.12;

const walkToBin: Walk = {
  from: TO_BIN[0],
  to: TO_BIN[1],
  via: [
    [STAND.x, STAND.z],
    [STAND.x + 0.6, -0.8],
    [BIN_STAND.x, -0.3],
    [BIN_STAND.x, BIN_STAND.z],
  ],
};

const walkToDoor: Walk = {
  from: TO_DOOR[0],
  to: TO_DOOR[1],
  via: [
    [BIN_STAND.x, BIN_STAND.z],
    [BIN_STAND.x - 0.25, -0.3],
    [DOOR_STAND.x, -0.55],
    [DOOR_STAND.x, DOOR_STAND.z],
  ],
};

const rootAt: RootAt = (t) => {
  const entering = ENTRY.rootAt(t);
  if (entering) return entering;
  if (t >= TO_DOOR[0]) return walkLeg(walkToDoor, t);
  if (t >= TO_BIN[0]) return walkLeg(walkToBin, t);
  const { x, z, heading } = walkAt(walkHome, t);
  const turned = easeUnit((t - TURN_IN[0]) / (TURN_IN[1] - TURN_IN[0]));
  const yaw = heading + (FACING_THE_WALL - heading) * turned;
  return { x, z, yaw, y: 0 };
};

const tibikSteps = () => {
  const cadence = walkCadence(rootAt);
  const home = rhythmicSteps({
    from: ARRIVE,
    to: AT_MAILBOX,
    first: -1,
    cadence,
    overlap: STEP_OVERLAP,
  });
  const legs: readonly (readonly [number, number])[] = [TO_BIN, TO_DOOR];
  const walked = legs.reduce((steps, [from, to]) => {
    const first = opposite(steps[steps.length - 1].side);
    const next = rhythmicSteps({ from, to, first, cadence, overlap: STEP_OVERLAP });
    return [...steps, ...(from === TO_DOOR[0] ? pinApproach(next) : next)];
  }, home);
  return [...walked, ...ENTRY.steps(opposite(walked[walked.length - 1].side), cadence)];
};

const GAIT_SPAN = [-1, RUNDSCHREIBEN_DURATION] as const;
const WALK_LEGS = [TO_BIN, TO_DOOR, WALKING_IN] as const;

export const tibikGait = tibikGaitOf(
  rootAt,
  () => offTheEdges(RIG, TIBIK_GAIT, rootAt, tibikSteps(), GAIT_SPAN, entranceGround),
  RUNDSCHREIBEN_DURATION,
  entranceGround,
);

export const footstepTimes = (fps: number): number[] =>
  touchdownTimes(tibikGait(), RUNDSCHREIBEN_DURATION, fps);

export const rundschreibenTibikAt = (t: number): TibikFrame => {
  const { x, z, yaw: rotationY, y = 0 } = rootAt(t);
  const walking = Math.max(1 - easeUnit((t - (AT_MAILBOX - 0.6)) / 0.6), ...walkingOn(t, WALK_LEGS));
  const step = strideAt(tibikGait(), t);
  const tucked = ENTRY.tuckedAt(t);
  const swing = WALK_SWING * walking * step * (1 - tucked);
  const legArms = walkArmKeys(WALK_LEGS);
  const arms = armKf(t, [AT_MAILBOX - 0.6, AT_MAILBOX, ...legArms.times], [ARM_WALK, ARM_REST, ...legArms.poses]);
  const pose: TibikPose = {
    ...TIBIK_REST,
    sway: step * WALK_SWAY * walking,
    lean: kf(
      t,
      [
        AT_MAILBOX,
        KEY_IN - 0.4,
        KEY_OUT[1],
        KEY_OUT[1] + 0.5,
        LID_UP[0] - 0.3,
        LID_UP[0] + 0.1,
        LID_LET_GO,
        LID_LET_GO + 0.5,
      ],
      [0, LEAN_IN, LEAN_IN, 0, 0, BIN_LEAN, BIN_LEAN, 0],
    ),
    headPitch: kf(
      t,
      [
        AT_MAILBOX - 0.4,
        AT_MAILBOX,
        TO_BIN[0],
        TO_BIN[0] + 0.4,
        TO_BIN[1] - 0.3,
        TO_BIN[1],
        LID_THUD,
        LID_THUD + 0.4,
      ],
      [0, 0.12, 0.12, 0, 0, 0.3, 0.3, 0],
    ),
    blink: blinkAt(t, [1.4, 3.1, 6.6, 9.9, 17.2, 25.8, 29.95, 34.6, 38.9, 42.7]),
    ...swungArms(arms, swing, tucked),
  };
  const placed = { position: [x, y, z] as Vec3, rotationY, pose };
  return plantedTibik(tibikGait(), t, placed);
};

export const KEY_REGRIP = READ[0] + 1;

export const LAMP_SENSOR = SENSOR;

const tibikRootAt = (t: number) => rundschreibenTibikAt(t).position;

export const lampOnAt = (t: number) => sensorLampOn(tibikRootAt, LAMP_SENSOR.range, t);

export const KEY_INSERT = 0.016;

export const KEY_OUT: readonly [number, number] = [
  BOX_SHUT[1] + 0.35,
  BOX_SHUT[1] + 0.6,
];

export const mailboxDoorAt = (t: number) =>
  kf(
    t,
    [BOX_OPEN[0], BOX_OPEN[1], BOX_SHUT[0] + 0.1, BOX_SHUT[1]],
    [0, MAILBOX_DOOR.open, MAILBOX_DOOR.open, 0],
  );

const keyTurnAt = (t: number) =>
  kf(
    t,
    [KEY_IN + 0.05, BOX_OPEN[0] - 0.05, BOX_SHUT[1] + 0.05, BOX_SHUT[1] + 0.3],
    [0, Math.PI / 2, Math.PI / 2, 0],
  );

export const keysInLock = (t: number): Matrix4 => {
  const depth = keyDepthAt(t, [KEY_IN - KEY_APPROACH, KEY_IN], KEY_OUT, KEY_INSERT);
  return keyInLock(
    mailboxDoorFrame(mailboxDoorAt(t)),
    new Vector3(...mailboxLockLocal()),
    "mailbox",
    depth,
    keyTurnAt(t),
  );
};

export const keyGripAt = (t: number) =>
  keyBowGrip(keysInLock(t), "mailbox", KEY_GRIP);

export const KEY_HOLD: Hold = {
  name: "his keys in the lock",
  arm: "leftArm",
  reach: KEY_IN - 0.6,
  grip: KEY_IN - KEY_APPROACH,
  release: BOX_OPEN[1],
  done: ENVELOPE_OUT[0] + 0.2,
  target: (t) => mailboxDoorSolid(mailboxDoorAt(t)),
  near: keyGripAt,
  exact: true,
};

export const KEY_SHUT_HOLD: Hold = {
  name: "his keys, shutting the box",
  arm: "leftArm",
  reach: ENVELOPE_OUT[1] + 0.15,
  grip: BOX_SHUT[0] + 0.1,
  release: KEY_OUT[1],
  done: FLAP[0] - 0.25,
  target: (t) => mailboxDoorSolid(mailboxDoorAt(t)),
  near: keyGripAt,
  exact: true,
};

export const KEYS_IN_LOCK: readonly [number, number] = [
  KEY_IN - KEY_APPROACH,
  KEY_OUT[1],
];

const ENVELOPE_SLIDE: readonly [number, number] = [
  ENVELOPE_OUT[0] + 0.2,
  ENVELOPE_OUT[0] + 0.55,
];
const ENVELOPE_LIFT: readonly [number, number] = [
  ENVELOPE_SLIDE[1],
  ENVELOPE_OUT[1] + 0.15,
];
const SLIDE_OUT = 0.125;
const HOLD_OUT = 0.34;
const SKEW = {
  roll: 0.09,
  rollSway: 0.02,
  pitch: -0.06,
  pitchSway: 0.015,
  yaw: 0.05,
};
const FLOPPY = { bow: 0.0105, bowSway: 0.0025, twist: 0.005 };
const FLAP_FLOP = 1.12;
const DROOP = 0.4;
const oneHanded = (t: number) =>
  kf(
    t,
    [
      ENVELOPE_OUT[1] + 0.15,
      ENVELOPE_OUT[1] + 0.45,
      FLAP[0] - 0.35,
      FLAP[0],
      FOLD[1] - 0.15,
      FOLD[1] + 0.25,
      TO_READY[0],
      TO_READY[1],
    ],
    [0, 1, 1, 0, 0, 1, 1, 0],
  );
const HOLD_DOWN = 0;
const OPENING_TILT = 0.8;
const OPENING_SHIFT = 0.04;
const openingUp = (t: number) =>
  kf(t, [FLAP[0] - 0.4, FLAP[0] - 0.05, FLAP[1] + 0.25, UNFOLD[0]], [0, 1, 1, 0]);
export const HAND_TOUCH = Math.max(...RIG.hand.size) + 0.004;
const ROUND_THE_CORNER = aroundCorner(
  [DL[0] / 2, 0],
  [DL[0], 0],
  [DL[0], DL[1] / 2],
  HAND_TOUCH,
);

const boxPose = (slide: number) => {
  const { center, size } = mailboxInside();
  const near = MAILBOXES.center[2] + MAILBOXES.size[2] / 2 - 0.003;
  return new Matrix4()
    .makeBasis(
      new Vector3(-1, 0, 0),
      new Vector3(0, 0, -1),
      new Vector3(0, -1, 0),
    )
    .setPosition(
      center[0] + DL[0] / 2,
      center[1] - size[1] / 2,
      near + SLIDE_OUT * slide,
    );
};

const UNFOLD_ROOM = 0.04;
const roomToUnfold = (t: number) =>
  Math.max(
    ...[UNFOLDING, FOLD_BACK].map(([a, b]) => kf(t, [a - 0.3, a, b, b + 0.4], [0, 1, 1, 0])),
  );

const heldPose = (t: number) => {
  const tibik = rundschreibenTibikAt(t);
  const character = asCharacter(tibik);
  const shoulder = (which: "leftArm" | "rightArm") =>
    armColliders(RIG, character, which)[0].center;
  const forward = new Vector3(Math.sin(tibik.rotationY), 0, Math.cos(tibik.rotationY));
  const middle = shoulder("leftArm")
    .add(shoulder("rightArm"))
    .multiplyScalar(0.5)
    .addScaledVector(forward, HOLD_OUT + UNFOLD_ROOM * roomToUnfold(t))
    .addScaledVector(new Vector3(forward.z, 0, -forward.x), OPENING_SHIFT * openingUp(t))
    .add(new Vector3(0, -HOLD_DOWN, 0));
  const turn = new Matrix4()
    .makeRotationY(tibik.rotationY + SKEW.yaw)
    .multiply(
      new Matrix4().makeRotationX(
        SKEW.pitch + SKEW.pitchSway * Math.sin(0.9 * t + 1) + OPENING_TILT * openingUp(t),
      ),
    )
    .multiply(new Matrix4().makeRotationZ(SKEW.roll + SKEW.rollSway * Math.sin(1.3 * t)));
  const corner = new Vector3(DL[0] / 2, DL[1] / 2, 0).applyMatrix4(turn);
  return turn
    .setPosition(middle.sub(corner))
    .multiply(new Matrix4().makeTranslation(0, DL[1] / 2, 0))
    .multiply(new Matrix4().makeRotationZ(-DROOP * oneHanded(t)))
    .multiply(new Matrix4().makeTranslation(0, -DL[1] / 2, 0));
};

const READY = {
  x: PAPER_BIN.position[0] + 0.316,
  y: 1.1,
  z: PAPER_BIN.position[2] + 0.47,
};
const FLIGHT = 0.42;
export const ENVELOPE_LANDS = KLOPPEN[0] + FLIGHT;
const THROW = 3.4;
const DRIFT = 0.18;
const GRAVITY = 9.81;
const LANDED = BIN_FLOOR + ENVELOPE.thickness + 0.0005;
const FLICK = (READY.y - LANDED - (GRAVITY * FLIGHT * FLIGHT) / 2) / FLIGHT;
const FLAT_ACROSS = new Matrix4().makeBasis(
  new Vector3(-1, 0, 0),
  new Vector3(0, 0, 1),
  new Vector3(0, 1, 0),
);

const thrown = (t: number) => {
  const s = Math.min(FLIGHT, Math.max(0, t - KLOPPEN[0]));
  const slowing = (s / FLIGHT) * (2 - s / FLIGHT);
  return FLAT_ACROSS.clone().setPosition(
    READY.x - DRIFT * slowing,
    READY.y - FLICK * s - (GRAVITY * s * s) / 2,
    READY.z - (THROW * FLIGHT * slowing) / 2,
  );
};

export const envelopeAt = (t: number): Matrix4 | null => {
  if (t < BOX_OPEN[0]) return null;
  if (t >= KLOPPEN[0]) return thrown(t);
  const lift = inWindow(t, ENVELOPE_LIFT);
  const box = boxPose(inWindow(t, ENVELOPE_SLIDE));
  const held = lift <= 0 ? box : blendMatrices(box, heldPose(t), lift);
  const ready = inWindow(t, TO_READY);
  return ready <= 0 ? held : blendMatrices(held, thrown(KLOPPEN[0]), ready);
};

export const paperLidAt = (t: number) => {
  if (t < LID_LET_GO) return kf(t, [LID_UP[0], LID_UP[0] + 0.4], [0, LID_OPEN]);
  const u = Math.min(1, (t - LID_LET_GO) / (LID_THUD - LID_LET_GO));
  return LID_OPEN * (1 - u * u);
};

const LID_GRIP_X = -0.13;

export const lidHandleGripAt = (t: number) => {
  const { center, size } = TONNE.lid.handle;
  return new Vector3(LID_GRIP_X, center[1], center[2] + size[2] / 2 + HAND_TOUCH).applyMatrix4(
    frame(frame(new Matrix4(), PAPER_BIN.position), TONNE.lid.hinge, new Euler(-paperLidAt(t), 0, 0)),
  );
};

export const LID_HOLD: Hold = {
  name: "Papier 1's lid, by its handle",
  arm: "leftArm",
  reach: LID_UP[0] - 0.35,
  grip: LID_UP[0],
  release: LID_LET_GO,
  done: LID_LET_GO + 0.3,
  target: (t) => tonneLidParts(PAPER_BIN.name, PAPER_BIN.position, paperLidAt(t))[1],
  near: lidHandleGripAt,
  exact: true,
};

const onEnvelope = (m: Matrix4, local: Vector3, outward: Vector3) =>
  local
    .clone()
    .applyMatrix4(m)
    .addScaledVector(outward.clone().transformDirection(m), HAND_TOUCH);

export const envelopeGripAt = (t: number, which: "leftArm" | "rightArm") => {
  const m = envelopeAt(Math.max(t, BOX_OPEN[0]))!;
  const mid = -ENVELOPE.thickness / 2;
  if (which === "rightArm")
    return onEnvelope(m, new Vector3(0, DL[1] / 2, mid), new Vector3(-1, 0, 0));
  const [x, y] = ROUND_THE_CORNER(inWindow(t, ENVELOPE_LIFT));
  return new Vector3(x, y, mid).applyMatrix4(m);
};

const gripBox = (at: Vector3) =>
  obb(
    "envelope grip",
    new Matrix4().makeTranslation(at.x, at.y, at.z),
    [0.01, 0.01, 0.01],
  );

export const ENVELOPE_LEFT_HOLD: Hold = {
  name: "the envelope, out of the box",
  arm: "leftArm",
  reach: BOX_OPEN[1],
  grip: ENVELOPE_SLIDE[0],
  release: ENVELOPE_OUT[1] + 0.15,
  done: BOX_SHUT[0] + 0.1,
  target: (t) => gripBox(envelopeGripAt(t, "leftArm")),
  near: (t) => envelopeGripAt(t, "leftArm"),
  exact: true,
};

const FOLLOW_THROUGH = new Vector3(0.04, 0.06, 0.1);

const rightHandAt = (t: number) =>
  t <= KLOPPEN[0]
    ? envelopeGripAt(t, "rightArm")
    : envelopeGripAt(KLOPPEN[0], "rightArm").addScaledVector(
        FOLLOW_THROUGH,
        inWindow(t, [KLOPPEN[0], KLOPPEN[0] + 0.15]),
      );

export const ENVELOPE_RIGHT_HOLD: Hold = {
  name: "the envelope, in his right hand",
  arm: "rightArm",
  reach: ENVELOPE_OUT[1] - 0.2,
  grip: ENVELOPE_OUT[1] + 0.1,
  release: KLOPPEN[0],
  done: KLOPPEN[0] + 0.3,
  target: (t) => gripBox(rightHandAt(t)),
  near: rightHandAt,
  exact: true,
};

const SPRUNG_BACK = 0.3;

export const flapAt = (t: number) =>
  kf(
    t,
    [FLAP[0], FLAP[1], FLAP[1] + 0.4, FOLD[1], FOLD[1] + 0.5],
    [0, 1, FLAP_FLOP, FLAP_FLOP, SPRUNG_BACK],
  );

export const envelopeBendAt = (t: number) => {
  const held = inWindow(t, ENVELOPE_LIFT) * (1 - inWindow(t, KLOPPEN));
  return {
    bow: held * (FLOPPY.bow + FLOPPY.bowSway * (Math.sin(2 * t) + 0.4 * Math.sin(4.7 * t + 1))),
    twist: held * FLOPPY.twist * (1 + 0.3 * Math.sin(1.3 * t)),
  };
};

const FLAP_LIFT_X = DL[0] - 2 * ENVELOPE.flapChamfer;
const FLAP_LIFT = { x: FLAP_LIFT_X, y: tearY(FLAP_LIFT_X) };

const FLAP_REACH: readonly [number, number] = [KEY_OUT[1], FLAP[0] - 0.25];
const ONTO_THE_FLAP: readonly [number, number] = [FLAP_REACH[1], FLAP[0]];

const flapHandLocal = (t: number) =>
  new Vector3(FLAP_LIFT.x, FLAP_LIFT.y, 0)
    .applyMatrix4(envelopeFlap(flapAt(t)))
    .add(new Vector3(0, 0, -HAND_TOUCH));

export const flapGripAt = (t: number) =>
  flapHandLocal(t).applyMatrix4(envelopeAt(Math.max(t, BOX_OPEN[0]))!);

const LETTER_PULL: readonly [number, number] = [FLAP[1], UNFOLD[0]];
const TO_LETTER: readonly [number, number] = [FLAP[1], FLAP[1] + 0.25];
const LETTER_RISING: readonly [number, number] = [TO_LETTER[1], UNFOLD[0]];
const LETTER_DOWN: readonly [number, number] = [UNFOLD[0], UNFOLD[0] + 0.45];
const UNFOLDING: readonly [number, number] = [LETTER_DOWN[1], UNFOLD[1]];
const LETTER_INSET = DL[0] - A4[0];
const LETTER_START = 0.002;
const LETTER_RISE = 0.12;
const BEHIND = -ENVELOPE.thickness - 0.0012;
const LETTER_REST = (DL[1] - (CREASES[1] - CREASES[0])) / 2;
const FOLD_BACK: readonly [number, number] = [FOLD[0], FOLD[0] + 0.8];
const OVER_THE_MOUTH = FOLD_BACK[1] + 0.35;
const LETTER_IN = FOLD[1] - 0.001;

const letterY = (t: number) => {
  if (t >= FOLD_BACK[1])
    return kf(
      t,
      [FOLD_BACK[1], OVER_THE_MOUTH, FOLD[1]],
      [LETTER_REST, LETTER_START + LETTER_RISE, LETTER_START],
    );
  const raised = LETTER_START + LETTER_RISE * inWindow(t, LETTER_RISING);
  return raised + (LETTER_REST - raised) * inWindow(t, LETTER_DOWN);
};

export const letterAt = (t: number) => {
  if (t < LETTER_PULL[0] || t >= FOLD[1]) return null;
  const envelope = envelopeAt(t)!;
  const y = letterY(t);
  return {
    matrix: envelope
      .clone()
      .multiply(new Matrix4().makeTranslation(LETTER_INSET + A4[0], y, BEHIND))
      .multiply(new Matrix4().makeRotationY(Math.PI)),
    fold: inWindow(t, UNFOLDING) - inWindow(t, FOLD_BACK),
  };
};

const leftOfLetter = (t: number) =>
  onEnvelope(
    letterAt(Math.min(t, LETTER_IN))!.matrix,
    new Vector3(0, (CREASES[1] - CREASES[0]) / 2, 0),
    new Vector3(-1, 0, 0),
  );

export const letterGripAt = (t: number, which: "leftArm" | "rightArm") =>
  which === "rightArm" ? envelopeGripAt(t, "rightArm") : leftOfLetter(t);

const ROUND_THE_EDGE = aroundCorner(
  [FLAP_LIFT.x, BEHIND],
  [DL[0], BEHIND],
  [DL[0], BEHIND + ENVELOPE.thickness],
  HAND_TOUCH,
);

const roundTheEdge = (k: number, y: number, onFlap: Vector3) => {
  const [x, z] = ROUND_THE_EDGE(k);
  const [x0, z0] = ROUND_THE_EDGE(0);
  return new Vector3(x + (onFlap.x - x0) * (1 - k), y, z + (onFlap.z - z0) * (1 - k));
};

const leftHandLocal = (t: number) => {
  const tip = flapHandLocal(FLAP[0]);
  if (t <= ONTO_THE_FLAP[1]) {
    const k = inWindow(t, ONTO_THE_FLAP);
    return roundTheEdge(1 - k, tip.y, tip);
  }
  if (t <= TO_LETTER[0]) return flapHandLocal(t);
  const k = inWindow(t, TO_LETTER);
  const from = flapHandLocal(TO_LETTER[0]);
  const y = letterY(t) + (CREASES[1] - CREASES[0]) / 2;
  return roundTheEdge(k, from.y + (y - from.y) * k, from);
};

const leftHandAt = (t: number) =>
  t >= TO_LETTER[1]
    ? leftOfLetter(t)
    : leftHandLocal(t).applyMatrix4(envelopeAt(Math.max(t, BOX_OPEN[0]))!);

export const LETTER_LEFT_HOLD: Hold = {
  name: "the flap, then the letter, in his left hand",
  arm: "leftArm",
  reach: FLAP_REACH[0],
  grip: FLAP_REACH[1],
  release: FOLD[1] - 0.15,
  done: FOLD[1] + 0.25,
  target: (t) => gripBox(leftHandAt(t)),
  near: leftHandAt,
  exact: true,
};
