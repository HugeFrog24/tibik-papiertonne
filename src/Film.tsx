import { AbsoluteFill, Series } from "remotion";
import { Papiertonnen } from "./scenes/papiertonnen/Papiertonnen";
import { Hausmuell } from "./scenes/hausmuell/Hausmuell";
import { StreetAmbience } from "./street/StreetAmbience";
import { Score } from "./sound/Score";
import { MAIN_STREET } from "./sound/music";
import { Treppenhaus } from "./scenes/treppenhaus/Treppenhaus";
import { Klingelsturm } from "./scenes/klingelsturm/Klingelsturm";
import { Nachtruhe } from "./scenes/nachtruhe/Nachtruhe";
import { Rundschreiben } from "./scenes/rundschreiben/Rundschreiben";
import { HAUSMUELL_FRAMES, KLINGELSTURM_FRAMES, NACHTRUHE_FRAMES, PAPIERTONNEN_FRAMES, RUNDSCHREIBEN_FRAMES, TREPPENHAUS_FRAMES, filmHush, filmIndoors } from "./timeline";

export const Film: React.FC = () => (
  <AbsoluteFill>
    <Series>
      <Series.Sequence name="Treppenhaus" durationInFrames={TREPPENHAUS_FRAMES}>
        <Treppenhaus ambience={false} />
      </Series.Sequence>
      <Series.Sequence name="Papiertonnen" durationInFrames={PAPIERTONNEN_FRAMES}>
        <Papiertonnen ambience={false} />
      </Series.Sequence>
      <Series.Sequence name="Hausmuell" durationInFrames={HAUSMUELL_FRAMES}>
        <Hausmuell ambience={false} />
      </Series.Sequence>
      <Series.Sequence name="Klingelsturm" durationInFrames={KLINGELSTURM_FRAMES}>
        <Klingelsturm ambience={false} />
      </Series.Sequence>
      <Series.Sequence name="Nachtruhe" durationInFrames={NACHTRUHE_FRAMES}>
        <Nachtruhe ambience={false} />
      </Series.Sequence>
      <Series.Sequence name="Rundschreiben" durationInFrames={RUNDSCHREIBEN_FRAMES}>
        <Rundschreiben ambience={false} />
      </Series.Sequence>
    </Series>
    <StreetAmbience indoors={filmIndoors} hush={filmHush} />
    <Score music={MAIN_STREET} offset={0} />
  </AbsoluteFill>
);
