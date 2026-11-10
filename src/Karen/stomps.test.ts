import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { sourceFiles } from "../tooling/sourceFiles";

const scenes = path.join("src", "scenes");
const read = (file: string) => readFileSync(file, "utf8");

test("every scene that shows Karen plays her steps through KarenStomps, so they sound the same everywhere, and no other footstep track carries her name", () => {
  const files = sourceFiles(scenes, /\.tsx$/);
  const showing = [...new Set(files.filter((f) => /<Karen[\s>]/.test(read(f))).map((f) => path.dirname(f)))];
  expect(showing.length).toBeGreaterThanOrEqual(2);
  for (const dir of showing)
    expect(files.some((f) => path.dirname(f) === dir && /<KarenStomps[\s/>]/.test(read(f))), dir).toBe(true);
  const elsewhere = sourceFiles("src").filter((f) => /<FootstepSounds[^>]*who=\{?["'`]Karen/.test(read(f)));
  expect(elsewhere).toEqual([]);
});
