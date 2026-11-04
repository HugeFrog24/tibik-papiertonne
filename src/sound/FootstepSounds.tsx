import { Audio } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";

export const FootstepSounds: React.FC<{
  readonly times: readonly number[];
  readonly who: string;
  readonly volume: number;
  readonly variant?: number;
  readonly room?: "stairwell";
}> = ({ times, who, volume, variant = 0, room }) => {
  const { fps } = useVideoConfig();
  const frames = [...new Set(times.map((t) => Math.round(t * fps)))];
  return (
    <>
      {frames.map((frame, i) => {
        const take = `footstep_concrete_00${(i + variant) % 4}`;
        return (
          <Audio
            key={frame}
            name={`${who} footstep ${i + 1}`}
            src={staticFile(
              room ? `sfx/${room}/${take}.wav` : `sfx/${take}.ogg`,
            )}
            from={frame}
            volume={volume}
          />
        );
      })}
    </>
  );
};
