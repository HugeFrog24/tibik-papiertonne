import { Track, useVideoConfig } from "remotion";
import { useFormat } from "../useFormat";
import { useSeconds } from "../useSeconds";
import type { Line } from "./line";
import { SubtitleBar } from "./SubtitleBar";
import { chunkAt } from "./subtitles";
import { SoundCues, cueLanes } from "../sound/SoundCues";
import { voiceCues } from "../scenes/voices";
import { useLanguage, type Language } from "../language";
import { STEADY, type SceneClock } from "../sceneClock";
import { linesIn } from "./edition";

export const dialogueLanes = (lines: readonly Line[], inside: ((t: number) => boolean) | undefined, fps: number, language: Language = "de") =>
  cueLanes(voiceCues(lines, language, inside), fps);

export const DialogueTrack: React.FC<{
  readonly scene: string;
  readonly lines: readonly Line[];
  readonly all?: readonly Line[];
  readonly clock?: SceneClock;
  readonly name?: string;
  readonly inside?: (t: number) => boolean;
}> = ({ scene, lines, all = lines, clock = STEADY, name = "Dialogue", inside }) => {
  const t = useSeconds();
  const format = useFormat();
  const language = useLanguage();
  const { fps } = useVideoConfig();
  const shown = linesIn(language, scene, all, clock)(lines);
  const heardInside = inside && ((at: number) => inside(clock.storyAt(at)));
  const [first = [], ...more] = dialogueLanes(shown, heardInside, fps, language);
  return (
    <>
      <Track name={name}>
        <SubtitleBar chunk={chunkAt(shown, t, format)} format={format} />
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
