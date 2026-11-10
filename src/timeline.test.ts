import { expect, test } from "vitest";
import { HAUSMUELL_FRAMES, KLINGELSTURM_FRAMES, NACHTRUHE_FRAMES, PAPIERTONNEN_FRAMES, RUNDSCHREIBEN_FRAMES, SCENES, TREPPENHAUS_FRAMES, wholeFrames } from "./timeline";

test("each scene's own composition runs its stretch of the film plus whatever the film skips of it", () => {
  expect(SCENES.map(wholeFrames)).toEqual([TREPPENHAUS_FRAMES, PAPIERTONNEN_FRAMES, HAUSMUELL_FRAMES, KLINGELSTURM_FRAMES, NACHTRUHE_FRAMES, RUNDSCHREIBEN_FRAMES]);
});
