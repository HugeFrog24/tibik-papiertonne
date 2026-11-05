import { Vector3 } from "three";
import { kf } from "../../characters/animate";
import { easeUnit } from "../../characters/scalar";
import { coastTime, doorFrame, fittingsOf, gripSolid, pulledThenCoasting } from "../../building/doors";
import type { Hold } from "../../physics/holds";
import { KEY_APPROACH, KEY_GRIP, keyBowGrip, keyDepthAt, keyInLock } from "../../props/keyRingShape";
import { HAUSTUER, closerEnd, closerSwing } from "../../street/facade";
import { BACK_STEP, UNLOCK } from "./choreography";

export const HOUSE_KEY_INSERT = 0.026;
const INSERTED = UNLOCK[0] + KEY_APPROACH;
const TURN: readonly [number, number] = [INSERTED + 0.05, BACK_STEP[0]];
const TURN_BACK: readonly [number, number] = [BACK_STEP[1] - 0.4, BACK_STEP[1]];
const KEY_OUT: readonly [number, number] = [BACK_STEP[1], BACK_STEP[1] + 0.15];
const PULLED = 0.4;
export const HAUSTUER_WIDE = 1.65;
const SWUNG = BACK_STEP[1] + coastTime(BACK_STEP, PULLED, HAUSTUER_WIDE);

export const DOOR_SHUT = closerEnd(SWUNG);
export const HOUSE_KEYS_IN_LOCK: readonly [number, number] = [UNLOCK[0], KEY_OUT[1]];

export const HAUSTUER_SOUNDS = {
  keyIn: INSERTED,
  unlocked: TURN[1],
  opens: BACK_STEP[0],
  keyOut: KEY_OUT[0],
  shut: DOOR_SHUT,
} as const;

export const haustuerAt = (t: number) =>
  t < SWUNG
    ? pulledThenCoasting(t, BACK_STEP, PULLED, HAUSTUER_WIDE)
    : closerSwing(t, SWUNG, HAUSTUER_WIDE);

const CYLINDER = new Vector3(
  ...fittingsOf(HAUSTUER).faces.find((f) => f.kind === "cylinder" && f.out > 0)!
    .center,
);

export const outerCylinderAt = (angle: number) =>
  CYLINDER.clone().applyMatrix4(doorFrame(HAUSTUER, angle));

const keyDepth = (t: number) =>
  keyDepthAt(t, [UNLOCK[0], INSERTED], KEY_OUT, HOUSE_KEY_INSERT);

const keyTurn = (t: number) =>
  kf(t, [TURN[0], TURN[1], TURN_BACK[0], TURN_BACK[1]], [0, Math.PI, Math.PI, 0]);

export const houseKeyInLock = (t: number) =>
  keyInLock(
    doorFrame(HAUSTUER, haustuerAt(t)),
    CYLINDER,
    "house",
    keyDepth(t),
    keyTurn(t),
  );

const leftHandAt = (t: number) =>
  keyBowGrip(houseKeyInLock(Math.min(t, KEY_OUT[1])), "house", KEY_GRIP);

export const HAUSTUER_HOLD: Hold = {
  name: "his house key, turned to pull the Haustür open",
  arm: "leftArm",
  reach: UNLOCK[0] - 0.4,
  grip: UNLOCK[0],
  release: KEY_OUT[1],
  done: KEY_OUT[1] + 0.3,
  target: (t) => gripSolid(HAUSTUER, haustuerAt(t), "outer"),
  near: leftHandAt,
  exact: true,
};

export const indoorsAt = (t: number) => easeUnit((t - (BACK_STEP[1] + 1.2)) / 0.8);
