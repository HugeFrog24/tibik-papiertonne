import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

test("every printed surface on the street takes the day's light, so nothing glows under a grey sky", () => {
  const dir = path.resolve(__dirname);
  const unlit: string[] = [];
  for (const file of readdirSync(dir).filter((f) => /\.tsx$/.test(f))) {
    for (const [material] of readFileSync(path.join(dir, file), "utf8").matchAll(/<meshBasicMaterial\b[^>]*?\/>/gs)) {
      if (/\bmap=/.test(material) && !/\bcolor=/.test(material))
        unlit.push(`${file}: ${material.replace(/\s+/g, " ")}`);
    }
  }
  expect(unlit).toEqual([]);
});
