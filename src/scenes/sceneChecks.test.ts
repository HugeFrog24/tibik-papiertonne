import { expect, test } from "vitest";
import type { Contact } from "../physics/collision";
import { Vector3 } from "three";
import { TOLERANCE, VERTICAL_CROP, framesOf, inVerticalCrop, mm, ndcX, penetrations, seconds } from "./sceneChecks";

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

test("a 9:16 crop from the middle of the 16:9 frame keeps 81/256 of its width: a point at the centre is in it, one at the frame's edge is not", () => {
  const setup = { position: [0, 0, 0] as [number, number, number], target: [0, 0, -1] as [number, number, number], fov: 50 };
  expect(VERTICAL_CROP).toBeCloseTo(81 / 256, 12);
  expect(ndcX(new Vector3(0, 0, -2), setup)).toBeCloseTo(0, 9);
  expect(inVerticalCrop(new Vector3(0, 0, -2), setup)).toBe(true);
  const edge = Math.tan((50 * Math.PI) / 360) * (16 / 9) * 2 * 0.95;
  expect(inVerticalCrop(new Vector3(edge, 0, -2), setup)).toBe(false);
});
