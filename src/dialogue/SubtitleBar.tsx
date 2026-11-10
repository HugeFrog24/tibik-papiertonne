import type { Format } from "../frameRate";
import { CALM_FONT, SHOUT_FONT } from "./fonts";
import { SPEAKER_INK, SUBTITLE_BAR, barRect, type Chunk } from "./subtitles";
import { typeOf } from "./text";

const BAR_PANEL = "rgba(10,10,12,0.62)";

export const SubtitleBar: React.FC<{ readonly chunk: Chunk | null; readonly format: Format }> = ({ chunk, format }) => {
  if (chunk === null) return null;
  const { centerX, fontSize, lineHeight, padding } = SUBTITLE_BAR[format];
  const { top, height } = barRect(chunk, format);
  const shout = chunk.tone === "shout";
  const ink = SPEAKER_INK[chunk.speaker];
  return (
    <div
      style={{
        position: "absolute",
        left: centerX,
        top,
        transform: "translateX(-50%)",
        width: "max-content",
        height,
        boxSizing: "border-box",
        padding,
        borderRadius: Math.round(fontSize * 0.3),
        background: BAR_PANEL,
        color: ink.color,
        fontFamily: shout ? SHOUT_FONT : CALM_FONT,
        fontWeight: shout ? 400 : 700,
        fontStyle: ink.italic ? "italic" : "normal",
        letterSpacing: typeOf(chunk.tone).spacing,
        fontSize,
        lineHeight: `${lineHeight}px`,
        textAlign: "center",
        whiteSpace: "nowrap",
      }}
    >
      {chunk.lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
};
