import { expect, test } from "vitest";
import { boxGap, obb } from "../physics/collision";
import { CALL_LINES } from "../scenes/klingelsturm/calls";
import { HAUSVERWALTUNG } from "../street/building";
import {
  CORE,
  HAUSVERWALTUNG_SHEET,
  LIGHT_BUTTONS,
  NOTICE_BOARD,
  SMOKE_VENT_BUTTONS,
  buttonSolid,
  smokeVentSolid,
  wallFrame,
} from "./stairwell";

const onEastWall = (center: readonly number[], size: readonly number[]) =>
  obb(
    "sheet",
    wallFrame({
      position: [center[0], center[1], center[2]],
      normal: [-1, 0, 0],
    }),
    [size[0], size[1], 0.002],
  );

test("the Hausverwaltung Karen phones is the one whose sheet hangs in the stairwell", () => {
  expect(CALL_LINES[0].text).toBe(`${HAUSVERWALTUNG}.`);
  expect(HAUSVERWALTUNG).toBe("Hausverwaltung Musterstadt");
});

test("its A5 sheet hangs flat on the hall's east wall beside the notice board, at eye height", () => {
  const [x, y, z] = HAUSVERWALTUNG_SHEET.center;
  expect(HAUSVERWALTUNG_SHEET.size).toEqual([0.148, 0.21]);
  expect(CORE.x1 - x).toBeGreaterThan(0);
  expect(CORE.x1 - x).toBeLessThan(0.02);
  expect(x).toBeCloseTo(NOTICE_BOARD.center[0], 9);
  expect(y).toBeGreaterThanOrEqual(1.4);
  expect(y).toBeLessThanOrEqual(1.8);
  const gap =
    Math.abs(z - NOTICE_BOARD.center[2]) -
    (HAUSVERWALTUNG_SHEET.size[0] + NOTICE_BOARD.size[0]) / 2;
  expect(gap).toBeGreaterThan(0.03);
  expect(gap).toBeLessThan(0.2);
});

test("it keeps clear of the Rauchabzug button and the light buttons", () => {
  const sheet = onEastWall(
    HAUSVERWALTUNG_SHEET.center,
    HAUSVERWALTUNG_SHEET.size,
  );
  for (const other of [
    ...SMOKE_VENT_BUTTONS.map(smokeVentSolid),
    ...LIGHT_BUTTONS.map(buttonSolid),
  ])
    expect(boxGap(sheet, other)).toBeGreaterThan(0.1);
});
