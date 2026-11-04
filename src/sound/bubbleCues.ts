import { staticFile } from "remotion";
import type { Line } from "../dialogue/line";

export const bubbleCues = (lines: readonly Line[]) =>
  lines.map((line) => ({
    name: `Bubble: ${line.text.slice(0, 24)}`,
    at: line.from,
    src: staticFile("sfx/pluck_001.ogg"),
    volume: 0.35,
  }));
