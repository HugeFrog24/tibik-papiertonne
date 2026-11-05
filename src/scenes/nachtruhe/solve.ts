import type { Matrix4 } from "three";
import { bedroomSolids, type CurtainOpen } from "../../building/bedroomShape";
import type { Solid } from "../../physics/collision";
import type { Hold } from "../../physics/holds";
import { memoByFrame } from "../../physics/memoSolve";
import { BINS } from "../../street/layout";
import type { TibikFrame } from "../../Tibik/character";
import { keysInHand, type Lock } from "../../Tibik/keysInHand";
import { solveTibik } from "../papiertonnen/solve";
import { streetSolids, type StreetState } from "../streetSolids";
import { nachtruheTibikAt, nachtruheWorldAt, type NachtruheWorld } from "./choreography";
import { BEDROOM_HOLDS } from "./bedroom";
import { DUSK, ENTRY } from "./timeline";

export type NachtruheState = NachtruheWorld &
  StreetState & {
    readonly tibik: TibikFrame;
    readonly keys: Matrix4 | null;
  };

export const NACHTRUHE_HOLDS: readonly Hold[] = [ENTRY.hold, ...BEDROOM_HOLDS];

const HOUSE_LOCK: Lock = { window: ENTRY.keysInLock, at: ENTRY.houseKeyInLock, name: "house", reach: ENTRY.hold.reach };
const SHUT_LIDS = BINS.map(() => 0);

const RESTS_ON = new Set(["floor", "mattress", "pillow"]);
const rooms = new Map<string, { readonly solids: readonly Solid[]; readonly ground: readonly Solid[] }>();

const roomAt = (door: number, curtain: CurtainOpen) => {
  const key = `${door}/${curtain.join("/")}`;
  const known = rooms.get(key);
  if (known) return known;
  const solids = bedroomSolids({ door, curtain });
  const room = { solids, ground: solids.filter((s) => RESTS_ON.has(s.name)) };
  rooms.set(key, room);
  return room;
};

const solve = (t: number): NachtruheState => {
  const world = nachtruheWorldAt(t);
  const street: StreetState = { lids: SHUT_LIDS, haustuer: ENTRY.haustuerAt(t), haustuerLever: 0, mailboxDoor: 0, indoors: ENTRY.indoorsAt(t) };
  if (t < DUSK[1]) {
    const tibik = solveTibik(nachtruheTibikAt(t), streetSolids(street), t, NACHTRUHE_HOLDS);
    return { ...world, ...street, tibik, keys: keysInHand(t, tibik, [HOUSE_LOCK], "house") };
  }
  const room = roomAt(world.bedroomDoor, world.curtains);
  const tibik = solveTibik(nachtruheTibikAt(t), room.solids, t, NACHTRUHE_HOLDS, room.ground);
  return { ...world, ...street, tibik, keys: null };
};

export const solveNachtruhe = memoByFrame(solve);
