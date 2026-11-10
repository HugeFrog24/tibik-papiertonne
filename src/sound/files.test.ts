import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { STREET_LOOPS } from "../street/ambienceLoops";
import { selfClosingTags, sourceFiles } from "../tooling/sourceFiles";
import { creditedIn } from "./creditChecks";

const SRC = path.resolve(__dirname, "..");
const PUBLIC = path.resolve(SRC, "..", "public");

test("every sound file the scenes name exists in public/", () => {
  const missing: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, "utf8");
    for (const [, name] of text.matchAll(/staticFile\("(sfx\/[^"$`]+)"\)/g)) {
      if (!existsSync(path.join(PUBLIC, name)))
        missing.push(`${path.relative(SRC, file)}: ${name}`);
    }
    if (/sfx\/stairwell\/|`stairwell\/\$\{cue\.file\}/.test(text)) {
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
    for (const element of selfClosingTags(readFileSync(file, "utf8"), "Audio")) {
      if (
        /\bloop\b(?!V)/.test(element) &&
        element.includes('volume={(') &&
        !element.includes('loopVolumeCurveBehavior="extend"')
      ) {
        wrong.push(
          `${path.relative(SRC, file)}: ${element.replace(/\s+/g, " ").slice(0, 80)}`,
        );
      }
    }
  }
  expect(wrong).toEqual([]);
});

test("every sound file is credited: CREDITS.md names it, or the folder it sits in", () => {
  const credits = readFileSync(path.join(PUBLIC, "sfx", "CREDITS.md"), "utf8");
  const sfx = path.join(PUBLIC, "sfx");
  const files = (dir: string) =>
    sourceFiles(dir, /\.(wav|ogg|mp3)$/).map((file) => path.relative(sfx, file).split(path.sep).join("/"));
  const credited = creditedIn(credits);
  expect(files(sfx).filter((file) => !credited(file))).toEqual([]);
});

test("no sound file the film plays, effects or voices, is kept out of the repository, so a fresh clone renders every cue and line", () => {
  const files = ["sfx", "dialogue"].flatMap((folder) => sourceFiles(path.join(PUBLIC, folder), /\.(wav|ogg|mp3)$/)).map((file) => path.relative(path.resolve(SRC, ".."), file).split(path.sep).join("/"));
  const ignored = spawnSync("git", ["check-ignore", "--stdin"], { input: files.join("\n"), encoding: "utf8" }).stdout.split("\n").filter(Boolean);
  expect(ignored).toEqual([]);
});
