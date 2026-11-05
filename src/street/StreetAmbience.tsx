import { useVideoConfig } from "remotion";
import { IndoorLoop } from "../sound/IndoorLoop";
import { STREET_LOOPS, hushedVolume } from "./ambienceLoops";

const OUTSIDE = () => 0;
const AWAKE = () => 1;

export const StreetAmbience: React.FC<{
  readonly indoors?: (frame: number) => number;
  readonly windFrom?: number;
  readonly hush?: (frame: number) => number;
}> = ({ indoors = OUTSIDE, windFrom = 0, hush = AWAKE }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {STREET_LOOPS.map((loop) => (
        <IndoorLoop
          key={loop.file}
          name={loop.name}
          file={loop.file}
          level={(f) => hushedVolume(loop, windFrom + f / fps, hush(f))}
          indoors={indoors}
        />
      ))}
    </>
  );
};
