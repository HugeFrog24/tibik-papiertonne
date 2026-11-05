import { Audio } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";
import { footstepTake, type Surface } from "./footsteps";

export const FootstepSounds: React.FC<{
  readonly times: readonly number[];
  readonly who: string;
  readonly volume: number;
  readonly variant?: number;
  readonly room?: "stairwell";
  readonly surface?: Surface;
}> = ({ times, who, volume, variant = 0, room, surface }) => {
  const { fps } = useVideoConfig();
  const frames = [...new Set(times.map((t) => Math.round(t * fps)))];
  return (
    <>
      {frames.map((frame, i) => (
        <Audio
          key={frame}
          name={`${who} footstep ${i + 1}`}
          src={staticFile(`sfx/${footstepTake(i, { surface, room, variant })}`)}
          from={frame}
          volume={volume}
        />
      ))}
    </>
  );
};
