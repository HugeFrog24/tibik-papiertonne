import { useVideoConfig } from "remotion";
import { touchdownTimes } from "../../characters/gait";
import { KarenStomps } from "../../Karen/KarenStomp";
import { bubbleCues } from "../../sound/bubbleCues";
import { SoundCues, withSources } from "../../sound/SoundCues";
import { doorCues, stompRoomAt } from "./doorCues";
import { StreetAmbience } from "../../street/StreetAmbience";
import { KLINGELSTURM_DURATION, LINES, karenStandGait } from "./choreography";

const indoors = () => 1;

export const KlingelsturmSound: React.FC<{ readonly ambience: boolean }> = ({
  ambience,
}) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {ambience ? <StreetAmbience indoors={indoors} /> : null}
      <KarenStomps
        times={touchdownTimes(karenStandGait(), KLINGELSTURM_DURATION, fps)}
        roomAt={stompRoomAt}
      />
      <SoundCues
        cues={[
          ...withSources(doorCues(), (cue) => `${cue.sound}.wav`),
          ...bubbleCues(LINES),
        ]}
      />
    </>
  );
};
