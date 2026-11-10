import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { LINES } from "../scenes/hausmuell/choreography";
import type { Line } from "./line";
import { LETTER_LINES } from "../scenes/rundschreiben/letter";
import { ALL_SPOKEN_LINES } from "../scenes/spokenLines";
import {
  duzen,
  foreignQuotes,
  karenNotShouting,
  morePhrasesThanOne,
  outOfOrder,
  tooFastToRead,
} from "./rules";

const line = (over: Partial<Line>): Line => ({
  speaker: "tibik",
  from: 0,
  to: 1,
  text: "Guten Tag.",
  name: "test",
  tone: "calm",
  ...over,
});

test("lines never overlap and run in order", () => {
  expect(outOfOrder(LINES)).toEqual([]);
  expect(
    outOfOrder([line({ from: 0, to: 2 }), line({ from: 1, to: 3 })]),
  ).not.toEqual([]);
});

test("karen always shouts in capitals", () => {
  expect(karenNotShouting(LINES)).toEqual([]);
  expect(
    karenNotShouting([
      line({ speaker: "karen", tone: "shout", text: "Hallo" }),
    ]),
  ).not.toEqual([]);
});

test("strangers say Sie", () => {
  expect(duzen(LINES)).toEqual([]);
  expect(duzen([line({ text: "Was machst du da?" })])).not.toEqual([]);
});

test("capitals with ß still count as shouting", () => {
  expect(
    karenNotShouting([
      line({ speaker: "karen", tone: "shout", text: "SIE HEIßEN?" }),
    ]),
  ).toEqual([]);
});

test("only a real du is caught, not letters after an umlaut", () => {
  expect(duzen([line({ text: "Grüße an Frau Müdu" })])).toEqual([]);
  expect(duzen([line({ text: "Hörst du?" })])).not.toEqual([]);
});

test("Karen shouts every line, her hesitation too", () => {
  expect(
    karenNotShouting([
      line({ speaker: "karen", tone: "shout", text: "…NEIN." }),
    ]),
  ).toEqual([]);
  expect(
    karenNotShouting([
      line({ speaker: "karen", tone: "calm", text: "…Nein." }),
    ]),
  ).not.toEqual([]);
  expect(
    karenNotShouting([
      line({ speaker: "karen", tone: "calm", text: "…NEIN." }),
    ]),
  ).not.toEqual([]);
});

test("one phrase per line", () => {
  expect(morePhrasesThanOne(LINES)).toEqual([]);
  expect(morePhrasesThanOne([line({ text: "…WIE BITTE?!" })])).toEqual([]);
  expect(
    morePhrasesThanOne([line({ text: "ABER ER SAGT: DER UMWELT ZULIEBE!" })]),
  ).toEqual([]);
  expect(
    morePhrasesThanOne([line({ text: "SCHULZ! ICH WOHNE IHNEN GEGENÜBER!" })]),
  ).not.toEqual([]);
  expect(
    morePhrasesThanOne([
      line({ text: "Polizei-Notruf. Wo genau ist der Notfall?" }),
    ]),
  ).not.toEqual([]);
});

test("every line stays up long enough to read: 5/6 s at least, 20 characters a second at most", () => {
  expect(tooFastToRead(LINES)).toEqual([]);
  expect(tooFastToRead([line({ from: 0, to: 0.8, text: "Ja." })])).not.toEqual(
    [],
  );
  expect(
    tooFastToRead([
      line({ from: 0, to: 1.5, text: "Haben Sie überhaupt eine Weisungsbefugnis?" }),
    ]),
  ).not.toEqual([]);
  expect(
    tooFastToRead([
      line({ from: 0, to: 2.1, text: "Haben Sie überhaupt eine Weisungsbefugnis?" }),
    ]),
  ).toEqual([]);
});

test("on-screen German quotes with „…“ only: no straight, English or French quotation marks, every „ closed by a “", () => {
  expect(foreignQuotes(["Er sagte „Nein“.", "Geht’s?", "‚Kurz‘ zitiert."])).toEqual([]);
  expect(foreignQuotes(['Er sagte "Nein".'])).not.toEqual([]);
  expect(foreignQuotes(["Er sagte “Nein”."])).not.toEqual([]);
  expect(foreignQuotes(["Er sagte «Nein»."])).not.toEqual([]);
  expect(foreignQuotes(["Er sagte „Nein."])).not.toEqual([]);
  const film = ALL_SPOKEN_LINES.map((l) => l.text).concat(LETTER_LINES.map((l) => l.text));
  expect(foreignQuotes(film)).toEqual([]);
});

test("every scene with lines places one DialogueTrack, which names its own timeline track, instead of wrapping it by hand", () => {
  for (const scene of ["papiertonnen/Papiertonnen", "hausmuell/Hausmuell", "klingelsturm/Klingelsturm", "rundschreiben/Rundschreiben"]) {
    const source = readFileSync(`src/scenes/${scene}.tsx`, "utf8");
    expect(source, scene).toMatch(/<DialogueTrack lines=\{\w+\}( name="Narration")?( inside=\{\w+\})? \/>/);
    expect(source, scene).not.toMatch(/<Track name="(Dialogue|Narration)">/);
  }
});
