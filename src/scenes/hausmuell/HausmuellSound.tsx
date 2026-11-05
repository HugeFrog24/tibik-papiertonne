import { useVideoConfig } from "remotion";
import { HAUSMUELL_FROM } from "../../timeline";
import { KarenStomps } from "../../Karen/KarenStomp";
import { bubbleCues } from "../../sound/bubbleCues";
import { FootstepSounds } from "../../sound/FootstepSounds";
import { SoundCues } from "../../sound/SoundCues";
import { StreetAmbience } from "../../street/StreetAmbience";
import { LINES, karenFootsteps, tibikFootsteps } from "./choreography";
import { HAUSMUELL_CUES } from "./soundCues";

export const HausmuellSound: React.FC<{ readonly ambience: boolean }> = ({
  ambience,
}) => {
  const { fps } = useVideoConfig();

  return (
    <>
      {ambience ? <StreetAmbience windFrom={HAUSMUELL_FROM} /> : null}

      <KarenStomps times={karenFootsteps(fps)} />

      <FootstepSounds
        times={tibikFootsteps(fps)}
        who="Tibik"
        volume={0.25}
        variant={2}
      />

      <SoundCues
        cues={[
          ...HAUSMUELL_CUES,
          ...bubbleCues(LINES),
        ]}
      />
    </>
  );
};
