import { KEY_APPROACH } from "../../props/keyRingShape";
import {
  BOX_OPEN,
  BOX_SHUT,
  ENVELOPE_LANDS,
  ENVELOPE_OUT,
  FLAP,
  FOLD,
  KEY_IN,
  KEY_OUT,
  LID_THUD,
  LID_UP,
  UNFOLD,
  UNLOCK,
} from "./choreography";
import { HAUSTUER_SOUNDS, HAUSTUER_WIDE, haustuerAt, indoorsAt } from "./home";

export type RundschreibenCue = {
  readonly name: string;
  readonly at: number;
  readonly file: string;
  readonly volume: number;
};

export const RAIN = { name: "Rain", file: "rain", volume: 0.35 } as const;

export const heardIndoorsAt = (t: number) =>
  indoorsAt(t) * (1 - haustuerAt(t) / HAUSTUER_WIDE);

export const rainLevel = (t: number) => {
  const indoors = heardIndoorsAt(t);
  return { outside: RAIN.volume * (1 - indoors), inside: RAIN.volume * indoors };
};

export const RUNDSCHREIBEN_CUES: readonly RundschreibenCue[] = [
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
  { name: "Keys jingle up to the Haustür", at: UNLOCK[0] - 0.3, file: "handleCoins.ogg", volume: 0.3 },
  { name: "House key into the cylinder", at: HAUSTUER_SOUNDS.keyIn, file: "metalClick.ogg", volume: 0.35 },
  { name: "Haustür lock turns", at: HAUSTUER_SOUNDS.unlocked, file: "metalClick.ogg", volume: 0.35 },
  { name: "Haustür opens", at: HAUSTUER_SOUNDS.opens, file: "doorOpen_1.ogg", volume: 0.5 },
  { name: "Haustür swings shut on its closer", at: HAUSTUER_SOUNDS.shut - 0.08, file: "doorClose_4.ogg", volume: 0.55 },
  { name: "Haustür latch catches", at: HAUSTUER_SOUNDS.shut, file: "metalLatch.ogg", volume: 0.5 },
];
