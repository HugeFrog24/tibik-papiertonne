import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { sourceFiles } from "../tooling/sourceFiles";

const SCENES = path.resolve(__dirname);

test("every scene draws its street with the film's breeze, so the trees always sway", () => {
  const still = sourceFiles(SCENES, /\.tsx$/).flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(/<Street\b[^>]*>/gs)]
      .filter(([tag]) => !/windAt=/.test(tag))
      .map(([tag]) => `${path.relative(SCENES, file)}: ${tag.replace(/\s+/g, " ").slice(0, 80)}`),
  );
  expect(still).toEqual([]);
});
