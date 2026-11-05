import { Sequence, useVideoConfig } from "remotion";
import { FootstepSounds } from "../../sound/FootstepSounds";
import { IndoorLoop } from "../../sound/IndoorLoop";
import { RAIN } from "../../sound/rain";
import { SoundCues, withSources } from "../../sound/SoundCues";
import { StreetAmbience } from "../../street/StreetAmbience";
import { NACHTRUHE_FROM } from "../../timeline";
import { inTheBedroom } from "./cameras";
import { BLACKBIRD, NACHTRUHE_CUES, RAIN_FROM, STEP_VOLUME, footstepsByPlace, hushAt, rainLevelAt } from "./soundCues";

export const NachtruheSound: React.FC<{ readonly ambience: boolean }> = ({ ambience }) => {
  const { fps } = useVideoConfig();
  const indoors = (f: number) => (inTheBedroom(f / fps) ? 1 : 0);
  const rainFrom = Math.round(RAIN_FROM * fps);
  const steps = footstepsByPlace(fps);
  return (
    <>
      {ambience ? <StreetAmbience indoors={indoors} windFrom={NACHTRUHE_FROM} hush={(f) => hushAt(f / fps)} /> : null}
      <IndoorLoop name={BLACKBIRD.name} file={BLACKBIRD.file} once level={() => BLACKBIRD.volume} indoors={indoors} />
      <Sequence from={rainFrom} layout="none" name="Rain from the dawn">
        <IndoorLoop name={RAIN.name} file={RAIN.file} level={(f) => rainLevelAt((rainFrom + f) / fps)} indoors={(f) => indoors(rainFrom + f)} />
      </Sequence>
      <FootstepSounds times={steps.street.times} who="Tibik" volume={STEP_VOLUME.street} surface={steps.street.surface} />
      <FootstepSounds times={steps.bedroom.times} who="Tibik in his bedroom" volume={STEP_VOLUME.bedroom} surface={steps.bedroom.surface} />
      <SoundCues cues={withSources(NACHTRUHE_CUES, (cue) => cue.file)} />
    </>
  );
};
