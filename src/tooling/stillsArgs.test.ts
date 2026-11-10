import { expect, test } from "vitest";
import { parseStillsArgs } from "../../scripts/stillsArgs.mjs";

test("the old form still works: one composition, its out dir, its frames", () => {
  expect(parseStillsArgs(["Rundschreiben", "out", "60", "150"])).toEqual({
    outDir: "out",
    jobs: [{ id: "Rundschreiben", frames: [60, 150] }],
  });
});

test("a Windows drive letter in the out dir is not mistaken for a composition", () => {
  expect(parseStillsArgs(["Rundschreiben", "C:/tmp/out", "60"])).toEqual({
    outDir: "C:/tmp/out",
    jobs: [{ id: "Rundschreiben", frames: [60] }],
  });
  expect(parseStillsArgs(["C:/tmp/out", "Hausmuell:20"]).outDir).toBe("C:/tmp/out");
});

test("several compositions share one run, so one bundle serves them all", () => {
  expect(parseStillsArgs(["out", "Hausmuell:20,55", "Klingelsturm:18", "Treppenhaus-Set:0"])).toEqual({
    outDir: "out",
    jobs: [
      { id: "Hausmuell", frames: [20, 55] },
      { id: "Klingelsturm", frames: [18] },
      { id: "Treppenhaus-Set", frames: [0] },
    ],
  });
});

test("a run without frames is refused with the usage", () => {
  expect(() => parseStillsArgs(["Rundschreiben", "out"])).toThrow(/usage/);
  expect(() => parseStillsArgs(["out"])).toThrow(/usage/);
  expect(() => parseStillsArgs(["out", "Hausmuell:"])).toThrow(/usage/);
});
