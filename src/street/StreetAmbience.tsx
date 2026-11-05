import { useVideoConfig } from "remotion";
import { IndoorLoop } from "../sound/IndoorLoop";
import { STREET_LOOPS, loopVolume } from "./ambienceLoops";

const OUTSIDE = () => 0;

export const StreetAmbience: React.FC<{
  readonly indoors?: (frame: number) => number;
  readonly windFrom?: number;
}> = ({ indoors = OUTSIDE, windFrom = 0 }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {STREET_LOOPS.map((loop) => (
        <IndoorLoop
          key={loop.file}
          name={loop.name}
          file={loop.file}
          level={(f) => loopVolume(loop, windFrom + f / fps)}
          indoors={indoors}
        />
      ))}
    </>
  );
};
