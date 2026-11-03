import { Audio } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";
import { KarenStomp } from "../../Karen/KarenStomp";
import { StreetAmbience } from "../../street/StreetAmbience";
import { LINES, karenFootsteps, tibikFootsteps } from "./choreography";

export const HausmuellSound: React.FC<{ readonly ambience: boolean }> = ({ ambience }) => {
  const { fps } = useVideoConfig();

  return (
    <>
      {ambience ? <StreetAmbience /> : null}

      {karenFootsteps(fps).map((t, i) => (
        <KarenStomp key={t} frame={Math.round(t * fps)} index={i} />
      ))}

      {tibikFootsteps(fps).map((t, i) => (
        <Audio
          key={t}
          name={`Tibik footstep ${i + 1}`}
          src={staticFile(`sfx/footstep_concrete_00${(i + 2) % 4}.ogg`)}
          from={Math.round(t * fps)}
          volume={0.25}
        />
      ))}

      <Audio name="Record scratch" src="https://remotion.media/record-scratch.wav" from={Math.round(2.0 * fps)} volume={0.45} />

      {LINES.map((line) => (
        <Audio
          key={line.from}
          name={`Bubble: ${line.text.slice(0, 24)}`}
          src={staticFile("sfx/pluck_001.ogg")}
          from={Math.round(line.from * fps)}
          volume={0.35}
        />
      ))}
    </>
  );
};
