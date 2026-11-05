import { HAUSTUER_LATCHED, OPENING } from "./choreography";

import type { FileCue } from "../../sound/SoundCues";

export const LID_SLAP = 4.2 + OPENING;

export const FOUND_IT = {
  name: "Found it!",
  at: 9.6 + OPENING,
  file: "https://remotion.media/ding.wav",
  volume: 0.45,
} as const;

export const PAPIERTONNEN_CUES: readonly FileCue[] = [
  {
    name: "Haustür swings shut on its closer",
    at: HAUSTUER_LATCHED - 0.08,
    file: "doorClose_4.ogg",
    volume: 0.55,
  },
  {
    name: "Haustür latch catches",
    at: HAUSTUER_LATCHED,
    file: "metalLatch.ogg",
    volume: 0.5,
  },
  {
    name: "Lid creaks up",
    at: 3.6 + OPENING,
    file: "creak1.ogg",
    volume: 0.25,
  },
  {
    name: "Lid slaps open",
    at: LID_SLAP,
    file: "impactSoft_heavy_000.ogg",
    volume: 0.9,
  },
  {
    name: "Rummaging 1",
    at: 6.5 + OPENING,
    file: "bookFlip1.ogg",
    volume: 0.7,
  },
  {
    name: "Rummaging 2",
    at: 6.7 + OPENING,
    file: "bookFlip2.ogg",
    volume: 0.7,
  },
  {
    name: "Rummaging 3",
    at: 6.9 + OPENING,
    file: "bookFlip3.ogg",
    volume: 0.7,
  },
  {
    name: "Box pulled out",
    at: 7.35 + OPENING,
    file: "bookFlip2.ogg",
    volume: 0.6,
  },
  {
    name: "Karton pops open",
    at: 9.1 + OPENING,
    file: "bookOpen.ogg",
    volume: 0.8,
  },
  FOUND_IT,
];
