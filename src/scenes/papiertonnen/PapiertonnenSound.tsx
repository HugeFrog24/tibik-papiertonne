import { Score } from "../../sound/Score";
import { MAIN_STREET } from "../../sound/music";
import { MixAudio } from "../../sound/MixAudio";
import { PAPIERTONNEN_FROM } from "../../timeline";
import { TIMELINE_FPS, renderFrame } from "../../frameRate";
import { FootstepSounds } from "../../sound/FootstepSounds";
import { SoundCues, withSources } from "../../sound/SoundCues";
import { staticFile, useVideoConfig } from "remotion";
import { StreetAmbience } from "../../street/StreetAmbience";
import { footstepTimes } from "./choreography";
import { LID_SLAP, PAPIERTONNEN_AMBIENCES, PAPIERTONNEN_CUES } from "./soundCues";
import { useLanguage } from "../../language";
import { buzzVolume, flyBuzzSound } from "./flyBuzz";
import { FLY_COUNT } from "./flyPaths";

export const PapiertonnenSound: React.FC<{ readonly ambience: boolean }> = ({
  ambience,
}) => {
  const { fps } = useVideoConfig();
  const language = useLanguage();

  return (
    <>
      {ambience ? <StreetAmbience ambience={PAPIERTONNEN_AMBIENCES[language]} windFrom={PAPIERTONNEN_FROM} /> : null}
      {ambience ? <Score music={MAIN_STREET} offset={PAPIERTONNEN_FROM} ambience={PAPIERTONNEN_AMBIENCES[language]} /> : null}

      {Array.from({ length: FLY_COUNT }, (_, i) => (
        <MixAudio
          key={i}
          name={`Fly ${i + 1} buzzing`}
          src={staticFile(`sfx/${flyBuzzSound(i)}.wav`)}
          loop
          loopVolumeCurveBehavior="extend"
          volume={(f) => buzzVolume(i, f / fps)}
        />
      ))}

      <FootstepSounds times={footstepTimes()} who="Tibik" volume={0.35} />

      <SoundCues
        cues={withSources(PAPIERTONNEN_CUES, (cue) => cue.file)}
      />
      <MixAudio
        name="Lid knocks the wall"
        src={staticFile("sfx/impactGeneric_light_002.ogg")}
        from={renderFrame(LID_SLAP, fps) + renderFrame(1 / TIMELINE_FPS, fps)}
        volume={0.5}
      />
    </>
  );
};
