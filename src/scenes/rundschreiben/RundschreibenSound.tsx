import { Audio } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";
import { FootstepSounds } from "../../sound/FootstepSounds";
import { SoundCues } from "../../sound/SoundCues";
import { StreetAmbience } from "../../street/StreetAmbience";
import { footstepTimes } from "./choreography";
import { RAIN, RUNDSCHREIBEN_CUES, heardIndoorsAt, rainLevel } from "./soundCues";

export const RundschreibenSound: React.FC<{ readonly ambience: boolean }> = ({
  ambience,
}) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {ambience ? (
        <StreetAmbience indoors={(f) => heardIndoorsAt(f / fps)} />
      ) : null}
      <Audio
        name={RAIN.name}
        src={staticFile(`sfx/${RAIN.file}.wav`)}
        loop
        loopVolumeCurveBehavior="extend"
        volume={(f) => rainLevel(f / fps).outside}
      />
      <Audio
        name={`${RAIN.name} (through the walls)`}
        src={staticFile(`sfx/${RAIN.file}-muffled.wav`)}
        loop
        loopVolumeCurveBehavior="extend"
        volume={(f) => rainLevel(f / fps).inside}
      />
      <FootstepSounds times={footstepTimes(fps)} who="Tibik" volume={0.35} />
      <SoundCues
        cues={RUNDSCHREIBEN_CUES.map((cue) => ({
          ...cue,
          src: staticFile(`sfx/${cue.file}`),
        }))}
      />
    </>
  );
};
