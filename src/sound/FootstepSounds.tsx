import { Audio } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";
import { footstepPlan, type Surface } from "./footsteps";

export const FootstepSounds: React.FC<{
  readonly times: readonly number[];
  readonly who: string;
  readonly volume: number;
  readonly variant?: number;
  readonly room?: "stairwell";
  readonly surface?: Surface;
}> = ({ times, who, volume, variant = 0, room, surface }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {footstepPlan(times, fps, { surface, room, variant }).map(({ frame, file }, i) => (
        <Audio key={frame} name={`${who} footstep ${i + 1}`} src={staticFile(`sfx/${file}`)} from={frame} volume={volume} />
      ))}
    </>
  );
};
