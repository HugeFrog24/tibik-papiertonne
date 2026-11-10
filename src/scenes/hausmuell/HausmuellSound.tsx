import { Score } from "../../sound/Score";
import { MAIN_STREET } from "../../sound/music";
import { useVideoConfig } from "remotion";
import { HAUSMUELL_FROM } from "../../timeline";
import { KarenStomps } from "../../Karen/KarenStomp";
import { FootstepSounds } from "../../sound/FootstepSounds";
import { SoundCues } from "../../sound/SoundCues";
import { StreetAmbience } from "../../street/StreetAmbience";
import { karenFootsteps, tibikFootsteps } from "./choreography";
import { HAUSMUELL_AMBIENCE, HAUSMUELL_CUES } from "./soundCues";

export const HausmuellSound: React.FC<{ readonly ambience: boolean }> = ({
  ambience,
}) => {
  const { fps } = useVideoConfig();

  return (
    <>
      {ambience ? <StreetAmbience ambience={HAUSMUELL_AMBIENCE} windFrom={HAUSMUELL_FROM} /> : null}
      {ambience ? <Score music={MAIN_STREET} offset={HAUSMUELL_FROM} ambience={HAUSMUELL_AMBIENCE} /> : null}

      <KarenStomps times={karenFootsteps(fps)} />

      <FootstepSounds
        times={tibikFootsteps(fps)}
        who="Tibik"
        volume={0.25}
        variant={2}
      />

      <SoundCues cues={HAUSMUELL_CUES} />
    </>
  );
};
