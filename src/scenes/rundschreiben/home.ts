import { closerSwing } from "../../street/facade";
import { ENTRY, OUT_OF_THE_HOUSE } from "./choreography";

export { HAUSTUER_WIDE, HOUSE_KEY_INSERT, outerCylinderAt } from "../enterHouse";

export const DOOR_SHUT = ENTRY.doorShut;
export const HOUSE_KEYS_IN_LOCK = ENTRY.keysInLock;
export const HAUSTUER_SOUNDS = ENTRY.sounds;
export const HAUSTUER_HOLD = ENTRY.hold;
export const { houseKeyInLock, indoorsAt } = ENTRY;

export const haustuerAt = (t: number) =>
  Math.max(closerSwing(t, OUT_OF_THE_HOUSE.release, OUT_OF_THE_HOUSE.held), ENTRY.haustuerAt(t));
