import { Quaternion, Vector3, type Matrix4 } from "three";
import { easeUnit } from "../characters/scalar";
import { handPosition } from "../characters/skeleton";
import { KEY_GRIP, keyRingAt, type KeyName } from "../props/keyRingShape";
import { asCharacter, type TibikFrame } from "./character";
import { RIG } from "./rig";

export type Lock = {
  readonly window: readonly [number, number];
  readonly at: (t: number) => Matrix4;
  readonly name: KeyName;
  readonly reach: number;
};

const KEYS_TO_LOCK = 0.3;

const turnOf = (m: Matrix4) => new Quaternion().setFromRotationMatrix(m);

export const keysInHand = (t: number, tibik: TibikFrame, locks: readonly Lock[], carried: KeyName) => {
  const hand = handPosition(RIG, asCharacter(tibik), "leftArm");
  const inHand = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), tibik.rotationY);
  for (const { window: [from, to], at, name, reach } of locks) {
    if (t >= from && t <= to) return at(t);
    const lockTurn = t < from ? easeUnit((t - reach) / (from - reach)) : 1 - easeUnit((t - to) / KEYS_TO_LOCK);
    if (lockTurn > 0) return keyRingAt(hand, inHand.slerp(turnOf(at(t < from ? from : to)), lockTurn), name, KEY_GRIP);
  }
  return keyRingAt(hand, inHand, carried, KEY_GRIP);
};
