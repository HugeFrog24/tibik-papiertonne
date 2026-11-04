import { Audio } from "@remotion/media";
import { useVideoConfig } from "remotion";

export type SoundCue = {
  readonly name: string;
  readonly at: number;
  readonly src: string;
  readonly volume: number;
  readonly length?: number;
  readonly skip?: number;
};

const asIs = (at: number): number | null => at;

export const trimsOf = (
  cue: { readonly skip?: number; readonly length?: number },
  fps: number,
) => ({
  trimBefore: cue.skip === undefined ? undefined : Math.round(cue.skip * fps),
  trimAfter:
    cue.length === undefined
      ? undefined
      : Math.round(((cue.skip ?? 0) + cue.length) * fps),
});

export const SoundCues: React.FC<{
  readonly cues: readonly SoundCue[];
  readonly timeOf?: (at: number) => number | null;
}> = ({ cues, timeOf = asIs }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {cues.map((cue) => {
        const t = timeOf(cue.at);
        return t === null ? null : (
          <Audio
            key={`${cue.name}@${cue.at}`}
            name={cue.name}
            src={cue.src}
            from={Math.round(t * fps)}
            volume={cue.volume}
            {...trimsOf(cue, fps)}
          />
        );
      })}
    </>
  );
};
