import { PAPIERTONNEN_DURATION } from "../papiertonnen/choreography";
import { FOUND_IT } from "../papiertonnen/soundCues";
import type { SoundCue } from "../../sound/SoundCues";
import { LINES } from "./choreography";

const SHOUT = LINES.find((l) => l.speaker === "karen")!.from;
export const RECORD_SCRATCH = SHOUT - 0.1;

export const HAUSMUELL_CUES: readonly SoundCue[] = [
  {
    name: "Found it! (rings over the cut)",
    at: 0,
    src: FOUND_IT.file,
    volume: FOUND_IT.volume,
    skip: PAPIERTONNEN_DURATION - FOUND_IT.at,
    length: RECORD_SCRATCH,
  },
  {
    name: "Record scratch",
    at: RECORD_SCRATCH,
    src: "https://remotion.media/record-scratch.wav",
    volume: 0.45,
  },
];
