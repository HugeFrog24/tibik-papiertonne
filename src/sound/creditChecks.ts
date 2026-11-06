import { existsSync, readFileSync } from "node:fs";
import { expect } from "vitest";

export const expectSfx = (files: readonly string[]) => {
  for (const file of files) expect(existsSync(`public/sfx/${file}`), file).toBe(true);
};

export const expectFilesCredited = (files: readonly string[]) => {
  const credits = readFileSync("public/sfx/CREDITS.md", "utf8");
  for (const file of files) {
    expect(existsSync(`public/sfx/${file}`), file).toBe(true);
    expect(credits.includes(file.split("/").pop()!), `${file} in CREDITS.md`).toBe(true);
  }
};
