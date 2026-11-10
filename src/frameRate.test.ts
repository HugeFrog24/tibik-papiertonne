import { expect, test } from "vitest";
import { FORMATS, aspectOf } from "./frameRate";

test("a format's aspect is its width over its height", () => {
  expect(aspectOf("wide")).toBeCloseTo(16 / 9, 12);
  expect(aspectOf("tall")).toBeCloseTo(9 / 16, 12);
  expect(aspectOf("tall")).toBe(FORMATS.tall.width / FORMATS.tall.height);
});
