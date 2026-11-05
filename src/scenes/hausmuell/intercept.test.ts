import { expect, test } from "vitest";
import { KARTON_OPENS, PAPIERTONNEN_DURATION } from "../papiertonnen/choreography";
import { KAREN_SPOT, LINES, facing, tibikAt } from "./choreography";
import { FOUND_IT } from "../papiertonnen/soundCues";
import { HAUSMUELL_CUES } from "./soundCues";

const apart = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const EXIT_HEADING = -Math.PI / 2;

test("Karen catches him in the act: her first shout comes within 0.8 s of the carton popping open, across the cut", () => {
  const shout = LINES.find((l) => l.speaker === "karen")!;
  expect(PAPIERTONNEN_DURATION - KARTON_OPENS[1] + shout.from).toBeLessThanOrEqual(0.8);
});

test("when she shouts he is already turning away to leave with the box, not standing and waiting for her", () => {
  const shout = LINES.find((l) => l.speaker === "karen")!;
  const start = tibikAt(0);
  const caught = tibikAt(shout.from);
  expect(apart(caught.rotationY, start.rotationY)).toBeGreaterThan(0.4);
  expect(apart(caught.rotationY, EXIT_HEADING)).toBeLessThan(apart(start.rotationY, EXIT_HEADING));
  expect(apart(caught.rotationY, facing(caught.position, KAREN_SPOT))).toBeGreaterThan(Math.PI / 2);
});

test("his found-it ding rings on over the cut until the record scratch cuts it off, just before her shout", () => {
  const shout = LINES.find((l) => l.speaker === "karen")!;
  const scratch = HAUSMUELL_CUES.find((c) => /record-scratch/.test(c.src))!;
  expect(shout.from - scratch.at).toBeGreaterThan(0);
  expect(shout.from - scratch.at).toBeLessThanOrEqual(0.15);
  const ding = HAUSMUELL_CUES.find((c) => c.src === FOUND_IT.file)!;
  expect(ding.at).toBe(0);
  expect(ding.skip).toBeCloseTo(PAPIERTONNEN_DURATION - FOUND_IT.at, 9);
  expect(ding.length).toBeCloseTo(scratch.at, 9);
});
