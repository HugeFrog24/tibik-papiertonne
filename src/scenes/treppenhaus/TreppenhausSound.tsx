import { FootstepSounds } from "../../sound/FootstepSounds";
import { SoundCues, withSources } from "../../sound/SoundCues";
import { StreetAmbience } from "../../street/StreetAmbience";
import { treppenhausIndoorsAt } from "../../timeline";
import { filmTimeOf } from "./cameras";
import { SOUND_CUES, footstepStoryTimes } from "./choreography";

const CUES = [
  {
    name: "His door unlatches and swings open",
    at: SOUND_CUES.hisDoorOpens,
    file: "doorOpen_1",
    volume: 0.55,
  },
  {
    name: "His door shuts",
    at: SOUND_CUES.hisDoorShuts,
    file: "doorClose_1",
    volume: 0.7,
  },
  {
    name: "His door latches",
    at: SOUND_CUES.hisDoorShuts + 0.03,
    file: "metalLatch",
    volume: 0.5,
  },
  {
    name: "Light switch",
    at: SOUND_CUES.lightSwitch,
    file: "switch_002",
    volume: 0.6,
  },
  {
    name: "Haustür unlatches and opens",
    at: SOUND_CUES.haustuerOpens,
    file: "doorOpen_1",
    volume: 0.6,
  },
] as const;

export const TreppenhausSound: React.FC<{ readonly ambience: boolean }> = ({
  ambience,
}) => {
  const times = footstepStoryTimes()
    .map(filmTimeOf)
    .filter((t): t is number => t !== null);
  return (
    <>
      {ambience ? <StreetAmbience indoors={treppenhausIndoorsAt} /> : null}
      <FootstepSounds times={times} who="Tibik" volume={0.3} room="stairwell" />
      <SoundCues
        cues={withSources(CUES, (cue) => `stairwell/${cue.file}.wav`)}
        timeOf={filmTimeOf}
      />
    </>
  );
};
