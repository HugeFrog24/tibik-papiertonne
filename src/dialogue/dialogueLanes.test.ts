import { expect, test } from "vitest";
import { FPS } from "../frameRate";
import { cueFrames } from "../sound/SoundCues";
import { dialogueLanes } from "./DialogueTrack";
import { LINES as PAPIERTONNEN } from "../scenes/papiertonnen/choreography";
import { LINES as HAUSMUELL } from "../scenes/hausmuell/choreography";
import { LINES as KLINGELSTURM } from "../scenes/klingelsturm/choreography";
import { inTheFlur } from "../scenes/klingelsturm/doorCues";
import { LETTER_READ } from "../scenes/rundschreiben/narration";
import { LINES as RUNDSCHREIBEN } from "../scenes/rundschreiben/choreography";
import { voiceCues } from "../scenes/voices";
import type { Line } from "./line";

const TRACKS: readonly { readonly name: string; readonly lines: readonly Line[]; readonly inside?: (t: number) => boolean }[] = [
  { name: "Papiertonnen", lines: PAPIERTONNEN },
  { name: "Hausmüll", lines: HAUSMUELL },
  { name: "Klingelsturm", lines: KLINGELSTURM, inside: inTheFlur },
  { name: "the letter", lines: LETTER_READ },
  { name: "Rundschreiben", lines: RUNDSCHREIBEN },
];

const keyOf = (cue: { readonly name: string; readonly at: number }) => `${cue.name}@${cue.at}`;

test("each scene's voices are spread over as many timeline tracks as their echoes need, so no track holds two clips at once (Studio refuses overlapping items in a <Track>), and every clip still plays exactly once", () => {
  for (const { name, lines, inside } of TRACKS) {
    const lanes = dialogueLanes(lines, inside, FPS);
    expect(lanes.flat().map(keyOf).sort(), name).toEqual(voiceCues(lines, "de", inside).map(keyOf).sort());
    for (const lane of lanes) {
      const spans = lane.map((cue) => ({ name: cue.name, ...cueFrames(cue, FPS) })).sort((a, b) => a.from - b.from);
      spans.slice(1).forEach((span, i) => {
        expect(span.from, `${name}: ${spans[i].name} rings into ${span.name}`).toBeGreaterThanOrEqual(spans[i].end);
      });
    }
  }
});

test("the echoes that ring under the next line get a track of their own: the stairwell in the Klingelsturm and the hall of the letter", () => {
  expect(dialogueLanes(KLINGELSTURM, inTheFlur, FPS).length).toBeGreaterThan(1);
  expect(dialogueLanes(LETTER_READ, undefined, FPS).length).toBeGreaterThan(1);
  expect(dialogueLanes(HAUSMUELL, undefined, FPS)).toHaveLength(1);
});
