import { Score } from "../../sound/Score";
import { MAIN_STREET } from "../../sound/music";
import { HAUSMUELL_FROM } from "../../timeline";
import { KarenStomps } from "../../Karen/KarenStomp";
import { FootstepSounds } from "../../sound/FootstepSounds";
import { SoundCues } from "../../sound/SoundCues";
import { StreetAmbience } from "../../street/StreetAmbience";
import { karenFootsteps, tibikFootsteps } from "./choreography";
import { HAUSMUELL_AMBIENCES, HAUSMUELL_CUES } from "./soundCues";
import { useLanguage } from "../../language";

export const HausmuellSound: React.FC<{ readonly ambience: boolean }> = ({
  ambience,
}) => {
  const language = useLanguage();
  return (
    <>
      {ambience ? <StreetAmbience ambience={HAUSMUELL_AMBIENCES[language]} windFrom={HAUSMUELL_FROM} /> : null}
      {ambience ? <Score music={MAIN_STREET} offset={HAUSMUELL_FROM} ambience={HAUSMUELL_AMBIENCES[language]} /> : null}

      <KarenStomps times={karenFootsteps()} />

      <FootstepSounds
        times={tibikFootsteps()}
        who="Tibik"
        volume={0.25}
        variant={2}
      />

      <SoundCues cues={HAUSMUELL_CUES} />
    </>
  );
};
