import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { sourceFiles } from "../tooling/sourceFiles";

const callAt = (source: string, open: number) => {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "(") depth++;
    if (source[i] === ")" && --depth === 0) return source.slice(open, i + 1);
  }
  return source.slice(open);
};

test("geometry rebuilt from changing inputs is freed when it is replaced, so playing a scene leaks no GPU memory", () => {
  const offenders = sourceFiles("src", /\.tsx$/).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return [...source.matchAll(/useMemo\(/g)].flatMap((m) => {
      const call = callAt(source, m.index + "useMemo".length);
      const deps = /,\s*\[([^\]]*)\]\s*,?\s*\)$/.exec(call)?.[1].trim() ?? "";
      const builds = /Geometry\b|Geometry\(|bentPlane\(/.test(call);
      if (!builds || deps === "") return [];
      return [`${file}:${source.slice(0, m.index).split("\n").length}`];
    });
  });
  expect(offenders).toEqual([]);
});
