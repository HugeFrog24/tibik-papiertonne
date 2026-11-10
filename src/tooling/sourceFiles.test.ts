import path from "node:path";
import { expect, test } from "vitest";
import { selfClosingTags, sourceFiles } from "./sourceFiles";

const SRC = path.resolve(__dirname, "..");
const relative = (files: readonly string[]) => files.map((f) => path.relative(SRC, f).split(path.sep).join("/"));

test("the film's own sources, found in every folder, tests left out", () => {
  const all = relative(sourceFiles(SRC));
  expect(all).toContain("toon/InkPass.tsx");
  expect(all).toContain("scenes/rundschreiben/choreography.ts");
  expect(all.some((f) => /\.test\.tsx?$/.test(f))).toBe(false);
  const tsx = relative(sourceFiles(SRC, /\.tsx$/));
  expect(tsx).toContain("toon/InkPass.tsx");
  expect(tsx).not.toContain("scenes/rundschreiben/choreography.ts");
});

test("a self-closing JSX tag is found whole: across lines, with arrows and comparisons inside its props, and never merged with the next one", () => {
  const source = [
    "<Audio src={a} volume={(f) => (f > 3 ? 1 : 0)}",
    "  loop />",
    "<meshBasicMaterial map={m} />",
    "<meshBasicMaterial color={signColor} map={n} transparent />",
  ].join("\n");
  expect(selfClosingTags(source, "Audio")).toEqual(["<Audio src={a} volume={(f) => (f > 3 ? 1 : 0)}\n  loop />"]);
  expect(selfClosingTags(source, "meshBasicMaterial")).toEqual([
    "<meshBasicMaterial map={m} />",
    "<meshBasicMaterial color={signColor} map={n} transparent />",
  ]);
  expect(selfClosingTags(source, String.raw`mesh\w*Material`)).toHaveLength(2);
});
