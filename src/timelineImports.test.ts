import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

const SRC = path.resolve("src");
const TIMELINE = path.join(SRC, "timeline.ts");
const IMPORT = /^\s*(?:import|export)\s+(?!type\b)[^;]*?\sfrom\s+"(\.{1,2}\/[^"]+)"/gm;

const resolveFrom = (file: string, spec: string) => {
  const base = path.resolve(path.dirname(file), spec);
  return [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find(existsSync) ?? null;
};

const importsOf = (file: string) =>
  [...readFileSync(file, "utf8").matchAll(IMPORT)].map((m) => resolveFrom(file, m[1])).filter((f): f is string => f !== null);

test("nothing the film's timeline loads loads the timeline back, so its scene list never sees a scene half-built", () => {
  const cycles: string[] = [];
  const seen = new Set<string>();
  const walk = (file: string, trail: readonly string[]) => {
    for (const next of importsOf(file)) {
      if (next === TIMELINE) cycles.push([...trail, file].map((f) => path.relative(SRC, f)).join(" -> ") + " -> timeline.ts");
      else if (!seen.has(next)) {
        seen.add(next);
        walk(next, [...trail, file]);
      }
    }
  };
  walk(TIMELINE, []);
  expect(cycles).toEqual([]);
});
