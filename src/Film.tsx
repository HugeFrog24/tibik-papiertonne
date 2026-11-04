import { AbsoluteFill, Series } from "remotion";
import { Papiertonnen } from "./scenes/papiertonnen/Papiertonnen";
import { Hausmuell } from "./scenes/hausmuell/Hausmuell";
import { StreetAmbience } from "./street/StreetAmbience";
import { Treppenhaus } from "./scenes/treppenhaus/Treppenhaus";
import { Klingelsturm } from "./scenes/klingelsturm/Klingelsturm";
import { HAUSMUELL_FRAMES, KLINGELSTURM_FRAMES, PAPIERTONNEN_FRAMES, TREPPENHAUS_FRAMES, filmIndoors } from "./timeline";

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
    </Series>
    <StreetAmbience indoors={filmIndoors} />
  </AbsoluteFill>
);
