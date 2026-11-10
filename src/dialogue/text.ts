import { FONT_METRICS } from "./fontMetrics";
import type { Tone } from "./line";

export type Font = keyof typeof FONT_METRICS;

export const typeOf = (tone: Tone): { font: Font; spacing: number } =>
  tone === "shout"
    ? { font: "bangers", spacing: 1 }
    : { font: "comicNeue", spacing: 0 };

export const textWidth = (
  text: string,
  font: Font,
  size: number,
  spacing: number,
) => {
  const { unitsPerEm, advance } = FONT_METRICS[font];
  const widths: Readonly<Record<string, number>> = advance;
  return Array.from(text).reduce(
    (sum, ch) => sum + ((widths[ch] ?? widths["M"]) / unitsPerEm) * size + spacing,
    0,
  );
};

export const wordsOf = (text: string) => text.split(/\s+/).filter(Boolean);
