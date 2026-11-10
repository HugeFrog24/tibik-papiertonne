import { expect, test } from "vitest";
import { LIGHT_SWITCH, TIMER_RELAY } from "../../sound/stairwellLight";
import { doorCues } from "../klingelsturm/doorCues";
import { EXIT_SOUNDS } from "../klingelsturm/exit";
import { LIGHT_BACK } from "../klingelsturm/light";
import { LEAVING } from "./choreography";
import { TREPPENHAUS_CUES } from "./soundCues";

test("switching the stairwell light on sounds the same in both scenes: the rocker clicks as he presses it and the timer relay pulls in as the lights come up", () => {
  const here = (file: string, at: number) => TREPPENHAUS_CUES.find((cue) => cue.file === file && Math.abs(cue.at - at) < 1e-9);
  expect(here(LIGHT_SWITCH.file, LEAVING.lightPress)?.volume).toBe(LIGHT_SWITCH.volume);
  expect(here(TIMER_RELAY.file, LEAVING.lightsUp[0])?.volume).toBe(TIMER_RELAY.volume);
  const there = (file: string, at: number) => doorCues().find((cue) => cue.sound === `stairwell/${file}` && Math.abs(cue.at - at) < 1e-6);
  expect(there(LIGHT_SWITCH.file, EXIT_SOUNDS.lightSwitch)?.volume).toBe(LIGHT_SWITCH.volume);
  expect(there(TIMER_RELAY.file, LIGHT_BACK[0])?.volume).toBe(TIMER_RELAY.volume);
});
