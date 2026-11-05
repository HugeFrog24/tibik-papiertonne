import { Matrix4, Quaternion, Vector3 } from "three";
import type { Solid } from "../../physics/collision";
import type { Hold } from "../../physics/holds";
import { lazy } from "../../physics/lazy";
import { memoByFrame } from "../../physics/memoSolve";
import { BINS, worldSolids } from "../../street/layout";
import { mailboxDoorSolid } from "../../street/mailboxDoorShape";
import type { TibikFrame } from "../../Tibik/character";
import { solveTibik } from "../papiertonnen/solve";
import { indoorSolids } from "../../building/flurShape";
import {
  HAUSTUER_HOLD,
  HOUSE_KEYS_IN_LOCK,
  haustuerAt,
  houseKeyInLock,
  indoorsAt,
} from "./home";
import { easeUnit } from "../../characters/scalar";
import { handPosition } from "../../characters/skeleton";
import { KEY_GRIP, keyRingAt } from "../../props/keyRingShape";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import {
  ENVELOPE_LEFT_HOLD,
  ENVELOPE_RIGHT_HOLD,
  KEYS_IN_LOCK,
  KEY_HOLD,
  KEY_REGRIP,
  KEY_SHUT_HOLD,
  LETTER_LEFT_HOLD,
  LID_HOLD,
  PAPER_BIN,
  envelopeAt,
  envelopeBendAt,
  flapAt,
  letterAt,
  keysInLock,
  lampOnAt,
  mailboxDoorAt,
  paperLidAt,
  rundschreibenTibikAt,
} from "./choreography";

export type RundschreibenState = {
  readonly tibik: TibikFrame;
  readonly haustuer: number;
  readonly haustuerLever: number;
  readonly lids: readonly number[];
  readonly mailboxDoor: number;
  readonly envelope: {
    readonly matrix: Matrix4;
    readonly flap: number;
    readonly bow: number;
    readonly twist: number;
  } | null;
  readonly letter: { readonly matrix: Matrix4; readonly fold: number } | null;
  readonly keys: Matrix4 | null;
  readonly lampOn: boolean;
  readonly indoors: number;
};

export const RUNDSCHREIBEN_HOLDS: readonly Hold[] = [
  KEY_HOLD,
  ENVELOPE_LEFT_HOLD,
  KEY_SHUT_HOLD,
  ENVELOPE_RIGHT_HOLD,
  LETTER_LEFT_HOLD,
  LID_HOLD,
  HAUSTUER_HOLD,
];

const KEYS_TO_LOCK = 0.3;


const envelopeOf = (t: number) => {
  const matrix = envelopeAt(t);
  return matrix ? { matrix, flap: flapAt(t), ...envelopeBendAt(t) } : null;
};

const LOCKS = [
  { window: KEYS_IN_LOCK, at: keysInLock, name: "mailbox", reach: KEY_HOLD.reach },
  { window: HOUSE_KEYS_IN_LOCK, at: houseKeyInLock, name: "house", reach: HAUSTUER_HOLD.reach },
] as const;

const turnOf = (m: Matrix4) => new Quaternion().setFromRotationMatrix(m);

const keysAt = (t: number, tibik: TibikFrame) => {
  const hand = handPosition(RIG, asCharacter(tibik), "leftArm");
  const carried = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), tibik.rotationY);
  for (const { window: [from, to], at, name, reach } of LOCKS) {
    if (t >= from && t <= to) return at(t);
    const lockTurn =
      t < from
        ? easeUnit((t - reach) / (from - reach))
        : 1 - easeUnit((t - to) / KEYS_TO_LOCK);
    if (lockTurn > 0)
      return keyRingAt(hand, carried.slerp(turnOf(at(t < from ? from : to)), lockTurn), name, KEY_GRIP);
  }
  return keyRingAt(hand, carried, t < KEY_REGRIP ? "mailbox" : "house", KEY_GRIP);
};

const INDOORS = lazy(() => indoorSolids({ tibik: 0 }));

export const rundschreibenSolids = (
  state: Pick<
    RundschreibenState,
    "lids" | "haustuer" | "haustuerLever" | "mailboxDoor" | "indoors"
  >,
): Solid[] => [
  ...worldSolids(state.lids, state.haustuer, state.haustuerLever),
  mailboxDoorSolid(state.mailboxDoor),
  ...(state.haustuer > 0 || state.indoors > 0 ? INDOORS() : []),
];

const solve = (t: number): RundschreibenState => {
  const scene = {
    lids: BINS.map((bin) => (bin === PAPER_BIN ? paperLidAt(t) : 0)),
    haustuer: haustuerAt(t),
    haustuerLever: 0,
    mailboxDoor: mailboxDoorAt(t),
    indoors: indoorsAt(t),
  };
  const tibik = solveTibik(
    rundschreibenTibikAt(t),
    rundschreibenSolids(scene),
    t,
    RUNDSCHREIBEN_HOLDS,
  );
  return {
    ...scene,
    tibik,
    envelope: envelopeOf(t),
    letter: letterAt(t),
    keys: keysAt(t, tibik),
    lampOn: lampOnAt(t),
  };
};

export const solveRundschreiben = memoByFrame(solve);
