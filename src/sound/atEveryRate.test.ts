import { expect, test } from "vitest";
import { dialogueLanes } from "../dialogue/DialogueTrack";
import { RENDER_RATES, TIMELINE_FPS } from "../frameRate";
import { SHOTS as HAUSMUELL_SHOTS } from "../scenes/hausmuell/cameras";
import { LINES as KLINGELSTURM } from "../scenes/klingelsturm/choreography";
import { SHOTS as KLINGELSTURM_SHOTS } from "../scenes/klingelsturm/cameras";
import { inTheFlur } from "../scenes/klingelsturm/doorCues";
import { SHOTS as PAPIERTONNEN_SHOTS } from "../scenes/papiertonnen/cameras";
import { LETTER_READ } from "../scenes/rundschreiben/narration";
import { shotFrames } from "../toon/shotFrames";
import { footstepPlan } from "./footsteps";
import { MAIN_STREET, musicPlacement } from "./music";
import { cueFrames, cueLanes, playable, trimsOf, type SoundCue } from "./SoundCues";

const RATES_ABOVE = RENDER_RATES.filter((fps) => fps !== TIMELINE_FPS);

const inSeconds = (frame: number | undefined, fps: number) => (frame === undefined || frame === Infinity ? frame : +(frame / fps).toFixed(9));

const CUES: readonly SoundCue[] = Array.from({ length: 400 }, (_, i) => ({
  name: `cue ${i}`,
  src: `cue-${i}.wav`,
  volume: 1,
  at: (i * 0.731137) % 210,
  skip: i % 3 === 0 ? undefined : (i * 0.0377) % 2,
  length: i % 4 === 0 ? undefined : 0.2 + ((i * 0.0571) % 3),
  rate: i % 5 === 0 ? 0.9 + (i % 7) * 0.03 : undefined,
}));

const placed = (cue: SoundCue, fps: number) => {
  const { from, end } = cueFrames(cue, fps);
  const { trimBefore, trimAfter } = trimsOf(cue, fps);
  return { from: inSeconds(from, fps), end: inSeconds(end, fps), trimBefore: inSeconds(trimBefore, fps), trimAfter: inSeconds(trimAfter, fps), playable: playable(cue, fps) };
};

test("every sound cue starts, skips into its file and stops at the same instant at 60, 90 and 120 fps as at 30", () => {
  for (const fps of RATES_ABOVE) for (const cue of CUES) expect(placed(cue, fps), `${cue.name} at ${fps} fps`).toEqual(placed(cue, TIMELINE_FPS));
});

test("overlapping cues share out the same lanes at every render rate", () => {
  const lanesAt = (fps: number) => cueLanes(CUES, fps).map((lane) => lane.map((cue) => cue.name));
  for (const fps of RATES_ABOVE) expect(lanesAt(fps)).toEqual(lanesAt(TIMELINE_FPS));
});

test("the spoken lines take the same lanes and start on the same instant at every render rate", () => {
  const spoken = (fps: number) =>
    [dialogueLanes(KLINGELSTURM, inTheFlur, fps), dialogueLanes(LETTER_READ, undefined, fps)].map((lanes) =>
      lanes.map((lane) => lane.map((cue) => [cue.name, inSeconds(cueFrames(cue, fps).from, fps), inSeconds(cueFrames(cue, fps).end, fps)])),
    );
  for (const fps of RATES_ABOVE) expect(spoken(fps)).toEqual(spoken(TIMELINE_FPS));
});

test("each footstep sounds on the same instant with the same take at every render rate", () => {
  const times = Array.from({ length: 300 }, (_, i) => (i * 0.4123 + (i % 4) * 0.009) % 120);
  const steps = (fps: number) => footstepPlan(times, fps, { surface: "wet" }).map(({ frame, file, rate, gain }) => ({ at: inSeconds(frame, fps), file, rate, gain }));
  for (const fps of RATES_ABOVE) expect(steps(fps)).toEqual(steps(TIMELINE_FPS));
});

test("the main street music starts, is trimmed and ends on the same instant at every render rate, wherever a composition joins it", () => {
  const music = (offset: number, fps: number) => {
    const p = musicPlacement(MAIN_STREET, offset, fps);
    return p && { start: p.start, from: inSeconds(p.from, fps), trimBefore: inSeconds(p.trimBefore, fps), trimAfter: inSeconds(p.trimAfter, fps) };
  };
  for (const offset of [0, 1.234, MAIN_STREET.from + 0.517, MAIN_STREET.to + 1])
    for (const fps of RATES_ABOVE) expect(music(offset, fps), `${offset} s at ${fps} fps`).toEqual(music(offset, TIMELINE_FPS));
});

test("every shot cuts in and out on the same instant at every render rate", () => {
  const cuts = (fps: number) =>
    [HAUSMUELL_SHOTS, PAPIERTONNEN_SHOTS, KLINGELSTURM_SHOTS].map((shots) => shotFrames(shots, fps).map(({ name, from, duration }) => [name, inSeconds(from, fps), inSeconds(duration, fps)]));
  for (const fps of RATES_ABOVE) expect(cuts(fps)).toEqual(cuts(TIMELINE_FPS));
});
