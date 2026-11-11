import { RUNDSCHREIBEN_FROM } from "../../timeline";
import { IndoorLoop } from "../../sound/IndoorLoop";
import { FootstepSounds } from "../../sound/FootstepSounds";
import { SoundCues, withSources } from "../../sound/SoundCues";
import { StreetAmbience } from "../../street/StreetAmbience";
import { RAIN } from "../../sound/rain";
import { EPILOGUE_RAIN_START } from "../nachtruhe/soundCues";
import { RUNDSCHREIBEN_AMBIENCES, RUNDSCHREIBEN_CUES, footstepsByRoom, heardIndoorsAt } from "./soundCues";
import { useLanguage } from "../../language";

export const RundschreibenSound: React.FC<{ readonly ambience: boolean }> = ({
  ambience,
}) => {
  const heard = RUNDSCHREIBEN_AMBIENCES[useLanguage()];
  return (
    <>
      {ambience ? (
        <StreetAmbience ambience={heard} windFrom={RUNDSCHREIBEN_FROM} />
      ) : null}
      <IndoorLoop
        name={RAIN.name}
        file={RAIN.file}
        level={(t) => RAIN.volume * heard.duck(t)}
        indoors={heardIndoorsAt}
        startAt={EPILOGUE_RAIN_START}
      />
      <FootstepSounds times={footstepsByRoom().outside.times} who="Tibik" volume={0.35} surface={footstepsByRoom().outside.surface} />
      <FootstepSounds times={footstepsByRoom().inside.times} who="Tibik in the hall" volume={0.3} room="stairwell" />
      <SoundCues
        cues={withSources(RUNDSCHREIBEN_CUES, (cue) => cue.file)}
      />
    </>
  );
};
