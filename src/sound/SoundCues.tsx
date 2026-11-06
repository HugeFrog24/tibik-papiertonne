import { MixAudio } from "./MixAudio";
import { staticFile, useVideoConfig } from "remotion";

export type FileCue = {
  readonly name: string;
  readonly at: number;
  readonly file: string;
  readonly volume: number;
};

export const sfxSource = (path: string) =>
  path.startsWith("http") ? path : staticFile(`sfx/${path}`);

export const withSources = <C extends { readonly name: string; readonly at: number; readonly volume: number }>(
  cues: readonly C[],
  pathOf: (cue: C) => string,
) => cues.map((cue) => ({ ...cue, src: sfxSource(pathOf(cue)) }));

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

export const playable = (
  cue: { readonly skip?: number; readonly length?: number },
  fps: number,
) => {
  const { trimBefore, trimAfter } = trimsOf(cue, fps);
  return trimAfter === undefined || trimAfter > (trimBefore ?? 0);
};

export const SoundCues: React.FC<{
  readonly cues: readonly SoundCue[];
  readonly timeOf?: (at: number) => number | null;
}> = ({ cues, timeOf = asIs }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {cues.filter((cue) => playable(cue, fps)).map((cue) => {
        const t = timeOf(cue.at);
        return t === null ? null : (
          <MixAudio
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
