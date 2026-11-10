import { Score } from "../../sound/Score";
import { MAIN_STREET } from "../../sound/music";
import { FootstepSounds } from "../../sound/FootstepSounds";
import { SoundCues, withSources } from "../../sound/SoundCues";
import { StreetAmbience } from "../../street/StreetAmbience";
import { TREPPENHAUS_AMBIENCE, filmTimeOf } from "./cameras";
import { footstepStoryTimes } from "./choreography";
import { TREPPENHAUS_CUES } from "./soundCues";

export const TreppenhausSound: React.FC<{ readonly ambience: boolean }> = ({
  ambience,
}) => {
  const times = footstepStoryTimes()
    .map(filmTimeOf)
    .filter((t): t is number => t !== null);
  return (
    <>
      {ambience ? <StreetAmbience ambience={TREPPENHAUS_AMBIENCE} /> : null}
      {ambience ? <Score music={MAIN_STREET} offset={0} /> : null}
      <FootstepSounds times={times} who="Tibik" volume={0.3} room="stairwell" />
      <SoundCues
        cues={withSources(TREPPENHAUS_CUES, (cue) => `stairwell/${cue.file}.wav`)}
        timeOf={filmTimeOf}
      />
    </>
  );
};
