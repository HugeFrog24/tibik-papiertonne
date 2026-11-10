import { Internals } from "remotion";
import { expect, test } from "vitest";
import { compositionId } from "./compositionIds";
import { FORMATS, type Format } from "./frameRate";
import { SCENES } from "./timeline";

test("the film and every scene get a composition id Remotion accepts in each format, the 9:16 ones ending in -9x16, and no two alike", () => {
  const ids = (Object.keys(FORMATS) as Format[]).flatMap((format) => ["Film", ...SCENES.map((s) => s.name)].map((name) => compositionId(name, format)));
  for (const id of ids) expect(Internals.isCompositionIdValid(id), id).toBeTruthy();
  expect(new Set(ids).size).toBe(ids.length);
  expect(compositionId("Klingelsturm", "tall")).toBe("Klingelsturm-9x16");
  expect(compositionId("Klingelsturm", "wide")).toBe("Klingelsturm");
});
