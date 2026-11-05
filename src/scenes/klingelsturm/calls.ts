import { HAUSVERWALTUNG } from "../../street/building";
import { lerpVec3, smoothstep, round6 } from "../../characters/scalar";

import { bubbleBox, type Line } from "../../dialogue/line";
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
  { key: "1", at: 29.7 },
  { key: "1", at: 30.1 },
  { key: "0", at: 30.5 },
  { key: "call", at: 30.9 },
];

export const DIALLED = KEYS.filter(
  (k) => k.key !== "call" && k.key !== "end",
).map((k) => ({ digit: k.key, at: k.at }));

export const CLICK = 45.6;
export const LOWERED: readonly [number, number] = [47.0, 47.6];

const PHONE_BOX = bubbleBox(1240, 40, 660, 420, 56);
const KAREN_BOX = bubbleBox(30, 30, 900, 460, 66);

const phone = (from: number, to: number, text: string, name: string): Line => ({
  speaker: "phone",
  from,
  to,
  text,
  name: `Phone: ${name}`,
  tone: "phone",
  box: PHONE_BOX,
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
  box: KAREN_BOX,
});

export const CALL_LINES: readonly Line[] = [
  phone(20.0, 21.5, `${HAUSVERWALTUNG}.`, "Hausverwaltung"),
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
  karen(27.7, 28.9, "DAS IST EIN NOTFALL!", "Das ist ein Notfall"),
  phone(32.0, 33.0, "Polizei-Notruf.", "Polizei-Notruf"),
  phone(33.2, 34.7, "Was ist Ihr Notfall?", "Was ist Ihr Notfall"),
  karen(
    34.9,
    37.9,
    "MEIN NACHBAR HAT EINEN KARTON AUS DEM HAUSMÜLL GENOMMEN!",
    "Karton aus dem Hausmüll",
  ),
  phone(
    38.1,
    40.1,
    "Ist jemand verletzt oder in Gefahr?",
    "Verletzt oder in Gefahr",
  ),
  karen(40.4, 41.4, "…NEIN.", "Nein"),
  karen(41.6, 43.5, "ABER ER SAGT: DER UMWELT ZULIEBE!", "Der Umwelt zuliebe"),
  phone(43.8, 45.4, "Ein Karton ist kein Notfall.", "Kein Notfall"),
];

const PLACES: readonly { readonly at: number; readonly place: PhonePlace }[] = [
  { at: 16.1, place: PHONE_AT_POCKET },
  { at: 16.5, place: PHONE_AT_LOOK },
  { at: 17.05, place: PHONE_AT_LOOK },
  { at: 17.45, place: PHONE_AT_MOUTH },
  { at: 29.0, place: PHONE_AT_MOUTH },
  { at: 29.25, place: PHONE_AT_LOOK },
  { at: 31.1, place: PHONE_AT_LOOK },
  { at: 31.45, place: PHONE_AT_MOUTH },
  { at: 45.7, place: PHONE_AT_MOUTH },
  { at: 46.1, place: PHONE_AT_LOOK },
  { at: LOWERED[0], place: PHONE_AT_LOOK },
  { at: LOWERED[1], place: PHONE_AT_HIP },
];


const between = <T>(
  stops: readonly { readonly at: number; readonly value: T }[],
  t: number,
) => {
  const next = stops.findIndex((p) => p.at > t);
  if (next <= 0) {
    const only = next === 0 ? stops[0] : stops[stops.length - 1];
    return { a: only, b: only, w: 0 };
  }
  const a = stops[next - 1];
  const b = stops[next];
  return { a, b, w: smoothstep((t - a.at) / (b.at - a.at)) };
};

const PLACE_STOPS = PLACES.map((p) => ({ at: p.at, value: p.place }));

export const SETTLED = PLACES[1].at;

export const phonePlaceAt = (t: number): PhonePlace => {
  const { a, b, w } = between(PLACE_STOPS, t);
  return {
    position: lerpVec3(a.value.position, b.value.position, w),
    rotation: lerpVec3(a.value.rotation, b.value.rotation, w),
  };
};

export const readingAt = (t: number) => {
  const { a, b, w } = between(PLACE_STOPS, t);
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

export const phoneAt = (t: number): PhoneState => ({
  inHand: t >= POCKET[1],
  ...phonePlaceAt(t),
  screen: screenAt(t),
});

export type PhoneCue = {
  readonly name: string;
  readonly at: number;
  readonly sound: string;
  readonly volume: number;
  readonly length?: number;
};

const answerOf = (start: string) => {
  const line = CALL_LINES.find(
    (l) => l.speaker === "phone" && l.text.startsWith(start),
  );
  if (!line) throw new Error(`no answer "${start}"`);
  return line;
};

const RING_DELAY = 0.4;
const ringback = (call: KeyPress, start: string): PhoneCue => {
  const at = round6(call.at + RING_DELAY);
  return {
    name: `Ringing: ${start}`,
    at,
    sound: "ringback",
    volume: 0.5,
    length: round6(answerOf(start).from - at),
  };
};

export const phoneCues = (): PhoneCue[] => [
  { name: "Karen pants", at: 0, sound: "panting", volume: 0.55, length: 7.4 },
  ringback(KEYS[0], "Hausverwaltung"),
  { name: "Answering machine beep", at: 27.4, sound: "beep", volume: 0.5 },
  ...DIALLED.map((d) => ({
    name: `Key ${d.digit} @${d.at}`,
    at: d.at,
    sound: `dtmf-${d.digit}`,
    volume: 0.6,
  })),
  ringback(KEYS[KEYS.length - 1], "Polizei"),
  { name: "The line clicks", at: CLICK, sound: "click", volume: 0.6 },
  { name: "Busy tone", at: CLICK + 0.1, sound: "busy", volume: 0.5, length: 2 },
];
