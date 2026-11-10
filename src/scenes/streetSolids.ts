import { indoorSolids } from "../building/flurShape";
import type { Solid } from "../physics/collision";
import { lazy } from "../physics/lazy";
import { worldSolids } from "../street/layout";
import { mailboxDoorSolid } from "../street/mailboxDoorShape";

export type StreetState = {
  readonly lids: readonly number[];
  readonly haustuer: number;
  readonly haustuerLever: number;
  readonly mailboxDoor: number;
  readonly indoors: number;
};

const INDOORS = lazy(() => indoorSolids({ tibik: 0 }));

export const streetSolids = (state: StreetState): Solid[] => [
  ...worldSolids(state.lids, state.haustuer, state.haustuerLever),
  mailboxDoorSolid(state.mailboxDoor),
  ...(state.haustuer > 0 || state.indoors > 0 ? INDOORS() : []),
];
