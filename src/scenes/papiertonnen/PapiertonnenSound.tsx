import { Audio } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";
import { StreetAmbience } from "../../street/StreetAmbience";
import { footstepTimes } from "./choreography";

export const PapiertonnenSound: React.FC<{ readonly ambience: boolean }> = ({ ambience }) => {
  const { fps } = useVideoConfig();

  return (
    <>
      {ambience ? <StreetAmbience /> : null}

      {footstepTimes(fps).map((t, i) => (
        <Audio
          key={t}
          name={`Footstep ${i + 1}`}
          src={staticFile(`sfx/footstep_concrete_00${i % 4}.ogg`)}
          from={Math.round(t * fps)}
          volume={0.35}
        />
      ))}

      <Audio name="Lid creaks up" src={staticFile("sfx/creak1.ogg")} from={Math.round(3.6 * fps)} volume={0.25} />
      <Audio name="Lid slaps open" src={staticFile("sfx/impactSoft_heavy_000.ogg")} from={Math.round(4.2 * fps)} volume={0.9} />
      <Audio name="Lid knocks the wall" src={staticFile("sfx/impactGeneric_light_002.ogg")} from={Math.round(4.2 * fps) + 1} volume={0.5} />

      <Audio name="Rummaging 1" src={staticFile("sfx/bookFlip1.ogg")} from={Math.round(6.5 * fps)} volume={0.7} />
      <Audio name="Rummaging 2" src={staticFile("sfx/bookFlip2.ogg")} from={Math.round(6.7 * fps)} volume={0.7} />
      <Audio name="Rummaging 3" src={staticFile("sfx/bookFlip3.ogg")} from={Math.round(6.9 * fps)} volume={0.7} />
      <Audio name="Box pulled out" src={staticFile("sfx/cloth2.ogg")} from={Math.round(7.35 * fps)} volume={0.6} />

      <Audio name="Karton pops open" src={staticFile("sfx/bookOpen.ogg")} from={Math.round(9.1 * fps)} volume={0.8} />
      <Audio name="Found it!" src="https://remotion.media/ding.wav" from={Math.round(9.6 * fps)} volume={0.45} />
    </>
  );
};
