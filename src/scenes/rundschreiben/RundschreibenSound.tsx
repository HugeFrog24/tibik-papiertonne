import { RUNDSCHREIBEN_FROM } from "../../timeline";
import { useVideoConfig } from "remotion";
import { IndoorLoop } from "../../sound/IndoorLoop";
import { FootstepSounds } from "../../sound/FootstepSounds";
import { SoundCues, withSources } from "../../sound/SoundCues";
import { StreetAmbience } from "../../street/StreetAmbience";
import { RAIN } from "../../sound/rain";
import { EPILOGUE_RAIN_START } from "../nachtruhe/soundCues";
import { RUNDSCHREIBEN_AMBIENCE, RUNDSCHREIBEN_CUES, footstepsByRoom, heardIndoorsAt } from "./soundCues";

export const RundschreibenSound: React.FC<{ readonly ambience: boolean }> = ({
  ambience,
}) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {ambience ? (
        <StreetAmbience ambience={RUNDSCHREIBEN_AMBIENCE} windFrom={RUNDSCHREIBEN_FROM} />
      ) : null}
      <IndoorLoop
        name={RAIN.name}
        file={RAIN.file}
        level={() => RAIN.volume}
        indoors={heardIndoorsAt}
        startAt={EPILOGUE_RAIN_START}
      />
      <FootstepSounds times={footstepsByRoom(fps).outside} who="Tibik" volume={0.35} />
      <FootstepSounds times={footstepsByRoom(fps).inside} who="Tibik in the hall" volume={0.3} room="stairwell" />
      <SoundCues
        cues={withSources(RUNDSCHREIBEN_CUES, (cue) => cue.file)}
      />
    </>
  );
};
