import { Vector3 } from "three";
import { expect, test } from "vitest";
import { FORMATS } from "../frameRate";
import type { CameraSetup } from "../toon/shots";
import { onScreen, seenBy } from "./screen";

const SETUP: CameraSetup = { position: [0, 1.5, 5], target: [0, 1.5, 0], fov: 60 };

test("a point straight ahead projects to the middle of the frame in both formats", () => {
  for (const format of ["wide", "tall"] as const) {
    const [x, y] = onScreen(new Vector3(0, 1.5, 0), SETUP, format);
    expect(x).toBeCloseTo(FORMATS[format].width / 2, 6);
    expect(y).toBeCloseTo(FORMATS[format].height / 2, 6);
  }
});

test("a point 40° to the side is in the wide frame and outside the tall one", () => {
  const aside = new Vector3(5 * Math.tan((40 * Math.PI) / 180), 1.5, 0);
  expect(seenBy(aside, SETUP, 0, "wide")).toBe(true);
  expect(seenBy(aside, SETUP, 0, "tall")).toBe(false);
});
