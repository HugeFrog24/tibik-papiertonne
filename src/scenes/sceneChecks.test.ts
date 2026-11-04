import { expect, test } from "vitest";
import type { Contact } from "../physics/collision";
import { TOLERANCE, framesOf, mm, penetrations, seconds } from "./sceneChecks";

const contact = (a: string, b: string, depth: number) =>
  ({ a, b, depth }) as Contact;

test("penetrations reports every contact deeper than the tolerance, labelled by its time, and nothing shallower", () => {
  const hits = penetrations(
    [0.5, 1],
    (t) =>
      t === 0.5
        ? [contact("hand", "door", 0.012), contact("foot", "mat", TOLERANCE)]
        : [contact("elbow", "wall", TOLERANCE + 0.0005)],
    seconds,
  );
  expect(hits).toEqual([
    "0.50 s: hand is 12 mm inside door",
    "1.00 s: elbow is 6 mm inside wall",
  ]);
});

test("framesOf lists every frame index before the end, in steps", () => {
  expect(framesOf(1, 30)).toHaveLength(30);
  expect(framesOf(28.5, 30)).toHaveLength(855);
  expect(framesOf(12, 30, 5)).toEqual(
    Array.from({ length: 72 }, (_, i) => i * 5),
  );
  expect(Math.max(...framesOf(12.01, 30))).toBe(360);
});

test("mm writes a length in metres as millimetres, one decimal unless told otherwise", () => {
  expect(mm(0.0123)).toBe("12.3 mm");
  expect(mm(-0.5, 0)).toBe("-500 mm");
  expect(mm(0.00012, 2)).toBe("0.12 mm");
  expect(mm(0.0125, 0)).toBe("13 mm");
});
