import { Audio } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";
import { musicPlacement, musicVolume, type Music } from "./music";

export const Score: React.FC<{ readonly music: Music; readonly offset: number }> = ({ music, offset }) => {
  const { fps } = useVideoConfig();
  const placed = musicPlacement(music, offset, fps);
  return placed ? (
    <Audio
      name={music.name}
      src={staticFile(music.file)}
      from={placed.from}
      trimBefore={placed.trimBefore}
      trimAfter={placed.trimAfter}
      volume={(f) => musicVolume(music, placed.start + f / fps)}
    />
  ) : null;
};
