import type { Matrix4 } from "three";
import type { Solid } from "../../physics/collision";
import type { Hold } from "../../physics/holds";
import { FPS } from "../../frameRate";
import { memoWithArms } from "../../physics/memoSolve";
import type { ArmHistory } from "../../physics/armHistory";
import { BINS } from "../../street/layout";
import type { TibikFrame } from "../../Tibik/character";
import { solveTibik } from "../papiertonnen/solve";
import { streetSolids, type StreetState } from "../streetSolids";
import {
  HAUSTUER_HOLD,
  HOUSE_KEYS_IN_LOCK,
  haustuerAt,
  houseKeyInLock,
  indoorsAt,
} from "./home";
import { keysInHand, type Lock } from "../../Tibik/keysInHand";
import {
  ENVELOPE_LEFT_HOLD,
  ENVELOPE_RIGHT_HOLD,
  KEYS_IN_LOCK,
  KEY_HOLD,
  KEY_REGRIP,
  KEY_SHUT_HOLD,
  UNDER_THE_DOOR_HOLD,
  BACK_UNDER_THE_DOOR_HOLD,
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
  UNDER_THE_DOOR_HOLD,
  ENVELOPE_LEFT_HOLD,
  BACK_UNDER_THE_DOOR_HOLD,
  KEY_SHUT_HOLD,
  ENVELOPE_RIGHT_HOLD,
  LETTER_LEFT_HOLD,
  LID_HOLD,
  HAUSTUER_HOLD,
];

const envelopeOf = (t: number) => {
  const matrix = envelopeAt(t);
  return matrix ? { matrix, flap: flapAt(t), ...envelopeBendAt(t) } : null;
};

const LOCKS: readonly Lock[] = [
  { window: KEYS_IN_LOCK, at: keysInLock, name: "mailbox", reach: KEY_HOLD.reach },
  { window: HOUSE_KEYS_IN_LOCK, at: houseKeyInLock, name: "house", reach: HAUSTUER_HOLD.reach },
];

const keysAt = (t: number, tibik: TibikFrame) => keysInHand(t, tibik, LOCKS, t < KEY_REGRIP ? "mailbox" : "house");

export const rundschreibenSolids: (state: StreetState) => Solid[] = streetSolids;

const solve = (t: number, history: ArmHistory): RundschreibenState => {
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
    undefined,
    { history: history.of("Tibik"), at: t },
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

export const solveRundschreiben = memoWithArms(FPS, solve);
