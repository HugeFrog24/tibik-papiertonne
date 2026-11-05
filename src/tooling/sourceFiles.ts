import { readdirSync } from "node:fs";
import path from "node:path";

export const sourceFiles = (dir: string, extension = /\.tsx?$/): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sourceFiles(path.join(dir, entry.name), extension)
      : extension.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
        ? [path.join(dir, entry.name)]
        : [],
  );
