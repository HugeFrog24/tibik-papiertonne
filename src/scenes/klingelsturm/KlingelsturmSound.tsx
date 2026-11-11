import { KLINGELSTURM_FROM } from "../../timeline";
import { touchdownTimes } from "../../characters/gait";
import { KarenStomps } from "../../Karen/KarenStomp";
import { SoundCues, withSources } from "../../sound/SoundCues";
import { KLINGELSTURM_AMBIENCES, doorCues, stompRoomAt } from "./doorCues";
import { useLanguage } from "../../language";
import { KLINGELSTURM_CLOCKS } from "./hold";
import { StreetAmbience } from "../../street/StreetAmbience";
import { KLINGELSTURM_DURATION, karenStandGait } from "./choreography";


export const KlingelsturmSound: React.FC<{ readonly ambience: boolean }> = ({
  ambience,
}) => {
  const language = useLanguage();
  const clock = KLINGELSTURM_CLOCKS[language];
  return (
    <>
      {ambience ? <StreetAmbience ambience={KLINGELSTURM_AMBIENCES[language]} windFrom={KLINGELSTURM_FROM} /> : null}
      <KarenStomps
        times={touchdownTimes(karenStandGait(), KLINGELSTURM_DURATION).map(clock.editAt)}
        roomAt={(at) => stompRoomAt(clock.storyAt(at))}
      />
      <SoundCues cues={withSources(doorCues(), (cue) => `${cue.sound}.wav`)} timeOf={clock.editAt} />
    </>
  );
};
