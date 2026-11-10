import { BANGING, later } from "./banging";
import { CODA } from "./cigarette";
import { HAUSVERWALTUNG_ON_THE_PHONE } from "../../street/building";
import { round6 } from "../../characters/scalar";
import { placesAt, stopsAt } from "../../characters/propPlace";

import type { Line } from "../../dialogue/line";
import {
  PHONE_AT_HIP,
  PHONE_AT_LOOK,
  PHONE_AT_MOUTH,
  PHONE_AT_POCKET,
  type Key,
  type PhonePlace,
} from "../../Karen/phoneShape";

export const POCKET: readonly [number, number] = [15.8, 16.1];

export type KeyPress = { readonly key: Key; readonly at: number };

export const KEYS: readonly KeyPress[] = [
  { key: "call", at: 16.8 },
  { key: "end", at: 29.35 },
  { key: "1", at: later(29.7) },
  { key: "1", at: later(30.1) },
  { key: "0", at: later(30.5) },
  { key: "call", at: later(30.9) },
];

export const DIALLED = KEYS.filter(
  (k) => k.key !== "call" && k.key !== "end",
).map((k) => ({ digit: k.key, at: k.at }));

export const CLICK = later(45.6);
export const LOWERED: readonly [number, number] = [later(47.0), later(47.6)];

const phone = (from: number, to: number, text: string, name: string): Line => ({
  speaker: "phone",
  from,
  to,
  text,
  name: `Phone: ${name}`,
  tone: "phone",
});

const karen = (
  from: number,
  to: number,
  text: string,
  name: string,
  tone: Line["tone"] = "shout",
): Line => ({
  speaker: "karen",
  from,
  to,
  text,
  name: `Karen: ${name}`,
  tone,
});

export const CALL_LINES: readonly Line[] = [
  phone(20.0, 21.6, `${HAUSVERWALTUNG_ON_THE_PHONE}.`, "Hausverwaltung"),
  phone(
    21.7,
    24.1,
    "Sie rufen außerhalb unserer Sprechzeiten an.",
    "Sprechzeiten",
  ),
  phone(
    24.3,
    27.3,
    "Bitte hinterlassen Sie eine Nachricht nach dem Signalton.",
    "Signalton",
  ),
  karen(27.7, 28.95, "DAS IST EIN NOTFALL!", "Das ist ein Notfall"),
  karen(
    later(34.9),
    later(37.9),
    "MEIN NACHBAR HAT EINEN KARTON AUS DEM HAUSMÜLL GENOMMEN!",
    "Karton aus dem Hausmüll",
  ),
  phone(
    later(38.1),
    later(40.1),
    "Ist jemand verletzt oder in Gefahr?",
    "Verletzt oder in Gefahr",
  ),
  karen(later(40.4), later(41.4), "…NÖ!", "Nein"),
  karen(later(41.6), later(43.8), "ABER ER SAGT: DER UMWELT ZULIEBE!", "Der Umwelt zuliebe"),
  phone(later(43.8), later(45.4), "Ein Karton ist kein Notfall.", "Kein Notfall"),
];

const PLACES: readonly { readonly at: number; readonly place: PhonePlace }[] = [
  { at: 16.1, place: PHONE_AT_POCKET },
  { at: 16.5, place: PHONE_AT_LOOK },
  { at: 17.05, place: PHONE_AT_LOOK },
  { at: 17.45, place: PHONE_AT_MOUTH },
  { at: 29.0, place: PHONE_AT_MOUTH },
  { at: 29.25, place: PHONE_AT_LOOK },
  { at: BANGING.tuck[0], place: PHONE_AT_LOOK },
  { at: BANGING.tuck[1], place: PHONE_AT_POCKET },
  { at: BANGING.raise[0], place: PHONE_AT_POCKET },
  { at: BANGING.raise[1], place: PHONE_AT_LOOK },
  { at: later(31.1), place: PHONE_AT_LOOK },
  { at: later(31.45), place: PHONE_AT_MOUTH },
  { at: later(45.7), place: PHONE_AT_MOUTH },
  { at: later(46.1), place: PHONE_AT_LOOK },
  { at: LOWERED[0], place: PHONE_AT_LOOK },
  { at: LOWERED[1], place: PHONE_AT_HIP },
  { at: CODA.phoneAway[0], place: PHONE_AT_HIP },
  { at: CODA.phoneAway[1], place: PHONE_AT_POCKET },
];

const PLACE_STOPS = PLACES.map((p) => ({ at: p.at, value: p.place }));

export const SETTLED = PLACES[1].at;

export const phonePlaceAt: (t: number) => PhonePlace = placesAt(PLACES);

export const readingAt = (t: number) => {
  const { a, b, w } = stopsAt(PLACE_STOPS, t);
  const reading = (p: PhonePlace) => (p === PHONE_AT_LOOK ? 1 : 0);
  return reading(a.value) + (reading(b.value) - reading(a.value)) * w;
};

const HANG_UP = KEYS[1].at;

export const screenAt = (t: number) => {
  if (t >= CLICK) return "Anruf beendet";
  if (t < HANG_UP) return "Hausverwaltung";
  return DIALLED.filter((d) => d.at <= t)
    .map((d) => d.digit)
    .join("");
};

export type PhoneState = PhonePlace & {
  readonly inHand: boolean;
  readonly screen: string;
};

export const inHerPocket = (t: number) =>
  t < POCKET[1] || (t >= BANGING.wideCut && t < BANGING.raise[0]) || t >= CODA.mediumCut;

export const phoneAt = (t: number): PhoneState => ({
  inHand: !inHerPocket(t),
  ...phonePlaceAt(t),
  screen: screenAt(t),
});

export type PhoneCue = {
  readonly name: string;
  readonly at: number;
  readonly sound: string;
  readonly volume: number;
  readonly length?: number | undefined;
  readonly fadeOut?: number | undefined;
};

const PANTING_DIES_AWAY = 1.2;

const firstAfter = (call: KeyPress) => {
  const line = CALL_LINES.find((l) => l.from > call.at);
  if (!line) throw new Error(`nobody speaks after the call at ${call.at}`);
  return line;
};

export const CONNECTED = firstAfter(KEYS[KEYS.length - 1]).from;

const RING_DELAY = 0.4;
const ringback = (call: KeyPress, answered: string): PhoneCue => {
  const at = round6(call.at + RING_DELAY);
  return {
    name: `Ringing: ${answered}`,
    at,
    sound: "ringback",
    volume: 0.5,
    length: round6(firstAfter(call).from - at),
  };
};

const BEEP_AFTER_THE_TAPE = 0.1;

export const HOLD_MUSIC = { sound: "warteschleife", volume: 0.25, fadeOut: 0.3 };

const holdMusic = (): PhoneCue => {
  const announcement = CALL_LINES.filter((line) => line.speaker === "phone" && line.from < DIALLED[0].at);
  const at = announcement[0].from;
  return { name: "Hold music under the announcement", at, sound: HOLD_MUSIC.sound, volume: HOLD_MUSIC.volume, length: round6(announcement[announcement.length - 1].to - at), fadeOut: HOLD_MUSIC.fadeOut };
};

export const phoneCues = (): PhoneCue[] => [
  { name: "Karen pants", at: 0, sound: "panting", volume: 0.55, length: 7.2, fadeOut: PANTING_DIES_AWAY },
  {
    name: "Karen pants after pounding on his door",
    at: BANGING.blows[3],
    sound: "panting",
    volume: 0.55,
    length: round6(BANGING.raise[0] - BANGING.blows[3]),
    fadeOut: PANTING_DIES_AWAY,
  },
  ringback(KEYS[0], "Hausverwaltung"),
  holdMusic(),
  { name: "Answering machine beep", at: CALL_LINES.find((l) => l.name === "Phone: Signalton")!.to + BEEP_AFTER_THE_TAPE, sound: "beep", volume: 0.5 },
  ...DIALLED.map((d) => ({
    name: `Key ${d.digit} @${d.at}`,
    at: d.at,
    sound: `dtmf-${d.digit}`,
    volume: 0.6,
  })),
  ringback(KEYS[KEYS.length - 1], "Karen"),
  { name: "The line clicks", at: CLICK, sound: "click", volume: 0.6 },
  { name: "Busy tone", at: CLICK + 0.1, sound: "busy", volume: 0.5, length: 2 },
];
