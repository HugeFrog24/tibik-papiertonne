import { LIGHT_SWITCH, TIMER_RELAY } from "../../sound/stairwellLight";
import { LEAVING, SOUND_CUES } from "./choreography";

export const TREPPENHAUS_CUES = [
  {
    name: "His door unlatches and swings open",
    at: SOUND_CUES.hisDoorOpens,
    file: "doorOpen_1",
    volume: 0.55,
  },
  {
    name: "His door shuts",
    at: SOUND_CUES.hisDoorShuts,
    file: "doorClose_1",
    volume: 0.7,
  },
  {
    name: "His door latches",
    at: SOUND_CUES.hisDoorShuts + 0.03,
    file: "metalLatch",
    volume: 0.5,
  },
  { name: "Light switch", at: SOUND_CUES.lightSwitch, ...LIGHT_SWITCH },
  { name: "The timer relay pulls in", at: LEAVING.lightsUp[0], ...TIMER_RELAY },
  {
    name: "Haustür unlatches and opens",
    at: SOUND_CUES.haustuerOpens,
    file: "doorOpen_1",
    volume: 0.6,
  },
] as const;
