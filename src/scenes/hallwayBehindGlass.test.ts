import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { sourceFiles } from "../tooling/sourceFiles";

const drawnWhenever = (source: string, tag: string) => {
  const lines = source.split(/\r?\n/);
  const at = lines.findIndex((line) => line.includes(`<${tag}`));
  if (at < 0) return false;
  const before = lines.slice(0, at).reverse().find((line) => line.trim() !== "") ?? "";
  const head = lines[at].slice(0, lines[at].indexOf(`<${tag}`));
  return !/\?|&&/.test(head) && !/(\?|&&) \(?\s*$/.test(before);
};

test("every scene that shows the street draws the hallway behind the Haustür in every frame, since its glass shows the hallway whether the door is open or shut", () => {
  const scenes = sourceFiles("src/scenes").filter((file) => file.endsWith(".tsx") && /<Street\b/.test(readFileSync(file, "utf8")));
  expect(scenes.length).toBeGreaterThanOrEqual(6);
  const missing = scenes.filter((file) => !drawnWhenever(readFileSync(file, "utf8"), "StairwellSet")).map((file) => path.basename(file));
  expect(missing).toEqual([]);
});
