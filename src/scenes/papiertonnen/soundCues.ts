import { AFTER_THE_OPENING, HAUSTUER_LATCHED, KARTON_OPENS, LINES, OPENING } from "./choreography";
import { ambienceOf } from "../../street/sceneAmbience";
import { duckUnderLines } from "../../sound/duck";
import { byLanguage } from "../../language";

import { TIMELINE_FPS, firstFrameAfter } from "../../frameRate";
import type { FileCue } from "../../sound/SoundCues";
import { haustuerShutCues } from "../entrySounds";

const INTO_THE_MOVE = 1 / TIMELINE_FPS;

export const LID_SLAP = AFTER_THE_OPENING.lidRises[2] + OPENING;

export const FOUND_IT = {
  name: "Found it!",
  at: AFTER_THE_OPENING.hopsForJoy[0] + OPENING,
  file: "https://remotion.media/ding.wav",
  volume: 0.45,
} as const;

export const PAPIERTONNEN_AMBIENCES = byLanguage((language) => ambienceOf({ duck: duckUnderLines("papiertonnen", () => LINES, undefined, language) }));

export const PAPIERTONNEN_CUES: readonly FileCue[] = [
  ...haustuerShutCues(HAUSTUER_LATCHED),
  {
    name: "Lid creaks up",
    at: firstFrameAfter(AFTER_THE_OPENING.lidRises[0] + OPENING),
    file: "creak1.ogg",
    volume: 0.25,
  },
  {
    name: "Lid slaps open",
    at: LID_SLAP,
    file: "bin-lid-slam.ogg",
    volume: 1,
  },
  {
    name: "Rummaging 1",
    at: firstFrameAfter(AFTER_THE_OPENING.rummages[0] + OPENING),
    file: "bookFlip1.ogg",
    volume: 0.7,
  },
  {
    name: "Rummaging 2",
    at: (AFTER_THE_OPENING.rummages[0] + AFTER_THE_OPENING.rummages[2]) / 2 + OPENING,
    file: "bookFlip2.ogg",
    volume: 0.7,
  },
  {
    name: "Rummaging 3",
    at: AFTER_THE_OPENING.rummages[2] + OPENING,
    file: "bookFlip3.ogg",
    volume: 0.7,
  },
  {
    name: "Box pulled out",
    at: firstFrameAfter(AFTER_THE_OPENING.pulledOut[0] + OPENING) + INTO_THE_MOVE,
    file: "bookFlip2.ogg",
    volume: 0.6,
  },
  {
    name: "Karton pops open",
    at: firstFrameAfter(KARTON_OPENS[0]) + INTO_THE_MOVE,
    file: "bookOpen.ogg",
    volume: 0.8,
  },
  FOUND_IT,
];
