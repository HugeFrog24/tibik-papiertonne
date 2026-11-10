import { existsSync, readFileSync } from "node:fs";
import { expect } from "vitest";

export const expectSfx = (files: readonly string[]) => {
  for (const file of files) expect(existsSync(`public/sfx/${file}`), file).toBe(true);
};

export const creditedIn = (credits: string) => (file: string) => {
  const parts = file.split("/");
  if (credits.includes(parts[parts.length - 1])) return true;
  return parts.slice(0, -1).some((_, i) => credits.includes(`The files in ${parts.slice(0, i + 1).join("/")}/`));
};

export const expectFilesCredited = (files: readonly string[]) => {
  const credited = creditedIn(readFileSync("public/sfx/CREDITS.md", "utf8"));
  for (const file of files) {
    expect(existsSync(`public/sfx/${file}`), file).toBe(true);
    expect(credited(file), `${file} in CREDITS.md`).toBe(true);
  }
};
