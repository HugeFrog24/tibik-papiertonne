import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

const source = (file: string) => readFileSync(path.join(__dirname, file), "utf8");

test("every pane of glass out on the street carries its reflection: the windows, balcony doors and stair windows, the neighbouring blocks' painted panes and the Haustür's glass, on both sides of the street", () => {
  expect(source("OpeningView.tsx")).toMatch(/<MirrorFilm\b/);
  expect(source("DistantBlock.tsx")).toMatch(/<MirrorFilm\b[^>]*\bmask=/);
  const street = source("Street.tsx");
  expect(street).toMatch(/<DoorGlassFilm\b/);
  expect(street.match(/<FacadeMirror\b/g)).toHaveLength(2);
});

test("the wet ground and the glass draw their mirrors the same way, hiding every surface that shows a mirror while they do, so no reflection ever shows another drawn for an earlier frame", () => {
  for (const file of ["WetGround.tsx", "MirrorFilms.tsx"]) {
    const code = source(file);
    expect(code).toMatch(/renderMirror\(/);
    expect(code).toMatch(/\b(REFLECTS|reflecting)\b/);
    expect(code).not.toMatch(/gl\.render\(/);
  }
});

test("the glass and the wet ground read their mirror only through the copy their blur calls for, set from mirrorBlur each frame: at 1080p their own picture as before, at 4K and 8K the copy as fine as 1080p, except a puddle, which is not blurred and reads the full picture", () => {
  for (const file of ["MirrorFilms.tsx", "WetGround.tsx"]) {
    const code = source(file);
    expect(code, file).not.toContain("texture2D(mirror");
    expect(code, file).toContain("textureLod(mirror, ");
    expect(code, file).toContain("mirrorBlur(");
  }
  expect(source("WetGround.tsx")).toContain("lod * (1.0 - puddle)");
});
