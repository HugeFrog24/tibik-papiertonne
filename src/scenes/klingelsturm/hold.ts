import TAKES from "../../dialogue/takes.json";
import { spokenLength } from "../../dialogue/speechSpan";
import { TIMELINE_FPS, atFrame } from "../../frameRate";
import type { Language } from "../../language";
import { STEADY, heldClock, type SceneClock } from "../../sceneClock";
import { SHUT } from "./door";

export const NOT_FOR_THE_ENVIRONMENT = "klingelsturm_07_tibik";

const BEFORE_THE_DOOR_SHUTS = 0.15;

const LONGER = spokenLength(TAKES.en[NOT_FOR_THE_ENVIRONMENT]) - spokenLength(TAKES.de[NOT_FOR_THE_ENVIRONMENT]);

export const KLINGELSTURM_CLOCKS: Readonly<Record<Language, SceneClock>> = {
  de: STEADY,
  en: heldClock([{ at: atFrame(SHUT[0] - BEFORE_THE_DOOR_SHUTS), frames: Math.ceil(LONGER * TIMELINE_FPS - 1e-9) }]),
};
