import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { selfClosingTags, sourceFiles } from "../tooling/sourceFiles";

const NOT_PRINTS = new Set(["Fly.tsx", "Town.tsx"]);

test("every printed surface on the street takes the day's light, so nothing glows under a grey sky", () => {
  const unlit = sourceFiles(path.resolve(__dirname), /\.tsx$/)
    .filter((file) => !NOT_PRINTS.has(path.basename(file)))
    .flatMap((file) =>
      selfClosingTags(readFileSync(file, "utf8"), "meshBasicMaterial")
        .filter((material) => /\bmap=/.test(material) && !/\bcolor=\{signColor\}/.test(material))
        .map((material) => `${path.basename(file)}: ${material.replace(/\s+/g, " ")}`),
    );
  expect(unlit).toEqual([]);
});
