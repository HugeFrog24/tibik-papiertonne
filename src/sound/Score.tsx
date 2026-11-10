import { MixAudio } from "./MixAudio";
import { staticFile, useVideoConfig } from "remotion";
import { musicPlacement, musicVolume, type Music } from "./music";
import { OUT_IN_THE_STREET, type SceneAmbience } from "../street/sceneAmbience";

export const Score: React.FC<{ readonly music: Music; readonly offset: number; readonly ambience?: SceneAmbience }> = ({ music, offset, ambience = OUT_IN_THE_STREET }) => {
  const { fps } = useVideoConfig();
  const placed = musicPlacement(music, offset, fps);
  return placed ? (
    <MixAudio
      name={music.name}
      src={staticFile(music.file)}
      from={placed.from}
      trimBefore={placed.trimBefore}
      trimAfter={placed.trimAfter}
      volume={(f) => musicVolume(music, placed.start + f / fps) * ambience.duck(placed.start + f / fps - offset)}
    />
  ) : null;
};
