import type { Line } from "../dialogue/line";
import { sfxSource } from "./SoundCues";

export const BUBBLE_PLUCK = "pluck_001.ogg";

export const bubbleCues = (lines: readonly Line[]) =>
  lines.map((line) => ({
    name: `Bubble: ${line.text.slice(0, 24)}`,
    at: line.from,
    src: sfxSource(BUBBLE_PLUCK),
    volume: 0.35,
  }));
