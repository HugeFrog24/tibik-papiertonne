import { Audio } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";
import { FootstepSounds } from "../../sound/FootstepSounds";
import { SoundCues, withSources } from "../../sound/SoundCues";
import { StreetAmbience } from "../../street/StreetAmbience";
import { RAIN, RUNDSCHREIBEN_CUES, footstepsByRoom, heardIndoorsAt, rainLevel } from "./soundCues";

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
      <FootstepSounds times={footstepsByRoom(fps).outside} who="Tibik" volume={0.35} />
      <FootstepSounds times={footstepsByRoom(fps).inside} who="Tibik in the hall" volume={0.3} room="stairwell" />
      <SoundCues
        cues={withSources(RUNDSCHREIBEN_CUES, (cue) => cue.file)}
      />
    </>
  );
};
