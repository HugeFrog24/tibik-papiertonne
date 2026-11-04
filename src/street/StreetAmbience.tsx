import { Audio } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";
import { STREET_LOOPS, loopVolume } from "./ambienceLoops";

const OUTSIDE = () => 0;

const LOOPS = STREET_LOOPS;

export const StreetAmbience: React.FC<{
  readonly indoors?: (frame: number) => number;
  readonly windFrom?: number;
}> = ({ indoors = OUTSIDE, windFrom = 0 }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {LOOPS.map((loop) => (
        <Audio
          key={loop.file}
          name={loop.name}
          src={staticFile(`sfx/${loop.file}.wav`)}
          loop
          loopVolumeCurveBehavior="extend"
          volume={(f) =>
            loopVolume(loop, windFrom + f / fps) * (1 - indoors(f))
          }
        />
      ))}
      {LOOPS.map((loop) => (
        <Audio
          key={`${loop.file}-muffled`}
          name={`${loop.name} (through the walls)`}
          src={staticFile(`sfx/${loop.file}-muffled.wav`)}
          loop
          loopVolumeCurveBehavior="extend"
          volume={(f) => loopVolume(loop, windFrom + f / fps) * indoors(f)}
        />
      ))}
    </>
  );
};
