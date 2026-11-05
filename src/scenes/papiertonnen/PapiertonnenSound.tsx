import { Audio } from "@remotion/media";
import { PAPIERTONNEN_FROM } from "../../timeline";
import { FootstepSounds } from "../../sound/FootstepSounds";
import { SoundCues, withSources } from "../../sound/SoundCues";
import { staticFile, useVideoConfig } from "remotion";
import { StreetAmbience } from "../../street/StreetAmbience";
import { footstepTimes } from "./choreography";
import { LID_SLAP, PAPIERTONNEN_CUES } from "./soundCues";
import { buzzVolume, flyBuzzSound } from "./flyBuzz";
import { FLY_COUNT } from "./flyPaths";

export const PapiertonnenSound: React.FC<{ readonly ambience: boolean }> = ({
  ambience,
}) => {
  const { fps } = useVideoConfig();

  return (
    <>
      {ambience ? <StreetAmbience windFrom={PAPIERTONNEN_FROM} /> : null}

      {Array.from({ length: FLY_COUNT }, (_, i) => (
        <Audio
          key={i}
          name={`Fly ${i + 1} buzzing`}
          src={staticFile(`sfx/${flyBuzzSound(i)}.wav`)}
          loop
          loopVolumeCurveBehavior="extend"
          volume={(f) => buzzVolume(i, f / fps)}
        />
      ))}

      <FootstepSounds times={footstepTimes(fps)} who="Tibik" volume={0.35} />

      <SoundCues
        cues={withSources(PAPIERTONNEN_CUES, (cue) => cue.file)}
      />
      <Audio
        name="Lid knocks the wall"
        src={staticFile("sfx/impactGeneric_light_002.ogg")}
        from={Math.round(LID_SLAP * fps) + 1}
        volume={0.5}
      />
    </>
  );
};
