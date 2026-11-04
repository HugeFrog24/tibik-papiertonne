import { existsSync } from "node:fs";
import { expect, test } from "vitest";
import { FPS } from "../../timeline";
import { HAUSTUER_LATCHED } from "./choreography";
import { PAPIERTONNEN_CUES } from "./soundCues";

test("the Haustür swings shut on its closer and its latch catches right after", () => {
  const shut = PAPIERTONNEN_CUES.find((c) => /doorClose/.test(c.file))!;
  const latch = PAPIERTONNEN_CUES.find((c) => /metalLatch/.test(c.file))!;
  expect(latch).toBeDefined();
  expect(Math.abs(latch.at - HAUSTUER_LATCHED)).toBeLessThan(1 / FPS);
  expect(latch.at).toBeGreaterThan(shut.at);
});

test("the box comes out of the paper with a paper sound, not a cloth rustle", () => {
  const out = PAPIERTONNEN_CUES.find((c) => c.name === "Box pulled out")!;
  expect(out.file).not.toMatch(/cloth/);
  expect(out.file).toMatch(/book/);
});

test("every local sound a cue names exists", () => {
  for (const c of PAPIERTONNEN_CUES)
    if (!c.file.startsWith("http"))
      expect(existsSync(`public/sfx/${c.file}`), c.file).toBe(true);
});
