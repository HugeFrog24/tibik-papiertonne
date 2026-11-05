import { Vector3 } from "three";
import { kf } from "../../characters/animate";
import { easeUnit } from "../../characters/scalar";
import { doorFrame, fittingsOf, gripSolid } from "../../building/doors";
import type { Hold } from "../../physics/holds";
import { KEY_GRIP, keyBowGrip, keyInLock } from "../../props/keyRingShape";
import { CLOSER_DELAY, CLOSER_TIME, HAUSTUER, closerSwing } from "../../street/facade";
import { BACK_STEP, UNLOCK } from "./choreography";

export const HOUSE_KEY_INSERT = 0.026;
const KEY_APPROACH = 0.25;
const KEY_SLIDE = 0.02;
const INSERTED = UNLOCK[0] + KEY_APPROACH;
const TURN: readonly [number, number] = [INSERTED + 0.05, BACK_STEP[0]];
const TURN_BACK: readonly [number, number] = [BACK_STEP[1] - 0.4, BACK_STEP[1]];
const KEY_OUT: readonly [number, number] = [BACK_STEP[1], BACK_STEP[1] + 0.15];
const PULLED = 0.4;
const WIDE = 1.65;
const LET_GO = BACK_STEP[1];
const COAST = ((WIDE - PULLED) * (BACK_STEP[1] - BACK_STEP[0])) / PULLED;
const SWUNG = LET_GO + COAST;

export const DOOR_SHUT = SWUNG + CLOSER_DELAY + CLOSER_TIME;
export const HOUSE_KEYS_IN_LOCK: readonly [number, number] = [UNLOCK[0], KEY_OUT[1]];

export const haustuerAt = (t: number) => {
  if (t <= BACK_STEP[0]) return 0;
  if (t < LET_GO) {
    const k = (t - BACK_STEP[0]) / (BACK_STEP[1] - BACK_STEP[0]);
    return PULLED * k * k;
  }
  if (t < SWUNG) {
    const u = 1 - (t - LET_GO) / COAST;
    return WIDE - (WIDE - PULLED) * u * u;
  }
  return closerSwing(t, SWUNG, WIDE);
};

const CYLINDER = new Vector3(
  ...fittingsOf(HAUSTUER).faces.find((f) => f.kind === "cylinder" && f.out > 0)!
    .center,
);

export const outerCylinderAt = (angle: number) =>
  CYLINDER.clone().applyMatrix4(doorFrame(HAUSTUER, angle));

const keyDepth = (t: number) => {
  const inserted = easeUnit((t - UNLOCK[0]) / KEY_APPROACH);
  const withdrawn = easeUnit((t - KEY_OUT[0]) / (KEY_OUT[1] - KEY_OUT[0]));
  return (
    HOUSE_KEY_INSERT -
    (HOUSE_KEY_INSERT + KEY_SLIDE) * Math.max(1 - inserted, withdrawn)
  );
};

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

export const indoorsAt = (t: number) => easeUnit((t - (LET_GO + 1.2)) / 0.8);
