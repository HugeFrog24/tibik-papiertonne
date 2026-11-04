import { expect, test } from "vitest";
import { LINES } from "../scenes/hausmuell/choreography";
import type { Line } from "./line";
import { bubbleShapes, depthIn } from "./SpeechBubble";
import { lineFrames } from "./DialogueTrack";
import {
  duzen,
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
  box: { left: 0, top: 0, width: 600, height: 300, fontSize: 50 },
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

test("a voice on the phone gets a zigzag tail", () => {
  const vertices = (path: string) =>
    path.split(/[ML]/).filter((p) => p.trim()).length;
  const target = { x: 300, y: 600 };
  const calm = bubbleShapes(600, 300, target, "calm").tail;
  const phone = bubbleShapes(600, 300, target, "phone").tail;
  expect(vertices(phone)).toBeGreaterThan(vertices(calm) + 2);
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

test("a tail aimed at the bubble's own centre still draws", () => {
  expect(bubbleShapes(600, 300, { x: 300, y: 132 }, "phone").tail).not.toMatch(
    /NaN/,
  );
  expect(bubbleShapes(600, 300, { x: 300, y: 132 }, "calm").tail).not.toMatch(
    /NaN/,
  );
});

test("bubbles that follow each other never share a frame, at any frame rate", () => {
  const lines = [
    line({ from: 4.2, to: 5.5 }),
    line({ from: 5.5, to: 7.65 }),
    line({ from: 7.65, to: 9.9 }),
  ];
  for (const fps of [24, 25, 30, 60]) {
    const frames = lines.map((l) => lineFrames(l, fps));
    for (let i = 1; i < frames.length; i++)
      expect(frames[i - 1].from + frames[i - 1].duration).toBeLessThanOrEqual(
        frames[i].from,
      );
  }
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

test("one phrase per bubble", () => {
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

test("every bubble stays up long enough to read: 5/6 s at least, 20 characters a second at most", () => {
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

test("a tail grows out of its bubble: its base is buried in the body, ink line and all", () => {
  const problems: string[] = [];
  for (const tone of ["shout", "calm", "phone"] as const)
    for (const [width, height] of [
      [600, 300],
      [760, 400],
      [860, 410],
      [1040, 460],
      [520, 220],
    ])
      for (let k = 0; k < 72; k++) {
        const angle = (k / 72) * 2 * Math.PI;
        const target = {
          x: width / 2 + Math.cos(angle) * 900,
          y: height * 0.44 + Math.sin(angle) * 900,
        };
        const shape = bubbleShapes(width, height, target, tone);
        for (const corner of shape.base) {
          const depth = depthIn(corner, shape.outline);
          if (depth < shape.stroke + 1)
            problems.push(
              `${tone} ${width}x${height} at ${k * 5}°: base ${depth.toFixed(0)} px inside`,
            );
        }
      }
  expect(problems.slice(0, 8)).toEqual([]);
});
