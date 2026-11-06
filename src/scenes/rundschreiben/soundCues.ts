import { ambienceOf } from "../../street/sceneAmbience";
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
  UNFOLD,
  footstepTimes,
  rundschreibenTibikAt,
} from "./choreography";
import { FACADE_Z } from "../../street/building";
import { HAUSTUER_WIDE, haustuerAt, indoorsAt } from "./home";
import { entryCues, haustuerShutCues } from "../entrySounds";
import { RAIN } from "../../sound/rain";



export const heardIndoorsAt = (t: number) =>
  indoorsAt(t) * (1 - haustuerAt(t) / HAUSTUER_WIDE);

export const rainLevel = (t: number) => throughTheWalls(RAIN.volume, heardIndoorsAt(t));

export const footstepsByRoom = (fps: number) => {
  const inside = (t: number) => rundschreibenTibikAt(t).position[2] < FACADE_Z;
  const times = footstepTimes(fps);
  return { outside: times.filter((t) => !inside(t)), inside: times.filter(inside) };
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
  { name: "Lid thuds shut", at: LID_THUD, file: "impactSoft_heavy_000.ogg", volume: 0.9 },
  ...haustuerShutCues(OUT_OF_THE_HOUSE.shut),
  ...entryCues(ENTRY),
];

export const RUNDSCHREIBEN_AMBIENCE = ambienceOf({ indoors: heardIndoorsAt });
