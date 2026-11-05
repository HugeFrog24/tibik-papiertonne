import { useVideoConfig } from "remotion";
import { IndoorLoop } from "../../sound/IndoorLoop";
import { FootstepSounds } from "../../sound/FootstepSounds";
import { SoundCues, withSources } from "../../sound/SoundCues";
import { StreetAmbience } from "../../street/StreetAmbience";
import { RAIN, RUNDSCHREIBEN_CUES, footstepsByRoom, heardIndoorsAt } from "./soundCues";

export const RundschreibenSound: React.FC<{ readonly ambience: boolean }> = ({
  ambience,
}) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {ambience ? (
        <StreetAmbience indoors={(f) => heardIndoorsAt(f / fps)} />
      ) : null}
      <IndoorLoop
        name={RAIN.name}
        file={RAIN.file}
        level={() => RAIN.volume}
        indoors={(f) => heardIndoorsAt(f / fps)}
      />
      <FootstepSounds times={footstepsByRoom(fps).outside} who="Tibik" volume={0.35} />
      <FootstepSounds times={footstepsByRoom(fps).inside} who="Tibik in the hall" volume={0.3} room="stairwell" />
      <SoundCues
        cues={withSources(RUNDSCHREIBEN_CUES, (cue) => cue.file)}
      />
    </>
  );
};
