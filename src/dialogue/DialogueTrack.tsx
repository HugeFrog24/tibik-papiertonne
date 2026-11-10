import { Track, useVideoConfig } from "remotion";
import { useFormat } from "../useFormat";
import { useSeconds } from "../useSeconds";
import type { Line } from "./line";
import { SubtitleBar } from "./SubtitleBar";
import { chunkAt } from "./subtitles";
import { SoundCues, cueLanes } from "../sound/SoundCues";
import { voiceCues } from "../scenes/voices";

export const dialogueLanes = (lines: readonly Line[], inside: ((t: number) => boolean) | undefined, fps: number) =>
  cueLanes(voiceCues(lines, "de", inside), fps);

export const DialogueTrack: React.FC<{ readonly lines: readonly Line[]; readonly name?: string; readonly inside?: (t: number) => boolean }> = ({ lines, name = "Dialogue", inside }) => {
  const t = useSeconds();
  const format = useFormat();
  const { fps } = useVideoConfig();
  const [first = [], ...more] = dialogueLanes(lines, inside, fps);
  return (
    <>
      <Track name={name}>
        <SubtitleBar chunk={chunkAt(lines, t, format)} format={format} />
        <SoundCues cues={first} />
      </Track>
      {more.map((cues, i) => ({ cues, lane: `${name} ${i + 2}` })).map(({ cues, lane }) => (
        <Track key={lane} name={lane}>
          <SoundCues cues={cues} />
        </Track>
      ))}
    </>
  );
};
