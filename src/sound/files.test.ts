import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { STREET_LOOPS } from "../street/ambienceLoops";

const SRC = path.resolve(__dirname, "..");
const PUBLIC = path.resolve(SRC, "..", "public");

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sourceFiles(path.join(dir, entry.name))
      : /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
        ? [path.join(dir, entry.name)]
        : [],
  );

test("every sound file the scenes name exists in public/", () => {
  const missing: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, "utf8");
    for (const [, name] of text.matchAll(/staticFile\("(sfx\/[^"$`]+)"\)/g)) {
      if (!existsSync(path.join(PUBLIC, name)))
        missing.push(`${path.relative(SRC, file)}: ${name}`);
    }
    if (/sfx\/stairwell\//.test(text)) {
      for (const [, cue] of text.matchAll(/file: "([^"]+)"/g)) {
        if (!existsSync(path.join(PUBLIC, "sfx", "stairwell", `${cue}.wav`)))
          missing.push(`${path.relative(SRC, file)}: stairwell/${cue}.wav`);
      }
    }
  }
  for (let take = 0; take < 4; take++) {
    for (const name of [
      `sfx/footstep_concrete_00${take}.ogg`,
      `sfx/stairwell/footstep_concrete_00${take}.wav`,
    ]) {
      if (!existsSync(path.join(PUBLIC, name))) missing.push(name);
    }
  }
  for (const loop of STREET_LOOPS) {
    for (const name of [
      `sfx/${loop.file}.wav`,
      `sfx/${loop.file}-muffled.wav`,
    ]) {
      if (!existsSync(path.join(PUBLIC, name))) missing.push(name);
    }
  }
  expect(missing).toEqual([]);
});

test("looping sounds with a volume curve follow film time, not their own loop", () => {
  const wrong: string[] = [];
  for (const file of sourceFiles(SRC)) {
    for (const [element] of readFileSync(file, "utf8").matchAll(
      /<Audio\b[\s\S]*?\/>/g,
    )) {
      if (
        /\bloop\b(?!V)/.test(element) &&
        /volume=\{\(/.test(element) &&
        !/loopVolumeCurveBehavior="extend"/.test(element)
      ) {
        wrong.push(
          `${path.relative(SRC, file)}: ${element.replace(/\s+/g, " ").slice(0, 80)}`,
        );
      }
    }
  }
  expect(wrong).toEqual([]);
});
