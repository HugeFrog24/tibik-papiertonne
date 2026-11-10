import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { LETTER_FOOTER, LETTER_LINES } from "../scenes/rundschreiben/letter";
import { boxGap, obb } from "../physics/collision";
import { CALL_LINES } from "../scenes/klingelsturm/calls";
import { HAUSVERWALTUNG, HAUSVERWALTUNG_ON_THE_PHONE } from "../street/building";
import { DEALER } from "../street/carShape";
import { TONNE_ISSUER } from "../street/tonneShape";
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
  expect(HAUSVERWALTUNG).toBe("HWS Hausverwaltungs-Service GmbH");
  expect(HAUSVERWALTUNG_ON_THE_PHONE).toBe("HWS Hausverwaltung");
  expect(HAUSVERWALTUNG.startsWith(HAUSVERWALTUNG_ON_THE_PHONE)).toBe(true);
  expect(CALL_LINES[0].text).toBe(`${HAUSVERWALTUNG_ON_THE_PHONE}.`);
});

test("no town is named: the letter's date line is the date alone, its footer gives no postcode and town, the stairwell sheet's heading is the Hausverwaltung's own name, and nothing printed or spoken carries a Muster- placeholder", () => {
  expect(LETTER_LINES.find((line) => line.role === "date")!.text).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  expect(LETTER_FOOTER.flat().filter((line) => /^\d{5}\s/.test(line))).toEqual([]);
  expect(HAUSVERWALTUNG_SHEET.heading.join(" ")).toBe(HAUSVERWALTUNG);
  const named = [HAUSVERWALTUNG, TONNE_ISSUER, DEALER, ...LETTER_LINES.map((line) => line.text), ...LETTER_FOOTER.flat(), ...CALL_LINES.map((line) => line.text)];
  expect(named.filter((text) => /muster/i.test(text))).toEqual([]);
  expect(readFileSync("src/building/StairwellSet.tsx", "utf8")).toContain("HAUSVERWALTUNG_SHEET.heading");
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
