import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { sourceFiles } from "./sourceFiles";

const NODE_ONLY = /from\s+"node:/;
const IMPORTS = /from\s+"(\.{1,2}\/[^"]+)"/g;

const resolve = (from: string, spec: string) =>
  [".ts", ".tsx", "/index.ts"].map((ext) => path.join(path.dirname(from), spec) + ext).find((file) => {
    try {
      readFileSync(file);
      return true;
    } catch {
      return false;
    }
  });

test("the film's code never imports a Node-only module: the render bundles it for the browser", () => {
  const nodeOnly = new Set(sourceFiles("src").filter((file) => NODE_ONLY.test(readFileSync(file, "utf8"))));
  const offenders = sourceFiles("src")
    .filter((file) => !nodeOnly.has(file))
    .flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(IMPORTS)]
        .map(([, spec]) => resolve(file, spec))
        .filter((target): target is string => target !== undefined && nodeOnly.has(target))
        .map((target) => `${file} -> ${target}`),
    );
  expect(offenders).toEqual([]);
});
