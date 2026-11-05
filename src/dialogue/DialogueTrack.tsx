import { useVideoConfig } from "remotion";
import { useSeconds } from "../useSeconds";
import type { Line } from "./line";
import { SpeechBubble } from "./SpeechBubble";

export const lineFrames = (line: Line, fps: number) => {
  const from = Math.round(line.from * fps);
  return { from, duration: Math.round(line.to * fps) - from };
};

export const DialogueTrack: React.FC<{
  readonly lines: readonly Line[];
  readonly tailTo: (line: Line, t: number) => [number, number] | null;
}> = ({ lines, tailTo }) => {
  const { fps } = useVideoConfig();
  const t = useSeconds();
  return (
    <>
      {lines.map((line) => (
        <SpeechBubble
          key={line.name}
          name={line.name}
          from={lineFrames(line, fps).from}
          durationInFrames={lineFrames(line, fps).duration}
          tone={line.tone}
          tailTo={tailTo(line, t)}
          style={{ ...line.box }}
        >
          {line.text}
        </SpeechBubble>
      ))}
    </>
  );
};
