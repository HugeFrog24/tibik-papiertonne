import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

const SCENES = path.resolve(__dirname);

test("every scene draws its street with the film's breeze, so the trees always sway", () => {
  const still: string[] = [];
  for (const scene of readdirSync(SCENES, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    for (const file of readdirSync(path.join(SCENES, scene.name)).filter((f) => f.endsWith(".tsx"))) {
      const text = readFileSync(path.join(SCENES, scene.name, file), "utf8");
      for (const [tag] of text.matchAll(/<Street\b[^>]*>/gs))
        if (!/windAt=/.test(tag)) still.push(`${scene.name}/${file}: ${tag.replace(/\s+/g, " ").slice(0, 80)}`);
    }
  }
  expect(still).toEqual([]);
});
