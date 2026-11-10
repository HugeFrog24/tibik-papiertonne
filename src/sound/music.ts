import { TIMELINE_FPS, renderFrame } from "../frameRate";
import { RECORD_SCRATCH } from "../scenes/hausmuell/soundCues";
import { filmTimeOf } from "../scenes/treppenhaus/cameras";
import { SOUND_CUES } from "../scenes/treppenhaus/choreography";
import { HAUSMUELL_FROM } from "../timeline";

export type Music = {
  readonly name: string;
  readonly file: string;
  readonly volume: number;
  readonly fadeIn: number;
  readonly fadeOut: number;
  readonly from: number;
  readonly to: number;
};

export const MAIN_STREET: Music = {
  name: "Main street (music)",
  file: "music/mainstreet.flac",
  volume: 1,
  fadeIn: 0.5,
  fadeOut: 1 / TIMELINE_FPS,
  from: filmTimeOf(SOUND_CUES.haustuerOpens)!,
  to: HAUSMUELL_FROM + RECORD_SCRATCH,
};

export const musicVolume = (music: Music, t: number) =>
  t < music.from || t >= music.to
    ? 0
    : music.volume * Math.min(1, (t - music.from) / music.fadeIn, (music.to - t) / music.fadeOut);

export const musicPlacement = (music: Music, offset: number, fps: number) => {
  if (music.to <= offset) return null;
  const start = Math.max(music.from, offset);
  return {
    start,
    from: renderFrame(start - offset, fps),
    trimBefore: renderFrame(start - music.from, fps),
    trimAfter: renderFrame(music.to - music.from, fps) + renderFrame(1 / TIMELINE_FPS, fps),
  };
};
