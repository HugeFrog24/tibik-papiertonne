import { FONT_METRICS } from "./fontMetrics";
import type { Line, Tone } from "./line";

export type Font = keyof typeof FONT_METRICS;

export const TEXT = {
  lineHeight: 1.1,
  phoneScale: 0.85,
  minimumSize: 46,
  safety: 0.97,
};

export const ellipseOf = (width: number, height: number) => ({
  center: { x: width / 2, y: height * 0.44 },
  rx: width / 2 - 4,
  ry: height * 0.42,
});

export const textArea = (width: number, height: number, tone: Tone) => {
  const shout = tone === "shout";
  const { center, rx, ry } = ellipseOf(width, height);
  return {
    left: center.x - rx * (shout ? 0.66 : 0.8),
    width: rx * (shout ? 1.32 : 1.6),
    top: center.y - ry * (shout ? 0.6 : 0.7),
    height: ry * (shout ? 1.2 : 1.4),
  };
};

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
  return [...text].reduce(
    (sum, ch) => sum + ((widths[ch] ?? widths.M) / unitsPerEm) * size + spacing,
    0,
  );
};

const pieces = (text: string) =>
  text
    .split(" ")
    .flatMap((word) =>
      word.split(/(?<=-)/).map((part, i) => ({ part, joined: i > 0 })),
    );

export const wrapText = (
  text: string,
  font: Font,
  size: number,
  spacing: number,
  width: number,
): string[] => {
  const lines: string[] = [];
  let current = "";
  for (const { part, joined } of pieces(text)) {
    const candidate =
      current === "" ? part : `${current}${joined ? "" : " "}${part}`;
    if (current !== "" && textWidth(candidate, font, size, spacing) > width) {
      lines.push(current);
      current = part;
    } else current = candidate;
  }
  if (current !== "") lines.push(current);
  return lines;
};

export const bubbleLayout = (line: Line) => {
  const area = textArea(line.box.width, line.box.height, line.tone);
  const { font, spacing } = typeOf(line.tone);
  const size =
    line.tone === "phone"
      ? line.box.fontSize * TEXT.phoneScale
      : line.box.fontSize;
  const room = area.width * TEXT.safety;
  const lines = wrapText(line.text, font, size, spacing, room);
  const widths = lines.map((l) => textWidth(l, font, size, spacing));
  return {
    area,
    room,
    size,
    lines,
    widths,
    height: lines.length * TEXT.lineHeight * size,
  };
};

export const textProblems = (lines: readonly Line[]) =>
  lines.flatMap((line) => {
    const layout = bubbleLayout(line);
    const problems: string[] = [];
    if (layout.size < TEXT.minimumSize)
      problems.push(
        `${line.name}: type ${layout.size.toFixed(0)} px, below ${TEXT.minimumSize} px`,
      );
    layout.lines.forEach((l, i) => {
      if (layout.widths[i] > layout.room)
        problems.push(
          `${line.name}: "${l}" is ${layout.widths[i].toFixed(0)} px wide, the bubble holds ${layout.room.toFixed(0)} px`,
        );
    });
    if (layout.height > layout.area.height)
      problems.push(
        `${line.name}: ${layout.lines.length} lines need ${layout.height.toFixed(0)} px, the bubble holds ${layout.area.height.toFixed(0)} px`,
      );
    return problems;
  });
