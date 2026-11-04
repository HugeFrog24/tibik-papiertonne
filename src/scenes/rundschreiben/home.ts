import { Vector3 } from "three";
import { kf } from "../../characters/animate";
import { easeUnit } from "../../characters/scalar";
import { doorFrame, fittingsOf, gripSolid } from "../../building/doors";
import type { Hold } from "../../physics/holds";
import { KEY_GRIP, keyBowGrip, keyInLock } from "../../props/keyRingShape";
import { HAUSTUER, closerSwing } from "../../street/facade";
import { HAND_TOUCH, IN, UNLOCK } from "./choreography";

export const HOUSE_KEY_INSERT = 0.026;
const KEY_APPROACH = 0.25;
const KEY_SLIDE = 0.02;
const INSERTED = UNLOCK[0] + KEY_APPROACH;
const TURN: readonly [number, number] = [INSERTED + 0.05, INSERTED + 0.35];
const CRACK: readonly [number, number] = [TURN[1], TURN[1] + 0.15];
const TURN_BACK: readonly [number, number] = [CRACK[1], UNLOCK[1]];
const KEY_OUT: readonly [number, number] = [UNLOCK[1], UNLOCK[1] + 0.2];
const TO_THE_LEAF: readonly [number, number] = [KEY_OUT[1], IN[0] + 0.4];
export const PUSHED: readonly [number, number] = [TO_THE_LEAF[1], TO_THE_LEAF[1] + 0.02];
const AJAR = 0.015;
const SHOVED = 0.032;
const WIDE = 1.5;
const LET_GO = PUSHED[1];
const COAST = ((WIDE - SHOVED) * (PUSHED[1] - PUSHED[0])) / (SHOVED - AJAR);
const SWUNG = LET_GO + COAST;
const DWELL = 0.3;
const CLOSING = 4;
const LEAF_GRIP = { x: 1.02, y: 1.15 };

export const DOOR_SHUT = SWUNG + DWELL + CLOSING;
export const HOUSE_KEYS_IN_LOCK: readonly [number, number] = [UNLOCK[0], KEY_OUT[1]];

export const haustuerAt = (t: number) => {
  if (t < PUSHED[0]) return kf(t, [...CRACK], [0, AJAR]);
  if (t < LET_GO) {
    const k = (t - PUSHED[0]) / (PUSHED[1] - PUSHED[0]);
    return AJAR + (SHOVED - AJAR) * k * k;
  }
  if (t < SWUNG) {
    const u = 1 - (t - LET_GO) / COAST;
    return WIDE - (WIDE - SHOVED) * u * u;
  }
  return closerSwing(t, SWUNG + DWELL, WIDE, CLOSING);
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

export const haustuerLeafGripAt = (t: number) =>
  new Vector3(
    LEAF_GRIP.x,
    LEAF_GRIP.y,
    HAUSTUER.thickness / 2 + HAND_TOUCH,
  ).applyMatrix4(doorFrame(HAUSTUER, haustuerAt(t)));

const leftHandAt = (t: number) => {
  const onKey = keyBowGrip(
    houseKeyInLock(Math.min(t, TO_THE_LEAF[0])),
    "house",
    KEY_GRIP,
  );
  if (t <= TO_THE_LEAF[0]) return onKey;
  return onKey.lerp(
    haustuerLeafGripAt(t),
    easeUnit((t - TO_THE_LEAF[0]) / (TO_THE_LEAF[1] - TO_THE_LEAF[0])),
  );
};

export const HAUSTUER_HOLD: Hold = {
  name: "his house key, then a flick on the Haustür's leaf",
  arm: "leftArm",
  reach: UNLOCK[0] - 0.4,
  grip: UNLOCK[0],
  release: LET_GO,
  done: LET_GO + 0.3,
  target: (t) => gripSolid(HAUSTUER, haustuerAt(t), "outer"),
  near: leftHandAt,
  exact: true,
};

export const indoorsAt = (t: number) => easeUnit((t - (LET_GO + 0.5)) / 0.8);
