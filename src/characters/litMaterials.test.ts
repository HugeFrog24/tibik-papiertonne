import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { sourceFiles } from "../tooling/sourceFiles";

const CHARACTER_DIRS = ["src/Karen", "src/Tibik", "src/characters"];
const UNLIT_ON_PURPOSE = new Set([
  "src/Karen/WetSpot.tsx",
  "src/Karen/Phone.tsx",
]);

const characterSources = () =>
  CHARACTER_DIRS.flatMap((dir) =>
    sourceFiles(dir, /\.tsx$/).map((file) => {
      const rel = file.split(path.sep).join("/");
      return { rel, source: readFileSync(rel, "utf8") };
    }),
  );

test("every part of Tibik and Karen is lit by the scene, so nothing on them glows when the light goes out", () => {
  const offenders = characterSources()
    .filter(({ rel }) => !UNLIT_ON_PURPOSE.has(rel))
    .flatMap(({ rel, source }) =>
      source
        .split("\n")
        .flatMap((line, i) =>
          /<meshBasicMaterial\b/.test(line) ? [`${rel}:${i + 1}`] : [],
        ),
    );
  expect(offenders).toEqual([]);
});

test("every lit part of Tibik and Karen receives shadows, so none stays bright inside a shadow", () => {
  const offenders = characterSources().flatMap(({ rel, source }) =>
    [...source.matchAll(/<mesh\b([^>]*)>([\s\S]*?)<\/mesh>/g)]
      .filter(
        ([, attributes, body]) =>
          body.includes("<meshToonMaterial") &&
          !/\breceiveShadow\b/.test(attributes),
      )
      .map((match) => `${rel}:${source.slice(0, match.index).split("\n").length}`),
  );
  expect(offenders).toEqual([]);
});
