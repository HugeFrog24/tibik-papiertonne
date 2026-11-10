import { KLINGELSTURM_FROM } from "../../timeline";
import { useVideoConfig } from "remotion";
import { touchdownTimes } from "../../characters/gait";
import { KarenStomps } from "../../Karen/KarenStomp";
import { SoundCues, withSources } from "../../sound/SoundCues";
import { KLINGELSTURM_AMBIENCE, doorCues, stompRoomAt } from "./doorCues";
import { StreetAmbience } from "../../street/StreetAmbience";
import { KLINGELSTURM_DURATION, karenStandGait } from "./choreography";


export const KlingelsturmSound: React.FC<{ readonly ambience: boolean }> = ({
  ambience,
}) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {ambience ? <StreetAmbience ambience={KLINGELSTURM_AMBIENCE} windFrom={KLINGELSTURM_FROM} /> : null}
      <KarenStomps
        times={touchdownTimes(karenStandGait(), KLINGELSTURM_DURATION, fps)}
        roomAt={stompRoomAt}
      />
      <SoundCues cues={withSources(doorCues(), (cue) => `${cue.sound}.wav`)} />
    </>
  );
};
