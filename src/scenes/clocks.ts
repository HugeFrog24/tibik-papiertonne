import type { Language } from "../language";
import { STEADY, type SceneClock } from "../sceneClock";
import { KLINGELSTURM_CLOCKS } from "./klingelsturm/hold";

export const clockOf = (scene: string, language: Language): SceneClock => (scene === "klingelsturm" ? KLINGELSTURM_CLOCKS[language] : STEADY);
