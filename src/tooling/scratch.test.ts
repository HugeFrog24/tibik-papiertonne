import { existsSync } from "node:fs";
import { expect, test } from "vitest";
import { withScratch } from "../../scripts/scratch.mjs";

test("a script's scratch folder exists while it works and is gone afterwards, also when the work fails", () => {
  let seen = "";
  const result = withScratch("probe-", (scratch: string) => {
    seen = scratch;
    expect(existsSync(scratch)).toBe(true);
    return 7;
  });
  expect(result).toBe(7);
  expect(existsSync(seen)).toBe(false);
  expect(() =>
    withScratch("probe-", (scratch: string) => {
      seen = scratch;
      throw new Error("ffmpeg failed");
    }),
  ).toThrow("ffmpeg failed");
  expect(existsSync(seen)).toBe(false);
});
