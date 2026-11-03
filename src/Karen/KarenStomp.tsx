import { Audio } from "@remotion/media";
import { staticFile } from "remotion";

export const KarenStomp: React.FC<{ readonly frame: number; readonly index: number }> = ({ frame, index }) => (
  <>
    <Audio
      name={`Karen stomp ${index + 1}`}
      src={staticFile(`sfx/footstep_concrete_00${index % 4}.ogg`)}
      from={frame}
      volume={1}
      playbackRate={0.7}
    />
    <Audio
      name={`Karen stomp ${index + 1}: thud`}
      src={staticFile("sfx/impactSoft_heavy_000.ogg")}
      from={frame}
      volume={0.6}
      playbackRate={0.7}
    />
  </>
);
