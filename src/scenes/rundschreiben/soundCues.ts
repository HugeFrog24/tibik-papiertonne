import { ambienceOf } from "../../street/sceneAmbience";
import { duckUnderLines } from "../../sound/duck";
import { byLanguage } from "../../language";
import { LETTER_READ } from "./narration";
import { stepsOn } from "../../sound/footsteps";
import { throughTheWalls } from "../../sound/IndoorLoop";
import { KEY_APPROACH } from "../../props/keyRingShape";
import type { FileCue } from "../../sound/SoundCues";
import {
  BOX_OPEN,
  ENTRY,
  BOX_SHUT,
  ENVELOPE_LANDS,
  ENVELOPE_OUT,
  FLAP,
  OUT_OF_THE_HOUSE,
  FOLD,
  KEY_IN,
  KEY_OUT,
  LID_THUD,
  LID_UP,
  LINES,
  TAKING_IT_IN,
  UNFOLD,
  footstepTimes,
  rundschreibenTibikAt,
} from "./choreography";
import { FACADE_Z } from "../../street/building";
import { HAUSTUER_WIDE, haustuerAt, indoorsAt } from "./home";
import { entryCues, haustuerShutCues } from "../entrySounds";
import { RAIN } from "../../sound/rain";
import { BLINK } from "../../characters/animate";



export const heardIndoorsAt = (t: number) =>
  indoorsAt(t) * (1 - haustuerAt(t) / HAUSTUER_WIDE);

export const rainLevel = (t: number) => throughTheWalls(RAIN.volume, heardIndoorsAt(t));

export const footstepsByRoom = () => {
  const inside = (t: number) => rundschreibenTibikAt(t).position[2] < FACADE_Z;
  const times = footstepTimes();
  return { outside: stepsOn(times.filter((t) => !inside(t)), "wet"), inside: stepsOn(times.filter(inside), "concrete") };
};

export const RUNDSCHREIBEN_CUES: readonly FileCue[] = [
  { name: "Keys jingle up to the box", at: KEY_IN - KEY_APPROACH, file: "handleCoins.ogg", volume: 0.3 },
  { name: "Key into the mailbox lock", at: KEY_IN, file: "metalClick.ogg", volume: 0.35 },
  { name: "Mailbox lock turns", at: BOX_OPEN[0] - 0.05, file: "metalClick.ogg", volume: 0.3 },
  { name: "Mailbox door unlatches", at: BOX_OPEN[0], file: "metalLatch.ogg", volume: 0.3 },
  { name: "Mailbox door creaks open", at: BOX_OPEN[0] + 0.05, file: "creak1.ogg", volume: 0.15 },
  { name: "Envelope slides out", at: ENVELOPE_OUT[0], file: "bookFlip1.ogg", volume: 0.35 },
  { name: "Mailbox door clacks shut", at: BOX_SHUT[1], file: "metalLatch.ogg", volume: 0.35 },
  { name: "Key out of the mailbox", at: KEY_OUT[0], file: "metalClick.ogg", volume: 0.25 },
  { name: "Flap pulled open", at: FLAP[0], file: "bookFlip2.ogg", volume: 0.35 },
  { name: "Letter unfolds", at: UNFOLD[0], file: "bookOpen.ogg", volume: 0.4 },
  { name: "Letter folded back", at: FOLD[0], file: "bookFlip3.ogg", volume: 0.35 },
  { name: "Lid lifted", at: LID_UP[0], file: "creak1.ogg", volume: 0.25 },
  { name: "Envelope lands in the bin", at: ENVELOPE_LANDS, file: "bookPlace1.ogg", volume: 0.4 },
  { name: "Lid slams shut", at: LID_THUD, file: "bin-lid-slam.ogg", volume: 1 },
  ...TAKING_IT_IN.map((blink, i) => ({ name: `His blink snaps ${i + 1}`, at: blink + BLINK.shut, file: "tibik-blink-snap.mp3", volume: 0.4 })),
  ...haustuerShutCues(OUT_OF_THE_HOUSE.shut),
  ...entryCues(ENTRY),
];

const TAKING_IT_IN_BEAT = (): readonly (readonly [number, number])[] => [[TAKING_IT_IN[0], TAKING_IT_IN[1] + BLINK.open]];

export const RUNDSCHREIBEN_AMBIENCES = byLanguage((language) => ambienceOf({ indoors: heardIndoorsAt, duck: duckUnderLines("rundschreiben", () => [...LETTER_READ, ...LINES], TAKING_IT_IN_BEAT, language) }));

export const RUNDSCHREIBEN_AMBIENCE = RUNDSCHREIBEN_AMBIENCES.de;
