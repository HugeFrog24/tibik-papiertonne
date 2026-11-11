import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { LINES as HAUSMUELL } from "../hausmuell/choreography";
import { KARTON_OPENS, LINES, PAPIERTONNEN_DURATION } from "./choreography";

test("as he opens the box, Karen's 'EY!' carries over from far down the street, off screen, and ends just before the cut, a short beat before she shouts again in Hausmuell", () => {
  expect(LINES).toHaveLength(1);
  const [ey] = LINES;
  expect(ey).toMatchObject({ speaker: "karen", text: "EY!", tone: "shout", far: true });
  expect(ey.from).toBeGreaterThanOrEqual(KARTON_OPENS[0]);
  expect(ey.to).toBeLessThan(PAPIERTONNEN_DURATION);
  const beat = PAPIERTONNEN_DURATION - ey.to + HAUSMUELL[0].from;
  expect(beat).toBeGreaterThanOrEqual(0.3);
  expect(beat).toBeLessThanOrEqual(0.8);
});

test("the scene shows her shout in the subtitle bar", () => {
  const scene = readFileSync(path.join("src", "scenes", "papiertonnen", "Papiertonnen.tsx"), "utf8");
  expect(scene.includes('<DialogueTrack scene="papiertonnen" lines={LINES} />')).toBe(true);
});
