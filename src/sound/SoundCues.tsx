import { MixAudio } from "./MixAudio";
import { staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { present } from "../toon/present";

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
  readonly length?: number | undefined;
  readonly skip?: number | undefined;
  readonly fadeOut?: number | undefined;
  readonly restAfter?: number | undefined;
  readonly rate?: number | undefined;
};

export const cueVolume = (
  cue: { readonly volume: number; readonly length?: number | undefined; readonly fadeOut?: number | undefined; readonly restAfter?: number | undefined },
  fps: number,
): number | ((frame: number) => number) => {
  const { volume, length, fadeOut, restAfter = 0 } = cue;
  if (fadeOut === undefined || length === undefined) return volume;
  return (frame: number) => volume * Math.min(1, Math.max(0, (length + restAfter - frame / fps) / fadeOut));
};

const asIs = (at: number): number | null => at;

export const trimsOf = (
  cue: { readonly skip?: number | undefined; readonly length?: number | undefined; readonly rate?: number | undefined },
  fps: number,
) => ({
  trimBefore: cue.skip === undefined ? undefined : Math.round(cue.skip * fps),
  trimAfter:
    cue.length === undefined
      ? undefined
      : Math.round(((cue.skip ?? 0) + cue.length * (cue.rate ?? 1)) * fps),
});

export const cueFrames = (
  cue: { readonly at: number; readonly skip?: number | undefined; readonly length?: number | undefined; readonly rate?: number | undefined },
  fps: number,
) => {
  const from = Math.round(cue.at * fps);
  const { trimBefore = 0, trimAfter } = trimsOf(cue, fps);
  return { from, end: trimAfter === undefined ? Infinity : from + (trimAfter - trimBefore) / (cue.rate ?? 1) };
};

export const cueLanes = <C extends SoundCue>(cues: readonly C[], fps: number): C[][] => {
  const lanes: { readonly cues: C[]; end: number }[] = [];
  for (const cue of [...cues].sort((a, b) => cueFrames(a, fps).from - cueFrames(b, fps).from)) {
    const { from, end } = cueFrames(cue, fps);
    const lane = lanes.find((l) => l.end <= from);
    if (lane) {
      lane.cues.push(cue);
      lane.end = end;
    } else lanes.push({ cues: [cue], end });
  }
  return lanes.map((lane) => lane.cues);
};

export const playable = (
  cue: { readonly skip?: number | undefined; readonly length?: number | undefined; readonly rate?: number | undefined },
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
  const frame = useCurrentFrame();
  return (
    <>
      {cues.filter((cue) => playable(cue, fps)).map((cue) => {
        const t = timeOf(cue.at);
        if (t === null) return null;
        const from = Math.round(t * fps);
        const volume = cueVolume(cue, fps);
        return (
          <MixAudio
            key={`${cue.name}@${cue.at}`}
            name={cue.name}
            src={cue.src}
            from={from}
            volume={typeof volume === "number" ? volume : volume(frame - from)}
            {...present({ playbackRate: cue.rate, ...trimsOf(cue, fps) })}
          />
        );
      })}
    </>
  );
};
