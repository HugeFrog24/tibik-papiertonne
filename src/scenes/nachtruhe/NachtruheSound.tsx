import { useVideoConfig } from "remotion";
import { FootstepSounds } from "../../sound/FootstepSounds";
import { IndoorLoop } from "../../sound/IndoorLoop";
import { RAIN } from "../../sound/rain";
import { SoundCues, withSources } from "../../sound/SoundCues";
import { StreetAmbience } from "../../street/StreetAmbience";
import { NACHTRUHE_FROM } from "../../timeline";
import { BLACKBIRD, NACHTRUHE_AMBIENCE, NACHTRUHE_CUES, RAIN_FROM, STEP_VOLUME, footstepsByPlace, rainLevelAt } from "./soundCues";

export const NachtruheSound: React.FC<{ readonly ambience: boolean }> = ({ ambience }) => {
  const { fps } = useVideoConfig();
  const steps = footstepsByPlace(fps);
  return (
    <>
      {ambience ? <StreetAmbience ambience={NACHTRUHE_AMBIENCE} windFrom={NACHTRUHE_FROM} /> : null}
      <IndoorLoop name={BLACKBIRD.name} file={BLACKBIRD.file} once level={() => BLACKBIRD.volume} indoors={NACHTRUHE_AMBIENCE.indoors} />
      <IndoorLoop name={RAIN.name} file={RAIN.file} from={RAIN_FROM} level={rainLevelAt} indoors={NACHTRUHE_AMBIENCE.indoors} />
      <FootstepSounds times={steps.street.times} who="Tibik" volume={STEP_VOLUME.street} surface={steps.street.surface} />
      <FootstepSounds times={steps.bedroom.times} who="Tibik in his bedroom" volume={STEP_VOLUME.bedroom} surface={steps.bedroom.surface} />
      <SoundCues cues={withSources(NACHTRUHE_CUES, (cue) => cue.file)} />
    </>
  );
};
