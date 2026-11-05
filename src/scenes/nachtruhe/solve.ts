import type { Matrix4 } from "three";
import type { Hold } from "../../physics/holds";
import { memoByFrame } from "../../physics/memoSolve";
import { BINS } from "../../street/layout";
import type { TibikFrame } from "../../Tibik/character";
import { keysInHand, type Lock } from "../../Tibik/keysInHand";
import { solveTibik } from "../papiertonnen/solve";
import { streetSolids, type StreetState } from "../streetSolids";
import { nachtruheTibikAt, nachtruheWorldAt, type NachtruheWorld } from "./choreography";
import { DUSK, ENTRY } from "./timeline";

export type NachtruheState = NachtruheWorld &
  StreetState & {
    readonly tibik: TibikFrame;
    readonly keys: Matrix4 | null;
  };

export const NACHTRUHE_HOLDS: readonly Hold[] = [ENTRY.hold];

const HOUSE_LOCK: Lock = { window: ENTRY.keysInLock, at: ENTRY.houseKeyInLock, name: "house", reach: ENTRY.hold.reach };
const SHUT_LIDS = BINS.map(() => 0);

const solve = (t: number): NachtruheState => {
  const street: StreetState = { lids: SHUT_LIDS, haustuer: ENTRY.haustuerAt(t), haustuerLever: 0, mailboxDoor: 0, indoors: ENTRY.indoorsAt(t) };
  const tibik = solveTibik(nachtruheTibikAt(t), streetSolids(street), t, NACHTRUHE_HOLDS);
  return {
    ...nachtruheWorldAt(t),
    ...street,
    tibik,
    keys: t < DUSK[1] ? keysInHand(t, tibik, [HOUSE_LOCK], "house") : null,
  };
};

export const solveNachtruhe = memoByFrame(solve);
